import { BigInt, store, log } from "@graphprotocol/graph-ts";
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

  if (isFeeEvent && data.getBytes32Item("positionKey") === null) {
    // FIXME: this clause is a temp hack to work around fee events without
    //        position key that normally wouldn't occur
    return;
  }

  const position = getOrCreatePosition(data, eventName);

  if (isFeeEvent) {
    return handlePositionFeesEvent(position, event);
  }

  const sizeInUsd = data.getUintItem("sizeInUsd")!;
  let basePnlUsd = data.getIntItem("basePnlUsd");
  if (basePnlUsd === null) {
    basePnlUsd = BigInt.fromI32(0);
  }

  position.realizedPnl = position.realizedPnl.plus(basePnlUsd);
  position.collateralAmount = data.getUintItem("collateralAmount")!;
  position.sizeInTokens = data.getUintItem("sizeInTokens")!;
  position.sizeInUsd = sizeInUsd;
  position.maxSize = position.maxSize.lt(sizeInUsd) ? sizeInUsd : position.maxSize;

  let priceImpactDiffUsd = data.getIntItem("priceImpactDiffUsd");
  if (priceImpactDiffUsd === null) {
    priceImpactDiffUsd = BigInt.fromI32(0);
  }

  position.priceImpactUsd = position.priceImpactUsd.plus(priceImpactDiffUsd);

  updateAccountPerformanceForPeriod(TOTAL, position, data, event);
  updateAccountPerformanceForPeriod(DAILY, position, data, event);
  updateAccountPerformanceForPeriod(HOURLY, position, data, event);

  if (sizeInUsd.equals(BigInt.fromI32(0))) {
    store.remove("AccountOpenPosition", position.id);
  } else {
    position.save();
  }

  return;
}

function getOrCreatePosition(data: EventData, eventName: string): AccountOpenPosition {
  // const key = `${account}:${market}:${collateralToken}:${isLong ? "long" : "short"}`;
  const key = data.getBytes32Item("positionKey")!.toHexString();
  let position = AccountOpenPosition.load(key);
  if (position === null) {
    if (eventName != "PositionIncrease" && eventName != "PositionDecrease") {
      throw new Error(`Unable to create a new position entity from "${eventName}" event`);
    }
    position = new AccountOpenPosition(key);

    position.account = data.getAddressItem("account")!.toHexString();
    position.market = data.getAddressItem("market")!.toHexString();
    position.collateralToken = data.getAddressItem("collateralToken")!.toHexString();
    position.entryPrice = data.getUintItem("executionPrice")!;
    position.isLong = data.getBoolItem("isLong");
    position.realizedPnl = BigInt.fromI32(0);
    position.maxSize = BigInt.fromI32(0);
    position.fundingFeeUsd = BigInt.fromI32(0);
    position.positionFeeUsd = BigInt.fromI32(0);
    position.borrowingFeeUsd = BigInt.fromI32(0);
    position.priceImpactUsd = BigInt.fromI32(0);
  }

  return position;
}

function handlePositionFeesEvent(position: AccountOpenPosition, event: EventLog1): void {
  const data = new EventData(event.params.eventData as EventLog1EventDataStruct);

  const collateralTokenPrice = data.getUintItem("collateralTokenPrice.min")!;

  const fundingFee = data.getUintItem("fundingFeeAmount")!;
  const positionFee = data.getUintItem("positionFeeAmount")!;
  const borrowingFee = data.getUintItem("borrowingFeeAmount")!;

  const fundingFeeUsd = fundingFee.times(collateralTokenPrice);
  const positionFeeUsd = positionFee.times(collateralTokenPrice);
  const borrowingFeeUsd = borrowingFee.times(collateralTokenPrice);

  position.fundingFeeUsd = position.fundingFeeUsd.plus(fundingFeeUsd);
  position.positionFeeUsd = position.positionFeeUsd.plus(positionFeeUsd);
  position.borrowingFeeUsd = position.borrowingFeeUsd.plus(borrowingFeeUsd);

  const periods = [TOTAL, DAILY, HOURLY];
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const perf: AccountPerf = getOrCreateAccountPerfForPeriod(position.account, period, event);

    perf.fundingFeeUsd = perf.fundingFeeUsd.plus(fundingFeeUsd);
    perf.positionFeeUsd = perf.positionFeeUsd.plus(positionFeeUsd);
    perf.borrowingFeeUsd = perf.borrowingFeeUsd.plus(borrowingFeeUsd);

    perf.save();
  }

  position.save();
}

function periodStart(period: string, event: EventLog1): Date {
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
}

function getOrCreateAccountPerfForPeriod(account: string, period: string, event: EventLog1): AccountPerf {
  const timestamp = i32(periodStart(period, event).getTime() / 1000);
  const key = account + ":" + period + ":" + timestamp.toString();

  let perf = AccountPerf.load(key);

  if (perf === null) {
    perf = new AccountPerf(key);
    perf.account = account;
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
    perf.fundingFeeUsd = BigInt.fromI32(0);
    perf.positionFeeUsd = BigInt.fromI32(0);
    perf.borrowingFeeUsd = BigInt.fromI32(0);
    perf.priceImpactUsd = BigInt.fromI32(0);
  }

  return perf as AccountPerf;
}

function updateAccountPerformanceForPeriod(
  period: string,
  position: AccountOpenPosition,
  data: EventData,
  event: EventLog1,
): AccountPerf {
  const eventName = event.params.eventName;
  const isIncrease = eventName != "PositionIncrease";
  const perf = getOrCreateAccountPerfForPeriod(position.account, period, event);
  let basePnlUsd = data.getIntItem("basePnlUsd");
  if (basePnlUsd === null) {
    basePnlUsd = BigInt.fromI32(0);
  }

  const sizeInUsd = data.getUintItem("sizeInUsd")!;
  const collateralAmount = data.getUintItem("collateralAmount")!;
  let collateralDelta = data.getIntItem("collateralDeltaAmount");
  if (collateralDelta === null) {
    collateralDelta = BigInt.fromI32(0);
  }

  let priceImpactDiffUsd = data.getIntItem("priceImpactDiffUsd");
  if (priceImpactDiffUsd === null) {
    priceImpactDiffUsd = BigInt.fromI32(0);
  }
  perf.priceImpactUsd = perf.priceImpactUsd.plus(priceImpactDiffUsd);

  const collateralTokenPrice = data.getUintItem("collateralTokenPrice.min")!;
  const collateralAmountUsd = collateralAmount.times(collateralTokenPrice);
  const collateralDeltaUsd = collateralDelta.times(collateralTokenPrice);

  perf.totalPnl = perf.totalPnl.plus(basePnlUsd);
  perf.totalCollateral = perf.totalCollateral.plus(collateralDeltaUsd);

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
}
