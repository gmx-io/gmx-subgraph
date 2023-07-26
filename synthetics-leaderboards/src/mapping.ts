import { BigInt, store } from "@graphprotocol/graph-ts";
import { EventLog1, EventLog1EventDataStruct } from "../generated/EventEmitter/EventEmitter";
import { AccountOpenPosition, AccountPerf } from "../generated/schema";
import { EventData } from "./utils/eventData";

const HOURLY = "hourly";
const DAILY = "daily";
const TOTAL = "total";

export function handleEventLog1(event: EventLog1): void {
  const eventName = event.params.eventName;
  const isFeeEvent = eventName == "PositionFeesCollected";
  const isIncEvent = eventName == "PositionIncrease";
  const isDecEvent = eventName == "PositionDecrease";

  if (!isFeeEvent && !isIncEvent && !isDecEvent) {
    return;
  }

  const data = new EventData(event.params.eventData as EventLog1EventDataStruct);
  const position = getOrCreatePosition(data);

  if (isFeeEvent) {
    return handlePositionFeesEvent(position, event);
  }

  const sizeInUsd = data.getUintItem("sizeInUsd")!;
  const basePnlUsd = data.getIntItem("basePnlUsd") || BigInt.fromI32(0);

  position.realizedPnl = position.realizedPnl.plus(basePnlUsd);
  position.collateralAmount = data.getUintItem("collateralAmount")!;
  position.sizeInTokens = data.getUintItem("sizeInTokens")!;
  position.sizeInUsd = sizeInUsd;
  position.maxSize = position.maxSize.lt(sizeInUsd) ? sizeInUsd : position.maxSize;

  if (position.account) {
    updateAccountPerformanceForPeriod(TOTAL, position, data, event);
    updateAccountPerformanceForPeriod(DAILY, position, data, event);
    updateAccountPerformanceForPeriod(HOURLY, position, data, event);
  }

  if (sizeInUsd.equals(BigInt.fromI32(0))) {
    store.remove("AccountOpenPosition", position.id);
  } else {
    position.save();
  }

  return;
}

const initPosition = (p: AccountOpenPosition, data: EventData) => {
  if (p.account !== null) {
    return p; // already initialized
  }

  const account = data.getAddressItem("account");
  if (account === null) {
    return p; // this is a fee event that doesn't have data required for initialization
  }

  p.account = account.toHexString();
  p.market = data.getAddressItem("market")!.toHexString();
  p.collateralToken = data.getAddressItem("collateralToken")!.toHexString();
  p.entryPrice = data.getUintItem("executionPrice")!;
  p.isLong = data.getBoolItem("isLong");
  p.realizedPnl = BigInt.fromI32(0);
  p.maxSize = BigInt.fromI32(0);

  return p;
};

const getOrCreatePosition = (data: EventData) => {
  // const key = `${account}:${market}:${collateralToken}:${isLong ? "long" : "short"}`;
  const key = data.getBytes32Item("positionKey")!.toHexString();

  return initPosition(AccountOpenPosition.load(key) || new AccountOpenPosition(key), data);
};

const handlePositionFeesEvent = (position: AccountOpenPosition, event: EventLog1): void => {
  const data = new EventData(event.params.eventData as EventLog1EventDataStruct);

  position.fundingFee = data.getUintItem("fundingFeeAmount")!;
  position.positionFee = data.getUintItem("positionFeeAmount")!;
  position.borrowingFee = data.getUintItem("borrowingFeeAmount")!;
};

const periodStart = (period: string, event: EventLog1): Date => {
  if (period == TOTAL) {
    return new Date(1685618741000); // contract deployment date
  }

  const today = new Date(event.block.timestamp.toI64() * 1000);

  if (period == DAILY) {
    today.setUTCHours(0);
  }

  today.setUTCMinutes(0);
  today.setUTCSeconds(0);
  today.setUTCMilliseconds(0);

  return today;
};

const updateAccountPerformanceForPeriod = (
  period: string,
  position: AccountOpenPosition,
  data: EventData,
  event: EventLog1,
): AccountPerf => {
  const eventName = event.params.eventName;
  const isIncrease = eventName != "PositionIncrease";

  const sizeInUsd = data.getUintItem("sizeInUsd")!;
  const timestamp = i32(periodStart(period, event).getTime() / 1000);
  const key = position.account + ":" + period + ":" + timestamp.toString();

  let perf = AccountPerf.load(key);

  if (perf === null) {
    perf = new AccountPerf(key);
    perf.account = position.account!;
    perf.period = period;
    perf.timestamp = timestamp;
    perf.wins = BigInt.fromI32(0);
    perf.losses = BigInt.fromI32(0);
    perf.totalPnl = BigInt.fromI32(0);
    perf.totalCollateral = BigInt.fromI32(0);
    perf.maxCollateral = BigInt.fromI32(0);
    perf.cumsumCollateral = BigInt.fromI32(0);
    perf.cumsumSize = BigInt.fromI32(0);
    perf.sumMaxSize = BigInt.fromI32(0);
    perf.closedCount = BigInt.fromI32(0);
  }

  let basePnlUsd = data.getIntItem("basePnlUsd");

  if (basePnlUsd === null) {
    basePnlUsd = BigInt.fromI32(0);
  }

  const collateralAmount = data.getUintItem("collateralAmount")!;
  let collateralDelta = data.getIntItem("collateralDeltaAmount");
  if (collateralDelta === null) {
    collateralDelta = BigInt.fromI32(0);
  }

  const collateralTokenPrice = data.getUintItem("collateralTokenPrice.min")!;
  const collateralAmountUsd = collateralAmount.times(collateralTokenPrice);
  const collateralDeltaUsd = collateralDelta.times(collateralTokenPrice);

  perf.totalPnl = perf.totalPnl.plus(basePnlUsd);
  perf.totalCollateral = perf.totalCollateral.plus(
    isIncrease ? collateralDeltaUsd : collateralDeltaUsd.neg()
  );

  const inputCollateral = perf.totalCollateral.minus(perf.totalPnl);
  if (perf.maxCollateral.lt(inputCollateral)) {
    perf.maxCollateral = inputCollateral;
  }

  perf.cumsumSize = perf.cumsumSize.plus(position.sizeInUsd);
  perf.cumsumCollateral = perf.cumsumCollateral.plus(collateralAmountUsd);

  if (sizeInUsd.equals(BigInt.fromI32(0))) {
    perf.sumMaxSize = perf.sumMaxSize.plus(position.maxSize);
    perf.closedCount = perf.closedCount.plus(BigInt.fromI32(1));

    if (position.realizedPnl.ge(BigInt.fromI32(0))) {
      perf.wins = perf.wins.plus(BigInt.fromI32(1));
    } else {
      perf.losses = perf.losses.plus(BigInt.fromI32(1));
    }
  }

  perf.save();

  return perf;
};
