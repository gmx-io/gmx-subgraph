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
  const positionKey = eventData.getBytes32Item("positionKey")!.toHexString(); // account + ":" + market + ":" + collateralToken + ":" + (isLong ? "long" : "short")

  let basePnlUsd = eventData.getUintItem("basePnlUsd");

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
    accountPosition.realizedPnl = BigInt.fromString("0");
  }

  accountPosition.size = sizeInTokens; // TODO: or should it rather be sizeInUsd?
  accountPosition.realizedPnl = accountPosition.realizedPnl.plus(basePnlUsd);

  _updateAccountPerformanceForPeriod(HOURLY, accountPosition, eventData, event);
  _updateAccountPerformanceForPeriod(DAILY, accountPosition, eventData, event);

  if (sizeInUsd.equals(BigInt.fromString("0"))) {
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
  const collateralAmount = eventData.getUintItem("collateralAmount")!;
  const collateralTokenPrice = eventData.getUintItem("collateralTokenPrice.min")!;
  const periodStart = i32(_periodStart(period, event).getTime() / 1000).toString();
  const accountPerfId = accountPosition.account + ":" + periodStart + ":" + period;

  let accountPerf = AccountPerf.load(accountPerfId);

  if (accountPerf === null) {
    accountPerf = new AccountPerf(accountPerfId);
    accountPerf.account = accountPosition.account;
    accountPerf.timestamp = BigInt.fromString(periodStart).toI32();
    accountPerf.period = period;
    accountPerf.volume = BigInt.fromI32(0);
    accountPerf.wins = BigInt.fromI32(0);
    accountPerf.losses = BigInt.fromI32(0);
    accountPerf.totalPnl = BigInt.fromI32(0);
    accountPerf.maxCollateral = BigInt.fromI32(0);
  }

  accountPerf.volume = accountPerf.volume.plus(sizeDeltaUsd);

  const collateralAmountUsd = collateralAmount.times(collateralTokenPrice);

  if (accountPerf.maxCollateral.lt(collateralAmountUsd)) {
    accountPerf.maxCollateral = collateralAmountUsd;
  }

  if (sizeInUsd.equals(BigInt.fromString("0"))) {
    accountPerf.totalPnl = accountPerf.totalPnl.plus(accountPosition.realizedPnl);

    if (accountPosition.realizedPnl.ge(BigInt.fromString("0"))) {
      accountPerf.wins = accountPerf.wins.plus(BigInt.fromString("1"));
    } else {
      accountPerf.losses = accountPerf.losses.plus(BigInt.fromString("1"));
    }
  }

  accountPerf.save();

  return;
};
