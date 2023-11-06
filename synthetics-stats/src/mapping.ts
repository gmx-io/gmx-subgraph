import { Bytes } from "@graphprotocol/graph-ts";
import {
  EventLog1,
  EventLog2,
  EventLogEventDataStruct,
} from "../generated/EventEmitter/EventEmitter";
import { ClaimAction, ClaimRef, Order } from "../generated/schema";
import {
  saveClaimActionOnOrderCreated,
  saveClaimActionOnOrderExecuted,
  isFundingFeeSettleOrder,
  saveClaimableFundingFeeInfo as handleClaimableFundingUpdated,
  handleCollateralClaimAction,
  saveClaimActionOnOrderCancelled,
} from "./entities/claims";
import { getIdFromEvent, getOrCreateTransaction } from "./entities/common";
import {
  getSwapActionByFeeType,
  saveCollectedMarketFeesForPeriod,
  saveCollectedMarketFeesTotal,
  savePositionFeesInfo,
  savePositionFeesInfoWithPeriod,
  saveSwapFeesInfo,
  saveSwapFeesInfoWithPeriod,
} from "./entities/fees";
import { saveMarketInfo } from "./entities/markets";
import {
  orderTypes,
  saveOrder,
  saveOrderCancelledState,
  saveOrderCollateralAutoUpdate,
  saveOrderExecutedState,
  saveOrderFrozenState,
  saveOrderSizeDeltaAutoUpdate,
  saveOrderUpdate,
} from "./entities/orders";
import {
  savePositionDecrease,
  savePositionIncrease,
} from "./entities/positions";
import { handleSwapInfo as saveSwapInfo } from "./entities/swaps";
import {
  saveOrderCancelledTradeAction,
  saveOrderCreatedTradeAction,
  saveOrderFrozenTradeAction,
  saveOrderUpdatedTradeAction,
  savePositionDecreaseExecutedTradeAction,
  savePositionIncreaseExecutedTradeAction,
  saveSwapExecutedTradeAction,
} from "./entities/trades";
import { saveUserStat } from "./entities/user";
import {
  savePositionVolumeInfo,
  saveSwapVolumeInfo,
  saveVolumeInfo,
} from "./entities/volume";
import { EventData } from "./utils/eventData";
import { saveTokenPrice } from "./entities/prices";
import { getMarketPoolValueFromContract } from "./contracts/getMarketPoolValueFromContract";

function handleEventLog1(event: EventLog1, network: string): void {
  let eventName = event.params.eventName;
  let eventData = new EventData(
    event.params.eventData as EventLogEventDataStruct
  );
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
    return;
  }

  if (eventName == "DepositCreated") {
    let transaction = getOrCreateTransaction(event);
    let account = eventData.getAddressItemString("account")!;
    saveUserStat("deposit", account, transaction.timestamp);
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

    if (
      order.orderType == orderTypes.get("MarketSwap") ||
      order.orderType == orderTypes.get("LimitSwap")
    ) {
      saveSwapExecutedTradeAction(eventId, order as Order, transaction);
    } else if (
      order.orderType == orderTypes.get("MarketIncrease") ||
      order.orderType == orderTypes.get("LimitIncrease")
    ) {
      savePositionIncreaseExecutedTradeAction(
        eventId,
        order as Order,
        transaction
      );
    } else if (
      order.orderType == orderTypes.get("MarketDecrease") ||
      order.orderType == orderTypes.get("LimitDecrease") ||
      order.orderType == orderTypes.get("StopLossDecrease") ||
      order.orderType == orderTypes.get("Liquidation")
    ) {
      savePositionDecreaseExecutedTradeAction(
        eventId,
        order as Order,
        transaction
      );
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
    let totalAmountIn = amountAfterFees
      .plus(feeAmountForPool)
      .plus(feeReceiverAmount);
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
    saveSwapFeesInfoWithPeriod(
      feeAmountForPool,
      feeReceiverAmount,
      tokenPrice,
      transaction.timestamp
    );
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
    let positionFeeAmountForPool = eventData.getUintItem(
      "positionFeeAmountForPool"
    )!;
    let collateralTokenPriceMin = eventData.getUintItem(
      "collateralTokenPrice.min"
    )!;
    let borrowingFeeUsd = eventData.getUintItem("borrowingFeeUsd")!;

    let positionFeesInfo = savePositionFeesInfo(
      eventData,
      "PositionFeesCollected",
      transaction
    );
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
    savePositionVolumeInfo(
      transaction.timestamp,
      collateralToken,
      marketToken,
      sizeDeltaUsd
    );
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
    savePositionVolumeInfo(
      transaction.timestamp,
      collateralToken,
      marketToken,
      sizeDeltaUsd
    );
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
}

function handleEventLog2(event: EventLog2, network: string): void {
  let eventName = event.params.eventName;
  let eventData = new EventData(
    event.params.eventData as EventLogEventDataStruct
  );
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
    let transaction = getOrCreateTransaction(event);
    let account = eventData.getAddressItemString("account")!;
    saveUserStat("deposit", account, transaction.timestamp);
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

    if (
      order.orderType == orderTypes.get("MarketSwap") ||
      order.orderType == orderTypes.get("LimitSwap")
    ) {
      saveSwapExecutedTradeAction(eventId, order as Order, transaction);
    } else if (
      order.orderType == orderTypes.get("MarketIncrease") ||
      order.orderType == orderTypes.get("LimitIncrease")
    ) {
      savePositionIncreaseExecutedTradeAction(
        eventId,
        order as Order,
        transaction
      );
    } else if (
      order.orderType == orderTypes.get("MarketDecrease") ||
      order.orderType == orderTypes.get("LimitDecrease") ||
      order.orderType == orderTypes.get("StopLossDecrease") ||
      order.orderType == orderTypes.get("Liquidation")
    ) {
      if (ClaimRef.load(order.id)) {
        saveClaimActionOnOrderExecuted(transaction, eventData);
      } else {
        savePositionDecreaseExecutedTradeAction(
          eventId,
          order as Order,
          transaction
        );
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

export function handleEventLog1Arbitrum(event: EventLog1): void {
  handleEventLog1(event, "arbitrum");
}

export function handleEventLog1Goerli(event: EventLog1): void {
  handleEventLog1(event, "goerli");
}

export function handleEventLog1Avalanche(event: EventLog1): void {
  handleEventLog1(event, "avalanche");
}

export function handleEventLog1Fuji(event: EventLog1): void {
  handleEventLog1(event, "fuji");
}

export function handleEventLog2Arbitrum(event: EventLog2): void {
  handleEventLog2(event, "arbitrum");
}

export function handleEventLog2Goerli(event: EventLog2): void {
  handleEventLog2(event, "goerli");
}

export function handleEventLog2Avalanche(event: EventLog2): void {
  handleEventLog2(event, "avalanche");
}

export function handleEventLog2Fuji(event: EventLog2): void {
  handleEventLog2(event, "fuji");
}
