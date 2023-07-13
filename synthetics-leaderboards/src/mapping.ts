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
  const collateralAmount = eventData.getUintItem("collateralAmount")!;
  const collateralTokenPrice = eventData.getUintItem("collateralTokenPrice.min")!;
  const isLong = eventData.getBoolItem("isLong");
  const sizeInTokens = eventData.getUintItem("sizeInTokens")!;
  const sizeInUsd = eventData.getUintItem("sizeInUsd")!;
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
    accountPosition.maxCollateral = BigInt.fromI32(0);
    accountPosition.sumSize = BigInt.fromI32(0);
    accountPosition.sumCollateral = BigInt.fromI32(0);
    accountPosition.changeCount = BigInt.fromI32(0);
  }

  const collateralAmountUsd = collateralAmount.times(collateralTokenPrice);

  accountPosition.changeCount = accountPosition.changeCount.plus(BigInt.fromI32(1));
  accountPosition.realizedPnl = accountPosition.realizedPnl.plus(basePnlUsd);
  accountPosition.sizeInTokens = sizeInTokens;
  accountPosition.sizeInUsd = sizeInUsd;
  accountPosition.sumSize = accountPosition.sumSize.plus(sizeInUsd);
  accountPosition.sumCollateral = accountPosition.sumCollateral.plus(collateralAmountUsd);

  if (accountPosition.maxSize.lt(sizeInUsd)) {
    accountPosition.maxSize = sizeInUsd;
  }

  if (accountPosition.maxCollateral.lt(collateralAmountUsd)) {
    accountPosition.maxCollateral = collateralAmountUsd;
  }

  _updateAccountPerformanceForPeriod(HOURLY, accountPosition, eventData, event);
  _updateAccountPerformanceForPeriod(DAILY, accountPosition, eventData, event);

  if (sizeInUsd.equals(BigInt.fromI32(0))) {
    store.remove("AccountOpenPosition", accountPosition.id);
  } else {
    accountPosition.save();
  }

  return;
}

const _periodStart = (period: string, event: EventLog1): Date => {
  const today = new Date(event.block.timestamp.toI64() * 1000);

  if (period === DAILY) {
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
): void => {

  const sizeInUsd = eventData.getUintItem("sizeInUsd")!;
  const sizeDeltaUsd = eventData.getUintItem("sizeDeltaUsd")!;
  const periodStart = i32(_periodStart(period, event).getTime() / 1000);
  const accountPerfId = accountPosition.account + ":" + periodStart.toString() + ":" + period;

  let accountPerf = AccountPerf.load(accountPerfId);

  if (accountPerf === null) {
    accountPerf = new AccountPerf(accountPerfId);
    accountPerf.account = accountPosition.account;
    accountPerf.timestamp = periodStart;
    accountPerf.period = period;
    accountPerf.volume = BigInt.fromI32(0);
    accountPerf.wins = BigInt.fromI32(0);
    accountPerf.losses = BigInt.fromI32(0);
    accountPerf.totalPnl = BigInt.fromI32(0);
    accountPerf.positionCount = BigInt.fromI32(0);
    accountPerf.sumCollateral = BigInt.fromI32(0);
    accountPerf.sumSize = BigInt.fromI32(0);
    accountPerf.sumMaxSize = BigInt.fromI32(0);
    accountPerf.sumMaxCollateral = BigInt.fromI32(0);
  }

  accountPerf.volume = accountPerf.volume.plus(sizeDeltaUsd);

  if (sizeInUsd.equals(BigInt.fromI32(0))) {
    accountPerf.totalPnl = accountPerf.totalPnl.plus(accountPosition.realizedPnl);
    accountPerf.sumSize = accountPerf.sumSize.plus(accountPosition.sumSize);
    accountPerf.sumCollateral = accountPerf.sumCollateral.plus(accountPosition.sumCollateral);
    accountPerf.sumMaxSize = accountPerf.sumMaxSize.plus(accountPosition.maxSize);
    accountPerf.sumMaxCollateral = accountPerf.sumMaxCollateral.plus(accountPosition.maxCollateral);
    accountPerf.positionCount = accountPerf.positionCount.plus(BigInt.fromI32(1));

    if (accountPosition.realizedPnl.ge(BigInt.fromI32(0))) {
      accountPerf.wins = accountPerf.wins.plus(BigInt.fromI32(1));
    } else {
      accountPerf.losses = accountPerf.losses.plus(BigInt.fromI32(1));
    }
  }

  accountPerf.save();

  return;
};
