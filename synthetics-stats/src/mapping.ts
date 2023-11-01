import { Bytes, BigInt } from "@graphprotocol/graph-ts";

import { EventLog1, EventLog2, EventLogEventDataStruct } from "../generated/EventEmitter/EventEmitter";
import { Transfer } from "../generated/templates/MarketTokenTemplate/MarketToken";
import { MarketTokenTemplate } from "../generated/templates";
import { ClaimRef, DepositRef, MarketInfo, Order, TokenPrice } from "../generated/schema";
import { BatchSend } from "../generated/BatchSender/BatchSender";
import { SellUSDG } from "../generated/Vault/Vault";

import {
  saveClaimActionOnOrderCreated,
  saveClaimActionOnOrderExecuted,
  isFundingFeeSettleOrder,
  saveClaimableFundingFeeInfo as handleClaimableFundingUpdated,
  handleCollateralClaimAction,
  saveClaimActionOnOrderCancelled
} from "./entities/claims";
import { getIdFromEvent, getOrCreateTransaction } from "./entities/common";
import {
  getSwapActionByFeeType,
  saveCollectedMarketFeesForPeriod,
  saveCollectedMarketFeesTotal,
  savePositionFeesInfo,
  savePositionFeesInfoWithPeriod,
  saveSwapFeesInfo,
  saveSwapFeesInfoWithPeriod
} from "./entities/fees";
import { saveMarketInfo, saveMarketInfoTokensSupply } from "./entities/markets";
import {
  orderTypes,
  saveOrder,
  saveOrderCancelledState,
  saveOrderCollateralAutoUpdate,
  saveOrderExecutedState,
  saveOrderFrozenState,
  saveOrderSizeDeltaAutoUpdate,
  saveOrderUpdate
} from "./entities/orders";
import { savePositionDecrease, savePositionIncrease } from "./entities/positions";
import { handleSwapInfo as saveSwapInfo } from "./entities/swaps";
import {
  saveOrderCancelledTradeAction,
  saveOrderCreatedTradeAction,
  saveOrderFrozenTradeAction,
  saveOrderUpdatedTradeAction,
  savePositionDecreaseExecutedTradeAction,
  savePositionIncreaseExecutedTradeAction,
  saveSwapExecutedTradeAction
} from "./entities/trades";
import { savePositionVolumeInfo, saveSwapVolumeInfo, saveVolumeInfo } from "./entities/volume";
import { EventData } from "./utils/eventData";
import { saveUserStat } from "./entities/user";
import { saveTokenPrice } from "./entities/prices";
import {
  saveLiquidityProviderIncentivesStat,
  saveMarketIncentivesStat,
  saveUserGlpGmMigrationStatGlpData,
  saveUserGlpGmMigrationStatGmData,
  saveUserMarketInfo
} from "./entities/incentives";
import { saveDistribution } from "./entities/distributions";

let ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

export function handleSellUSDG(event: SellUSDG): void {
  let maxFeeBasisPointsForRebate = BigInt.fromI32(25);
  let feeBasisPoints = event.params.feeBasisPoints;
  if (feeBasisPoints.gt(maxFeeBasisPointsForRebate)) {
    feeBasisPoints = maxFeeBasisPointsForRebate;
  }

  saveUserGlpGmMigrationStatGlpData(
    event.params.account.toHexString(),
    event.block.timestamp.toI32(),
    event.params.usdgAmount,
    feeBasisPoints
  );
}

export function handleBatchSend(event: BatchSend): void {
  let typeId = event.params.typeId;
  let token = event.params.token.toHexString();
  let receivers = event.params.accounts;
  let amounts = event.params.amounts;
  for (let i = 0; i < event.params.accounts.length; i++) {
    let receiver = receivers[i].toHexString();
    saveDistribution(
      receiver,
      token,
      amounts[i],
      typeId.toI32(),
      event.transaction.hash.toHexString(),
      event.block.number.toI32(),
      event.block.timestamp.toI32()
    );
  }
}

export function handleMarketTokenTransfer(event: Transfer): void {
  let marketAddress = event.address.toHexString();
  let from = event.params.from.toHexString();
  let to = event.params.to.toHexString();
  let value = event.params.value;

  // `from` user redeems or transfers out GM tokens
  if (from != ADDRESS_ZERO) {
    // LiquidityProviderIncentivesStat *should* be updated before UserMarketInfo
    saveLiquidityProviderIncentivesStat(from, marketAddress, "1w", value.neg(), event.block.timestamp.toI32());
    saveUserMarketInfo(from, marketAddress, value.neg(), event.block.timestamp.toI32());
  }

  // `to` user receives GM tokens
  if (to != ADDRESS_ZERO) {
    // LiquidityProviderIncentivesStat *should* be updated before UserMarketInfo
    saveLiquidityProviderIncentivesStat(to, marketAddress, "1w", value, event.block.timestamp.toI32());
    saveUserMarketInfo(to, marketAddress, value, event.block.timestamp.toI32());
  }
}

export function handleEventLog1(event: EventLog1): void {
  let eventName = event.params.eventName;
  let eventData = new EventData(event.params.eventData as EventLogEventDataStruct);
  let eventId = getIdFromEvent(event);

  if (eventName == "OraclePriceUpdate") {
    saveTokenPrice(
      eventData.getAddressItem("token")!,
      eventData.getUintItem("minPrice")!,
      eventData.getUintItem("maxPrice")!
    );
    return;
  }

  if (eventName == "MarketCreated") {
    saveMarketInfo(eventData);
    MarketTokenTemplate.create(eventData.getAddressItem("marketToken")!);
    return;
  }

  if (eventName == "DepositCreated") {
    handleDepositCreated(event, eventData);
    return;
  }

  if (eventName == "DepositExecuted") {
    handleDepositExecuted(event, eventData);
    return;
  }

  if (eventName == "WithdrawalCreated") {
    let transaction = getOrCreateTransaction(event);
    let account = eventData.getAddressItemString("account")!;
    saveUserStat("withdrawal", account, transaction.timestamp);
    return;
  }

  if (eventName == "OrderExecuted") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderExecutedState(eventData, transaction);

    if (order == null) {
      return;
    }

    if (order.orderType == orderTypes.get("MarketSwap") || order.orderType == orderTypes.get("LimitSwap")) {
      saveSwapExecutedTradeAction(eventId, order as Order, transaction);
    } else if (
      order.orderType == orderTypes.get("MarketIncrease") ||
      order.orderType == orderTypes.get("LimitIncrease")
    ) {
      savePositionIncreaseExecutedTradeAction(eventId, order as Order, transaction);
    } else if (
      order.orderType == orderTypes.get("MarketDecrease") ||
      order.orderType == orderTypes.get("LimitDecrease") ||
      order.orderType == orderTypes.get("StopLossDecrease") ||
      order.orderType == orderTypes.get("Liquidation")
    ) {
      savePositionDecreaseExecutedTradeAction(eventId, order as Order, transaction);
    }
    return;
  }

  if (eventName == "OrderCancelled") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderCancelledState(eventData, transaction);
    if (order !== null) {
      saveOrderCancelledTradeAction(
        eventId,
        order as Order,
        order.cancelledReason as string,
        order.cancelledReasonBytes as Bytes,
        transaction
      );
    }

    return;
  }

  if (eventName == "OrderUpdated") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderUpdate(eventData);
    if (order !== null) {
      saveOrderUpdatedTradeAction(eventId, order as Order, transaction);
    }

    return;
  }

  if (eventName == "OrderFrozen") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderFrozenState(eventData);

    if (order == null) {
      return;
    }

    saveOrderFrozenTradeAction(
      eventId,
      order as Order,
      order.frozenReason as string,
      order.frozenReasonBytes as Bytes,
      transaction
    );
    return;
  }

  if (eventName == "OrderSizeDeltaAutoUpdated") {
    saveOrderSizeDeltaAutoUpdate(eventData);
    return;
  }

  if (eventName == "OrderCollateralDeltaAmountAutoUpdated") {
    saveOrderCollateralAutoUpdate(eventData);
    return;
  }

  if (eventName == "SwapInfo") {
    let transaction = getOrCreateTransaction(event);
    let tokenIn = eventData.getAddressItemString("tokenIn")!;
    let tokenOut = eventData.getAddressItemString("tokenOut")!;
    let amountIn = eventData.getUintItem("amountIn")!;
    let tokenInPrice = eventData.getUintItem("tokenInPrice")!;
    let volumeUsd = amountIn!.times(tokenInPrice!);
    let receiver = eventData.getAddressItemString("receiver")!;

    saveSwapInfo(eventData, transaction);
    saveSwapVolumeInfo(transaction.timestamp, tokenIn, tokenOut, volumeUsd);
    saveUserStat("swap", receiver, transaction.timestamp);
    return;
  }

  if (eventName == "SwapFeesCollected") {
    let transaction = getOrCreateTransaction(event);
    let swapFeesInfo = saveSwapFeesInfo(eventData, eventId, transaction);
    let tokenPrice = eventData.getUintItem("tokenPrice")!;
    let feeReceiverAmount = eventData.getUintItem("feeReceiverAmount")!;
    let feeAmountForPool = eventData.getUintItem("feeAmountForPool")!;
    let amountAfterFees = eventData.getUintItem("amountAfterFees")!;
    let action = getSwapActionByFeeType(swapFeesInfo.swapFeeType);
    let totalAmountIn = amountAfterFees.plus(feeAmountForPool).plus(feeReceiverAmount);
    let volumeUsd = totalAmountIn.times(tokenPrice);

    let totalFees = saveCollectedMarketFeesTotal(
      swapFeesInfo.marketAddress,
      swapFeesInfo.tokenAddress,
      swapFeesInfo.feeAmountForPool,
      swapFeesInfo.feeUsdForPool,
      transaction.timestamp
    );
    saveCollectedMarketFeesForPeriod(
      swapFeesInfo.marketAddress,
      swapFeesInfo.tokenAddress,
      swapFeesInfo.feeAmountForPool,
      swapFeesInfo.feeUsdForPool,
      totalFees,
      "1h",
      transaction.timestamp
    );
    saveCollectedMarketFeesForPeriod(
      swapFeesInfo.marketAddress,
      swapFeesInfo.tokenAddress,
      swapFeesInfo.feeAmountForPool,
      swapFeesInfo.feeUsdForPool,
      totalFees,
      "1d",
      transaction.timestamp
    );
    saveVolumeInfo(action, transaction.timestamp, volumeUsd);
    saveSwapFeesInfoWithPeriod(feeAmountForPool, feeReceiverAmount, tokenPrice, transaction.timestamp);
    return;
  }

  // Only for liquidations if remaining collateral is not sufficient to pay the fees
  if (eventName == "PositionFeesInfo") {
    let transaction = getOrCreateTransaction(event);
    savePositionFeesInfo(eventData, "PositionFeesInfo", transaction);

    return;
  }

  if (eventName == "PositionFeesCollected") {
    let transaction = getOrCreateTransaction(event);
    let positionFeeAmount = eventData.getUintItem("positionFeeAmount")!;
    let positionFeeAmountForPool = eventData.getUintItem("positionFeeAmountForPool")!;
    let collateralTokenPriceMin = eventData.getUintItem("collateralTokenPrice.min")!;
    let borrowingFeeUsd = eventData.getUintItem("borrowingFeeUsd")!;

    let positionFeesInfo = savePositionFeesInfo(eventData, "PositionFeesCollected", transaction);
    let totalFees = saveCollectedMarketFeesTotal(
      positionFeesInfo.marketAddress,
      positionFeesInfo.collateralTokenAddress,
      positionFeesInfo.feeAmountForPool,
      positionFeesInfo.feeUsdForPool,
      transaction.timestamp
    );
    saveCollectedMarketFeesForPeriod(
      positionFeesInfo.marketAddress,
      positionFeesInfo.collateralTokenAddress,
      positionFeesInfo.feeAmountForPool,
      positionFeesInfo.feeUsdForPool,
      totalFees,
      "1h",
      transaction.timestamp
    );
    saveCollectedMarketFeesForPeriod(
      positionFeesInfo.marketAddress,
      positionFeesInfo.collateralTokenAddress,
      positionFeesInfo.feeAmountForPool,
      positionFeesInfo.feeUsdForPool,
      totalFees,
      "1d",
      transaction.timestamp
    );
    savePositionFeesInfoWithPeriod(
      positionFeeAmount,
      positionFeeAmountForPool,
      borrowingFeeUsd,
      collateralTokenPriceMin,
      transaction.timestamp
    );
    return;
  }

  if (eventName == "PositionIncrease") {
    let transaction = getOrCreateTransaction(event);
    let collateralToken = eventData.getAddressItemString("collateralToken")!;
    let marketToken = eventData.getAddressItemString("market")!;
    let sizeDeltaUsd = eventData.getUintItem("sizeDeltaUsd")!;
    let account = eventData.getAddressItemString("account")!;

    savePositionIncrease(eventData, transaction);
    saveVolumeInfo("margin", transaction.timestamp, sizeDeltaUsd);
    savePositionVolumeInfo(transaction.timestamp, collateralToken, marketToken, sizeDeltaUsd);
    saveUserStat("margin", account, transaction.timestamp);
    return;
  }

  if (eventName == "PositionDecrease") {
    let transaction = getOrCreateTransaction(event);
    let collateralToken = eventData.getAddressItemString("collateralToken")!;
    let marketToken = eventData.getAddressItemString("market")!;
    let sizeDeltaUsd = eventData.getUintItem("sizeDeltaUsd")!;
    let account = eventData.getAddressItemString("account")!;

    savePositionDecrease(eventData, transaction);
    saveVolumeInfo("margin", transaction.timestamp, sizeDeltaUsd);
    savePositionVolumeInfo(transaction.timestamp, collateralToken, marketToken, sizeDeltaUsd);
    saveUserStat("margin", account, transaction.timestamp);
    return;
  }

  if (eventName == "FundingFeesClaimed") {
    let transaction = getOrCreateTransaction(event);
    handleCollateralClaimAction("ClaimFunding", eventData, transaction);
    return;
  }

  if (eventName == "CollateralClaimed") {
    let transaction = getOrCreateTransaction(event);
    handleCollateralClaimAction("ClaimPriceImpactFee", eventData, transaction);
    return;
  }

  if (eventName == "ClaimableFundingUpdated") {
    let transaction = getOrCreateTransaction(event);
    handleClaimableFundingUpdated(eventData, transaction);
    return;
  }

  if (eventName == "MarketPoolValueUpdated") {
    // `saveMarketIncentivesStat should be called before `MarketPoolInfo` entity is updated
    saveMarketIncentivesStat(eventData, event);

    saveMarketInfoTokensSupply(eventData);
    return;
  }
}

export function handleEventLog2(event: EventLog2): void {
  let eventName = event.params.eventName;
  let eventData = new EventData(event.params.eventData as EventLogEventDataStruct);
  let eventId = getIdFromEvent(event);

  if (eventName == "OrderCreated") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrder(eventData, transaction);
    if (isFundingFeeSettleOrder(order)) {
      saveClaimActionOnOrderCreated(transaction, eventData);
    } else {
      saveOrderCreatedTradeAction(eventId, order, transaction);
    }
    return;
  }

  if (eventName == "DepositCreated") {
    handleDepositCreated(event as EventLog1, eventData);
    return;
  }

  if (eventName == "DepositExecuted") {
    handleDepositExecuted(event as EventLog1, eventData);
    return;
  }

  if (eventName == "WithdrawalCreated") {
    let transaction = getOrCreateTransaction(event);
    let account = eventData.getAddressItemString("account")!;
    saveUserStat("withdrawal", account, transaction.timestamp);
    return;
  }

  if (eventName == "OrderExecuted") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderExecutedState(eventData, transaction);

    if (order == null) {
      return;
    }

    if (order.orderType == orderTypes.get("MarketSwap") || order.orderType == orderTypes.get("LimitSwap")) {
      saveSwapExecutedTradeAction(eventId, order as Order, transaction);
    } else if (
      order.orderType == orderTypes.get("MarketIncrease") ||
      order.orderType == orderTypes.get("LimitIncrease")
    ) {
      savePositionIncreaseExecutedTradeAction(eventId, order as Order, transaction);
    } else if (
      order.orderType == orderTypes.get("MarketDecrease") ||
      order.orderType == orderTypes.get("LimitDecrease") ||
      order.orderType == orderTypes.get("StopLossDecrease") ||
      order.orderType == orderTypes.get("Liquidation")
    ) {
      if (ClaimRef.load(order.id)) {
        saveClaimActionOnOrderExecuted(transaction, eventData);
      } else {
        savePositionDecreaseExecutedTradeAction(eventId, order as Order, transaction);
      }
    }
    return;
  }

  if (eventName == "OrderCancelled") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderCancelledState(eventData, transaction);
    if (order !== null) {
      if (ClaimRef.load(order.id)) {
        saveClaimActionOnOrderCancelled(transaction, eventData);
      } else {
        saveOrderCancelledTradeAction(
          eventId,
          order!,
          order.cancelledReason as string,
          order.cancelledReasonBytes as Bytes,
          transaction
        );
      }
    }

    return;
  }

  if (eventName == "OrderUpdated") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderUpdate(eventData);
    if (order !== null) {
      saveOrderUpdatedTradeAction(eventId, order as Order, transaction);
    }

    return;
  }

  if (eventName == "OrderFrozen") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderFrozenState(eventData);

    if (order == null) {
      return;
    }

    saveOrderFrozenTradeAction(
      eventId,
      order as Order,
      order.frozenReason as string,
      order.frozenReasonBytes as Bytes,
      transaction
    );
    return;
  }
}

function handleDepositCreated(event: EventLog1, eventData: EventData): void {
  let transaction = getOrCreateTransaction(event);
  let account = eventData.getAddressItemString("account")!;
  saveUserStat("deposit", account, transaction.timestamp);

  let depositRef = new DepositRef(eventData.getBytes32Item("key")!.toHexString());
  depositRef.marketAddress = eventData.getBytes32Item("market")!.toHexString();
  depositRef.save();
}

function handleDepositExecuted(event: EventLog1, eventData: EventData): void {
  let depositRef = DepositRef.load(eventData.getBytes32Item("key")!.toHexString())!;
  let marketInfo = MarketInfo.load(depositRef.marketAddress)!;

  let longTokenAmount = eventData.getUintItem("longTokenAmount")!;
  let longTokenPrice = TokenPrice.load(marketInfo.longToken)!;
  let shortTokenAmount = eventData.getUintItem("shortTokenAmount")!;
  let shortTokenPrice = TokenPrice.load(marketInfo.shortToken)!;

  let depositUsd = longTokenAmount.times(longTokenPrice.min).plus(shortTokenAmount.times(shortTokenPrice.min));
  saveUserGlpGmMigrationStatGmData(
    eventData.getAddressItemString("account")!,
    event.block.timestamp.toI32(),
    depositUsd
  );
}
