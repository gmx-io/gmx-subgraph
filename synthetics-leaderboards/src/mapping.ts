import { BigInt, store, log, Address } from "@graphprotocol/graph-ts";
import { EventLog1, EventLog1EventDataStruct } from "../generated/EventEmitter/EventEmitter";
import { AccountOpenPosition, AccountPerf } from "../generated/schema";
import { EventData } from "./utils/eventData";
import { fujiOrders } from "./utils/fixtures-fuji";

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
  position.sizeUpdatedAt = event.transaction.hash.toHexString();

  if (position.entryPrice.isZero()) {
    position.entryPrice = data.getUintItem("executionPrice")!;
    position.isLong = data.getBoolItem("isLong");
  }

  let priceImpactDiffUsd = data.getIntItem("priceImpactDiffUsd");
  if (priceImpactDiffUsd === null) {
    priceImpactDiffUsd = BigInt.fromI32(0);
  }

  position.priceImpactUsd = position.priceImpactUsd.plus(priceImpactDiffUsd);

  updateAccountPerformanceForPeriod(TOTAL, position, data, event, isNewPositionEntity);
  updateAccountPerformanceForPeriod(DAILY, position, data, event, isNewPositionEntity);
  updateAccountPerformanceForPeriod(HOURLY, position, data, event, isNewPositionEntity);

  if (position.sizeInUsd.equals(BigInt.fromI32(0)) && position.feesUpdatedAt == position.sizeUpdatedAt) {
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
    const fixtures = fujiOrders;
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

  if (position.sizeInUsd.equals(BigInt.fromI32(0)) && position.feesUpdatedAt == position.sizeUpdatedAt) {
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
  isNewPositionEntity: boolean,
): AccountPerf {
  const eventName = event.params.eventName;
  const isIncrease = eventName == "PositionIncrease";
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

  let priceImpactDiffUsd = data.getIntItem("priceImpactDiffUsd");
  if (priceImpactDiffUsd === null) {
    priceImpactDiffUsd = BigInt.fromI32(0);
  }
  perf.priceImpactUsd = perf.priceImpactUsd.plus(priceImpactDiffUsd);

  const collateralTokenPrice = data.getUintItem("collateralTokenPrice.min")!;
  const collateralAmountUsd = collateralAmount.times(collateralTokenPrice);
  const collateralDeltaUsd = collateralDelta.times(collateralTokenPrice);

  perf.totalPnl = perf.totalPnl.plus(basePnlUsd);

  // if (isNewPositionEntity && perf.totalCollateral.isZero() && (collateralDelta.isZero() || collateralDelta.lt(BigInt.fromI32(0)))) {
  //   log.error(`Position seems to have trades before contract deployment date: collateral ${
  //     collateralAmount.toString()
  //   } - collateral delta ${collateralDelta.toString()} is not equal to 0, event ${eventName}, is new ${
  //     isNewPositionEntity ? "yes" : "no"
  //   } collateralUsd ${collateralAmountUsd}, collateralDeltaUsd ${collateralDeltaUsd}`, []);
  // }

  const collateralBefore = collateralAmount.minus(collateralDelta);
  if (isNewPositionEntity && !collateralBefore.isZero()) {
    // log.warning(`Position seems to have trades before contract deployment date: collateral usd ${
    //   collateralAmountUsd.toString
    // } - collateral delta usd ${collateralDelta.toString()} is not equal to 0`, []);
    perf.totalCollateral = perf.totalCollateral.plus(collateralAmountUsd);
  } else {
    perf.totalCollateral = perf.totalCollateral.plus(collateralDeltaUsd);
  } 

  const inputCollateral = perf.totalCollateral.minus(perf.totalPnl);
  if (perf.maxCollateral.lt(inputCollateral)) {
    perf.maxCollateral = inputCollateral;
  }

  if (isNewPositionEntity) {
    log.info(`New position account perf update account ${
      perf.account
    }, event ${
      eventName
    }, collateral before ${
      collateralBefore.toString()
    }, collateral after ${
      collateralAmount.toString()
    }, total pnl ${
      perf.totalPnl.toString()
    }, input collateral ${
      inputCollateral.toString()
    }, max collateral ${
      perf.maxCollateral.toString()
    }`, []);
  }


  if (perf.cumsumSize.isZero() && sizeInUsd.isZero()) {
    let delta = data.getUintItem("sizeDeltaUsd")!;
    if (isIncrease) {
      perf.cumsumSize = delta.neg();
    } else {
      perf.cumsumSize = delta;
    }
  }

  const sizeDeltaInUsd = data.getUintItem("sizeDeltaUsd")!;

  if (isNewPositionEntity && period == TOTAL) {
    const safeStr = (v: BigInt | null): string => v === null ? "null" : v.toString();
    const size = data.getUintItem("sizeInTokens");
    const sizeDeltaInTokens = data.getUintItem("sizeDeltaInTokens");
    let sizeBefore: BigInt | null = null;
    if (size !== null && sizeDeltaInTokens !== null) {
      if (isIncrease) {
        sizeBefore = size.minus(sizeDeltaInTokens);
      } else {
        sizeBefore = size.plus(sizeDeltaInTokens);
      }
    }

    let sizeBeforeInUsd: BigInt | null = null;
    if (sizeInUsd !== null && sizeDeltaInUsd !== null) {
      if (isIncrease) {
        sizeBeforeInUsd = sizeInUsd.minus(sizeDeltaInUsd);
      } else {
        sizeBeforeInUsd = sizeInUsd.plus(sizeDeltaInUsd);
      }
    }

    let collateralBefore: BigInt | null = null;
    if (collateralAmount !== null && collateralDelta !== null) {
      collateralBefore = collateralAmount.minus(collateralDelta);
    }

    let collateralBeforeInUsd: BigInt | null = null;
    if (collateralAmountUsd !== null && collateralDeltaUsd !== null) {
      collateralBeforeInUsd = collateralAmountUsd.minus(collateralDeltaUsd);
    }

    if (
      (sizeBefore && !sizeBefore.isZero()) ||
      (collateralBefore && !collateralBefore.isZero()) // ||
      // (sizeBeforeInUsd && !sizeBeforeInUsd.isZero()) ||
      // (collateralBeforeInUsd && !collateralBeforeInUsd.isZero())
    ) {
      log.warning(`New account ${
        perf.account
      } position ${
        position.id
      } appeared with non-zero size or collateral before change. Size ${
        safeStr(size)
      }, size delta ${
        safeStr(sizeDeltaInTokens)
      }, size before ${
        safeStr(sizeBefore)
      }, size in usd ${
        safeStr(sizeInUsd)
      }, size delta in usd ${
        safeStr(sizeDeltaInUsd)
      }, size before in usd ${
        safeStr(sizeBeforeInUsd)
      }, collateral ${
        safeStr(collateralAmount)
      }, collateral delta ${
        safeStr(collateralDelta)
      }, collateral before ${
        safeStr(collateralBefore)
      }, collateral in usd ${
        safeStr(collateralAmountUsd)
      }, collateral delta in usd ${
        safeStr(collateralDeltaUsd)
      }, collateral before in usd ${
        safeStr(collateralBeforeInUsd)
      }, event ${
        eventName
      }, block ${
        event.block.number.toString()
      }, tx ${
        event.transaction.hash.toHexString()
      }`, []);
    } else {
      log.info(`New position detected for account ${
        perf.account
      }, key ${position.id}, size ${
        safeStr(size)
      }, size delta ${
        safeStr(sizeDeltaInUsd)
      }, size before ${
        safeStr(sizeBefore)
      }, collateral ${
        safeStr(collateralAmount)
      }, collateral delta ${
        safeStr(collateralDelta)
      }, collateral before ${
        safeStr(collateralBefore)
      }`, []);
    }
  }

  perf.cumsumSize = perf.cumsumSize.plus(sizeInUsd);

  // if (period == TOTAL && perf.cumsumSize.isZero()) {
  //   const sit = data.getUintItem("sizeInTokens");
  //   let sitStr: string;
  //   if (sit === null) {
  //     sitStr = "null";
  //   } else {
  //     sitStr = sit.toString();
  //   }

  //   const sdit = data.getUintItem("sizeDeltaInTokens");
  //   let sditStr: string;
  //   if (sdit === null) {
  //     sditStr = "null";
  //   } else {
  //     sditStr = sdit.toString();
  //   }

  //   const sdiu = data.getUintItem("sizeDeltaUsd");
  //   let sdiuStr: string;
  //   if (sdiu === null) {
  //     sdiuStr = "null";
  //   } else {
  //     sdiuStr = sdiu.toString();
  //   }

  //   let siuStr: string;
  //   if (sizeInUsd === null) {
  //     siuStr = "null";
  //   } else {
  //     siuStr = sizeInUsd.toString();
  //   }
  //   log.error(
  //     `Errorneous cumsum size for account ${position.account.toString()}, ` +
  //     `size ${sitStr}, ` +
  //     `size Delta ${sditStr}, ` +
  //     `size USD value ${siuStr}, ` +
  //     `size Delta USD ${sdiuStr}, ` +
  //     `cumsum size USD ${perf.cumsumSize.toString()}, ` +
  //     `event: ${eventName}`,
  //     []
  //   );
  // }

  if (perf.cumsumCollateral.isZero() && collateralAmountUsd.isZero()) {
    perf.cumsumCollateral = collateralDeltaUsd.neg();
  }

  perf.cumsumCollateral = perf.cumsumCollateral.plus(collateralAmountUsd);

  // if (period == TOTAL && perf.cumsumCollateral.isZero()) {
  //   log.error(
  //     `Errorneous cumsum collateral for account ${position.account.toString()}, ` +
  //     `collateral Delta ${collateralDelta.toString()}, ` +
  //     `collateral Amount ${collateralAmount.toString()}, ` +
  //     `collateral Price ${collateralTokenPrice.toString()}, ` +
  //     `collateral USD value ${collateralAmountUsd.toString()}, ` +
  //     `collateral Delta USD ${collateralDeltaUsd.toString()}, ` +
  //     `total collateral USD ${perf.totalCollateral.toString()}, ` +
  //     `input collateral USD ${inputCollateral.toString()}, ` +
  //     `max collateral USD ${perf.maxCollateral.toString()}, ` +
  //     `cumsum collateral USD ${perf.cumsumCollateral.toString()}, ` +
  //     `event: ${eventName}`,
  //     []
  //   );
  // }

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
