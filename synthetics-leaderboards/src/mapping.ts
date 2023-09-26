import { BigInt, store, log, Address, dataSource } from "@graphprotocol/graph-ts";
import { EventLog1, EventLog1EventDataStruct } from "../generated/EventEmitter/EventEmitter";
import { AccountOpenPosition, AccountPerf } from "../generated/schema";
import { EventData } from "./utils/eventData";
import fixtures from "./fixtures";

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
  const position = getOrCreatePosition(data, eventName);
  const isNewPositionEntity = position.sizeUpdatedAt == "";

  if (isFeeEvent) {
    handlePositionFeesEvent(position, event);
    return;
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
  position.sizeUpdatedAt = event.transaction.hash.toHexString();

  if (position.entryPrice.isZero()) {
    position.entryPrice = data.getUintItem("executionPrice")!;
    position.isLong = data.getBoolItem("isLong");
  }

  if (isDecEvent) {
    const priceImpactUsd = data.getIntItem("priceImpactUsd")!;
    position.priceImpactUsd = position.priceImpactUsd.plus(priceImpactUsd);
  }

  updateAccountPerformanceForPeriod(TOTAL, position, data, event, isNewPositionEntity);
  updateAccountPerformanceForPeriod(DAILY, position, data, event, isNewPositionEntity);
  updateAccountPerformanceForPeriod(HOURLY, position, data, event, isNewPositionEntity);

  if (position.sizeInUsd.isZero() && position.feesUpdatedAt == position.sizeUpdatedAt) {
    store.remove("AccountOpenPosition", position.id);
  } else {
    position.save();
  }

  return;
}

function getOrCreatePosition(data: EventData, eventName: string): AccountOpenPosition {
  let keyBytes32 = data.getBytes32Item("positionKey"); // FIXME: temp hack, should be non-nullable!
  let key: string;

  if (keyBytes32 === null) {
    const network = dataSource.network();
    let orders = fixtures.get(network);
    if (!orders) {
      orders = new Map<string, string>();
    }
    const orderKey = data.getBytes32Item("orderKey");
    if (orderKey === null || !orders.has(orderKey.toHexString())) {
      const order = orderKey === null ? "null" : orderKey.toString();
      const msg = `${eventName} error: undefined order key: ${order}; network: ${network}`;
      log.error(msg, []);
      throw new Error(msg);
    }
    key = orders.get(orderKey.toHexString());
  } else {
    key = keyBytes32.toHexString();
  }

  let position = AccountOpenPosition.load(key);
  if (position === null) {
    position = new AccountOpenPosition(key);

    let entryPrice = data.getUintItem("executionPrice");
    if (entryPrice === null) {
      entryPrice = BigInt.fromI32(0);
    }

    let account: Address;
    if (eventName == "PositionFeesCollected") {
      account = data.getAddressItem("trader")!;
    } else {
      account = data.getAddressItem("account")!;
    }

    position.account = account.toHexString();
    position.market = data.getAddressItem("market")!.toHexString();
    position.collateralToken = data.getAddressItem("collateralToken")!.toHexString();
    position.entryPrice = entryPrice;
    position.isLong = data.getBoolItem("isLong");
    position.realizedPnl = BigInt.fromI32(0);
    position.maxSize = BigInt.fromI32(0);
    position.fundingFeeUsd = BigInt.fromI32(0);
    position.positionFeeUsd = BigInt.fromI32(0);
    position.borrowingFeeUsd = BigInt.fromI32(0);
    position.priceImpactUsd = BigInt.fromI32(0);
    position.feesUpdatedAt = "";
    position.sizeUpdatedAt = "";

    position.sizeInUsd = BigInt.fromI32(0);
    position.collateralAmount = BigInt.fromI32(0);
    position.sizeInTokens = BigInt.fromI32(0);
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
  position.feesUpdatedAt = event.transaction.hash.toHexString();

  const periods = [TOTAL, DAILY, HOURLY];
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const perf: AccountPerf = getOrCreateAccountPerfForPeriod(position.account, period, event);

    perf.fundingFeeUsd = perf.fundingFeeUsd.plus(fundingFeeUsd);
    perf.positionFeeUsd = perf.positionFeeUsd.plus(positionFeeUsd);
    perf.borrowingFeeUsd = perf.borrowingFeeUsd.plus(borrowingFeeUsd);

    perf.save();
  }

  if (position.sizeInUsd.isZero() && position.feesUpdatedAt == position.sizeUpdatedAt) {
    store.remove("AccountOpenPosition", position.id);
  } else {
    position.save();
  }

  return;
}

function periodStart(period: string, event: EventLog1): Date {
  if (period == TOTAL) {
    return new Date(1687250908000); // TODO: come up with a better
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
    perf.volume = BigInt.fromI32(0);
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
  isNewPositionEntity: boolean,
): AccountPerf {
  const eventName = event.params.eventName;
  const isIncrease = eventName == "PositionIncrease";
  const isDecrease = eventName == "PositionDecrease";
  const perf = getOrCreateAccountPerfForPeriod(position.account, period, event);
  let basePnlUsd = data.getIntItem("basePnlUsd");
  if (basePnlUsd === null) {
    basePnlUsd = BigInt.fromI32(0);
  }

  const sizeInUsd = data.getUintItem("sizeInUsd")!;
  const collateralAmount = data.getUintItem("collateralAmount")!;
  let collateralDelta: BigInt | null;
  if (isIncrease) {
    collateralDelta = data.getIntItem("collateralDeltaAmount");
  } else {
    collateralDelta = data.getUintItem("collateralDeltaAmount");
  }

  if (collateralDelta === null) {
    collateralDelta = BigInt.fromI32(0);
  } else if (!isIncrease) {
    collateralDelta = collateralDelta.neg();
  }

  if (isDecrease) {
    const priceImpactUsd = data.getIntItem("priceImpactUsd")!;
    perf.priceImpactUsd = perf.priceImpactUsd.plus(priceImpactUsd);
  }

  const collateralTokenPrice = data.getUintItem("collateralTokenPrice.min")!;
  const collateralAmountUsd = collateralAmount.times(collateralTokenPrice);
  const collateralDeltaUsd = collateralDelta.times(collateralTokenPrice);

  perf.totalPnl = perf.totalPnl.plus(basePnlUsd);

  const collateralBefore = collateralAmount.minus(collateralDelta);
  if (isNewPositionEntity && !collateralBefore.isZero()) {
    // TODO: this is a debug clause handling trade history issue, remove as it gets resolved
    perf.totalCollateral = perf.totalCollateral.plus(collateralAmountUsd);
  } else {
    perf.totalCollateral = perf.totalCollateral.plus(collateralDeltaUsd);
  } 

  const inputCollateral = perf.totalCollateral.minus(perf.totalPnl);
  if (perf.maxCollateral.lt(inputCollateral)) {
    perf.maxCollateral = inputCollateral;
  }

  const delta = data.getUintItem("sizeDeltaUsd")!;

  if (isIncrease) {
    perf.volume = perf.volume.plus(delta);
  }

  if (perf.cumsumSize.isZero() && sizeInUsd.isZero()) {
    // TODO: this is a debug clause handling trade history issue, remove as it gets resolved
    if (isIncrease) {
      perf.cumsumSize = delta.neg();
    } else {
      perf.cumsumSize = delta;
    }
  }

  perf.cumsumSize = perf.cumsumSize.plus(sizeInUsd);

  if (perf.cumsumCollateral.isZero() && collateralAmountUsd.isZero()) {
    // TODO: this is a debug clause handling trade history issue, remove as it gets resolved
    perf.cumsumCollateral = collateralDeltaUsd.neg();
  }

  perf.cumsumCollateral = perf.cumsumCollateral.plus(collateralAmountUsd);

  if (sizeInUsd.isZero()) {
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
