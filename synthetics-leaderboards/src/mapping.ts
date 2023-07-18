import { BigInt, store } from "@graphprotocol/graph-ts";
import { EventLog1, EventLog1EventDataStruct } from "../generated/EventEmitter/EventEmitter";
import { AccountOpenPosition, AccountPerf } from "../generated/schema";
import { EventData } from "./utils/eventData";

const HOURLY = "hourly";
const DAILY = "daily";
const TOTAL = "total";

// const PERIOD = {
//   HOURLY: "hourly",
//   DAILY: "daily",
//   TOTAL: "total",
// };
// type Period = string; // "hourly" | "daily" | "total" // typeof PERIOD[keyof typeof PERIOD];

export function handleEventLog1(event: EventLog1): void {
  const eventName = event.params.eventName;

  if (eventName != "PositionIncrease" && eventName != "PositionDecrease") {
    return;
  }

  const eventData = new EventData(event.params.eventData as EventLog1EventDataStruct);
  const account = eventData.getAddressItem("account")!.toHexString();
  const market = eventData.getAddressItem("market")!.toHexString();
  const collateralToken = eventData.getAddressItem("collateralToken")!.toHexString();
  const isLong = eventData.getBoolItem("isLong");
  const sizeInTokens = eventData.getUintItem("sizeInTokens")!;
  const sizeInUsd = eventData.getUintItem("sizeInUsd")!;
  const collateralAmount = eventData.getUintItem("collateralAmount")!;
  const executionPrice = eventData.getUintItem("executionPrice")!;
  const positionKey = eventData.getBytes32Item("positionKey")!.toHexString(); // account + ":" + market + ":" + collateralToken + ":" + (isLong ? "long" : "short")

  let basePnlUsd = eventData.getIntItem("basePnlUsd");

  if (basePnlUsd === null) {
    basePnlUsd = BigInt.fromI32(0);
  }

  let accountPosition = AccountOpenPosition.load(positionKey.toString());

  if (accountPosition === null) {
    accountPosition = new AccountOpenPosition(positionKey.toString());

    accountPosition.account = account;
    accountPosition.market = market;
    accountPosition.collateralToken = collateralToken;
    accountPosition.isLong = isLong;
    accountPosition.realizedPnl = BigInt.fromI32(0);
    accountPosition.entryPrice = executionPrice;
    accountPosition.maxSize = BigInt.fromI32(0);
  }

  accountPosition.realizedPnl = accountPosition.realizedPnl.plus(basePnlUsd);
  accountPosition.sizeInTokens = sizeInTokens;
  accountPosition.sizeInUsd = sizeInUsd;
  accountPosition.collateralAmount = collateralAmount;

  if (accountPosition.maxSize.lt(sizeInUsd)) {
    accountPosition.maxSize = sizeInUsd;
  }

  _updateAccountPerformanceForPeriod(TOTAL, accountPosition, eventData, event);
  _updateAccountPerformanceForPeriod(DAILY, accountPosition, eventData, event);
  _updateAccountPerformanceForPeriod(HOURLY, accountPosition, eventData, event);

  if (sizeInUsd.equals(BigInt.fromI32(0))) {
    store.remove("AccountOpenPosition", accountPosition.id);
  } else {
    accountPosition.save();
  }

  return;
}

const _periodStart = (period: string, event: EventLog1): Date => {
  if (period == TOTAL) {
    return new Date(1685618741000);
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

const _updateAccountPerformanceForPeriod = (
  period: string,
  accountPosition: AccountOpenPosition,
  eventData: EventData,
  event: EventLog1,
): AccountPerf => {
  const eventName = event.params.eventName;
  const isIncrease = eventName != "PositionIncrease";

  const sizeInUsd = eventData.getUintItem("sizeInUsd")!;
  const periodStart = i32(_periodStart(period, event).getTime() / 1000);
  const accountPerfId = accountPosition.account + ":" + period + ":" + periodStart.toString();

  let accountPerf = AccountPerf.load(accountPerfId);

  if (accountPerf === null) {
    accountPerf = new AccountPerf(accountPerfId);
    accountPerf.account = accountPosition.account;
    accountPerf.period = period;
    accountPerf.timestamp = periodStart;
    accountPerf.wins = BigInt.fromI32(0);
    accountPerf.losses = BigInt.fromI32(0);
    accountPerf.totalPnl = BigInt.fromI32(0);
    accountPerf.totalCollateral = BigInt.fromI32(0);
    accountPerf.maxCollateral = BigInt.fromI32(0);
    accountPerf.cumsumCollateral = BigInt.fromI32(0);
    accountPerf.cumsumSize = BigInt.fromI32(0);
    accountPerf.sumMaxSize = BigInt.fromI32(0);
    accountPerf.closedCount = BigInt.fromI32(0);
  }

  let basePnlUsd = eventData.getIntItem("basePnlUsd");

  if (basePnlUsd === null) {
    basePnlUsd = BigInt.fromI32(0);
  }

  const collateralAmount = eventData.getUintItem("collateralAmount")!;
  let collateralDelta = eventData.getIntItem("collateralDeltaAmount");
  if (collateralDelta === null) {
    collateralDelta = BigInt.fromI32(0);
  }

  const collateralTokenPrice = eventData.getUintItem("collateralTokenPrice.min")!;
  const collateralAmountUsd = collateralAmount.times(collateralTokenPrice);
  const collateralDeltaUsd = collateralDelta.times(collateralTokenPrice);

  accountPerf.totalPnl = accountPerf.totalPnl.plus(basePnlUsd);
  accountPerf.totalCollateral = accountPerf.totalCollateral.plus(
    isIncrease ? collateralDeltaUsd : collateralDeltaUsd.neg()
  );

  const inputCollateral = accountPerf.totalCollateral.minus(accountPerf.totalPnl);
  if (accountPerf.maxCollateral.lt(inputCollateral)) {
    accountPerf.maxCollateral = inputCollateral;
  }

  accountPerf.cumsumSize = accountPerf.cumsumSize.plus(accountPosition.sizeInUsd);
  accountPerf.cumsumCollateral = accountPerf.cumsumCollateral.plus(collateralAmountUsd);

  if (sizeInUsd.equals(BigInt.fromI32(0))) {
    accountPerf.sumMaxSize = accountPerf.sumMaxSize.plus(accountPosition.maxSize);
    accountPerf.closedCount = accountPerf.closedCount.plus(BigInt.fromI32(1));

    if (accountPosition.realizedPnl.ge(BigInt.fromI32(0))) {
      accountPerf.wins = accountPerf.wins.plus(BigInt.fromI32(1));
    } else {
      accountPerf.losses = accountPerf.losses.plus(BigInt.fromI32(1));
    }
  }

  accountPerf.save();

  return accountPerf;
};
