import { BigInt, store, log, Address } from "@graphprotocol/graph-ts";
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
  position.sizeUpdatedAt = event.block.number;

  if (position.entryPrice.isZero()) {
    position.entryPrice = data.getUintItem("executionPrice")!;
    position.isLong = data.getBoolItem("isLong");
  }

  let priceImpactDiffUsd = data.getIntItem("priceImpactDiffUsd");
  if (priceImpactDiffUsd === null) {
    priceImpactDiffUsd = BigInt.fromI32(0);
  }

  position.priceImpactUsd = position.priceImpactUsd.plus(priceImpactDiffUsd);

  updateAccountPerformanceForPeriod(TOTAL, position, data, event);
  updateAccountPerformanceForPeriod(DAILY, position, data, event);
  updateAccountPerformanceForPeriod(HOURLY, position, data, event);

  if (position.sizeInUsd.equals(BigInt.fromI32(0)) && position.feesUpdatedAt.equals(position.sizeUpdatedAt)) {
    store.remove("AccountOpenPosition", position.id);
  } else {
    position.save();
  }

  return;
}

const fixtures = new Map<string, string>();
fixtures.set(
  "0x988da51065bb90ce6c4953c067b0b9af2483fa23e0bcd7297c00b1f7be0f8ced",
  "0x98b88369adb870c84817e3e89c2998d9ef53377758e39c8cbccc02f4ec2c5254",
);
fixtures.set(
  "0xed10b07f4fcc9c0ee484553105e7d6f6a04bc91297a7ac8b283acd72c03d5d8c",
  "0x98b88369adb870c84817e3e89c2998d9ef53377758e39c8cbccc02f4ec2c5254",
);
fixtures.set(
  "0x5c39c32bee32c7512d45f15f8a8982f8858496211c8e7ff5f47587c04d579310",
  "0x1456c082dfc4bbb2f59cd38a4e9365533063dc4a0757f6fc6495b7f186abe939",
);

function getOrCreatePosition(data: EventData, eventName: string): AccountOpenPosition {
  let keyBytes32 = data.getBytes32Item("positionKey"); // FIXME: temp hack, should be non-nullable!
  let key: string;
  if (keyBytes32 === null) {
    const orderKey = data.getBytes32Item("orderKey");
    if (orderKey === null || !fixtures.has(orderKey.toHexString())) {
      const order = orderKey === null ? "null" : orderKey.toString();
      const msg = `${eventName} error: undefined order key: ${order}`;
      log.error(msg, []);
      throw new Error(msg);
    }
    key = fixtures.get(orderKey.toHexString());
  } else {
    key = keyBytes32.toHexString();
  }

  // const key = `${account}:${market}:${collateralToken}:${isLong ? "long" : "short"}`;
  // const key = data.getBytes32Item("positionKey")!.toHexString();
  let position = AccountOpenPosition.load(key);
  if (position === null) {
    // if (eventName != "PositionIncrease" && eventName != "PositionDecrease") {
    //   log.error(`Position ${key} ${eventName} occurs before trade`, []);
    //   throw new Error(`Unable to create a new position entity from "${eventName}" event`);
    // }

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
    position.feesUpdatedAt = BigInt.fromI32(0);
    position.sizeUpdatedAt = BigInt.fromI32(0);

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
  position.feesUpdatedAt = event.block.number;

  const periods = [TOTAL, DAILY, HOURLY];
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const perf: AccountPerf = getOrCreateAccountPerfForPeriod(position.account, period, event);

    perf.fundingFeeUsd = perf.fundingFeeUsd.plus(fundingFeeUsd);
    perf.positionFeeUsd = perf.positionFeeUsd.plus(positionFeeUsd);
    perf.borrowingFeeUsd = perf.borrowingFeeUsd.plus(borrowingFeeUsd);

    perf.save();
  }

  if (position.sizeInUsd.equals(BigInt.fromI32(0)) && position.feesUpdatedAt.equals(position.sizeUpdatedAt)) {
    store.remove("AccountOpenPosition", position.id);
  } else {
    position.save();
  }

  return;
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
