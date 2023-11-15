import { BigInt, Bytes, log } from "@graphprotocol/graph-ts";

import { BatchSend } from "../generated/BatchSender/BatchSender";
import { EventLog, EventLog1, EventLog2 } from "../generated/EventEmitter/EventEmitter";
import { SellUSDG } from "../generated/Vault/Vault";
import { ClaimRef, DepositRef, MarketInfo, Order } from "../generated/schema";
import { MarketTokenTemplate } from "../generated/templates";
import { Transfer } from "../generated/templates/MarketTokenTemplate/MarketToken";

import {
  saveClaimableFundingFeeInfo as handleClaimableFundingUpdated,
  handleCollateralClaimAction,
  saveClaimActionOnOrderCancelled
} from "./entities/claims";
import { getIdFromEvent, getOrCreateTransaction } from "./entities/common";
import { saveDistribution } from "./entities/distributions";
import { handlePositionImpactPoolDistributed, savePositionFeesInfo } from "./entities/fees";
import {
  saveLiquidityProviderIncentivesStat,
  saveMarketIncentivesStat,
  saveUserGlpGmMigrationStatGlpData,
  saveUserGlpGmMigrationStatGmData,
  saveUserMarketInfo
} from "./entities/incentives";
import { saveMarketInfo, saveMarketInfoTokensSupply } from "./entities/markets";
import {
  orderTypes,
  saveOrderCancelledState,
  saveOrderCollateralAutoUpdate,
  saveOrderExecutedState,
  saveOrderFrozenState,
  saveOrderSizeDeltaAutoUpdate,
  saveOrderUpdate
} from "./entities/orders";
import { savePositionDecrease, savePositionIncrease } from "./entities/positions";
import { getTokenPrice, handleOraclePriceUpdate } from "./entities/prices";
import { handleSwapInfo as saveSwapInfo } from "./entities/swaps";
import {
  saveOrderCancelledTradeAction,
  saveOrderFrozenTradeAction,
  saveOrderUpdatedTradeAction,
  savePositionDecreaseExecutedTradeAction,
  savePositionIncreaseExecutedTradeAction,
  saveSwapExecutedTradeAction
} from "./entities/trades";
import { saveUserStat } from "./entities/user";
import { saveUserGmTokensBalanceChange } from "./entities/userBalance";
import { savePositionVolumeInfo, saveSwapVolumeInfo, saveVolumeInfo } from "./entities/volume";
import { handlePositionFeesCollected, handleSwapFeesCollected } from "./handlers/feesHandlers";
import { handleOrderCreated, handleOrderExecuted } from "./handlers/ordersHandlers";
import { EventData, createEventDataFromEvent } from "./utils/eventData";
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
    saveUserMarketInfo(from, marketAddress, value.neg());
    let transaction = getOrCreateTransaction(event);
    saveUserGmTokensBalanceChange(from, marketAddress, value.neg(), transaction);
  }

  // `to` user receives GM tokens
  if (to != ADDRESS_ZERO) {
    // LiquidityProviderIncentivesStat *should* be updated before UserMarketInfo
    saveLiquidityProviderIncentivesStat(to, marketAddress, "1w", value, event.block.timestamp.toI32());
    saveUserMarketInfo(to, marketAddress, value);
    let transaction = getOrCreateTransaction(event);
    saveUserGmTokensBalanceChange(to, marketAddress, value, transaction);
  }

  if (from == ADDRESS_ZERO) {
    saveMarketInfoTokensSupply(marketAddress, value);
  }

  if (to == ADDRESS_ZERO) {
    saveMarketInfoTokensSupply(marketAddress, value.neg());
  }
}

export function handleEventLog(event: EventLog, network: string): void {
  let eventData = createEventDataFromEvent<EventLog>(event, network);

  if (eventData.eventName == "DepositExecuted") {
    handleDepositExecuted(event as EventLog2, eventData);
    return;
  }
}

function handleEventLog1(event: EventLog1, network: string): void {
  let eventData = createEventDataFromEvent<EventLog1>(event, network);
  let eventName = eventData.eventName;
  let eventId = eventData.eventId;

  if (eventName == "MarketCreated") {
    saveMarketInfo(eventData);
    MarketTokenTemplate.create(eventData.getAddressItem("marketToken")!);
    return;
  }

  if (eventName == "DepositCreated") {
    handleDepositCreated(event as EventLog2, eventData);
    return;
  }

  if (eventName == "WithdrawalCreated") {
    let transaction = getOrCreateTransaction(event);
    let account = eventData.getAddressItemString("account")!;
    saveUserStat("withdrawal", account, transaction.timestamp);
    return;
  }

  if (eventName == "OrderExecuted") {
    let order = saveOrderExecutedState(eventData);

    if (order == null) {
      return;
    }

    if (order.orderType == orderTypes.get("MarketSwap") || order.orderType == orderTypes.get("LimitSwap")) {
      saveSwapExecutedTradeAction(eventData, order as Order);
    } else if (
      order.orderType == orderTypes.get("MarketIncrease") ||
      order.orderType == orderTypes.get("LimitIncrease")
    ) {
      savePositionIncreaseExecutedTradeAction(eventData, order as Order);
    } else if (
      order.orderType == orderTypes.get("MarketDecrease") ||
      order.orderType == orderTypes.get("LimitDecrease") ||
      order.orderType == orderTypes.get("StopLossDecrease") ||
      order.orderType == orderTypes.get("Liquidation")
    ) {
      savePositionDecreaseExecutedTradeAction(eventData, order as Order);
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
    handleSwapFeesCollected(eventData);
    return;
  }

  // Only for liquidations if remaining collateral is not sufficient to pay the fees
  if (eventName == "PositionFeesInfo") {
    savePositionFeesInfo(eventData);
    return;
  }

  if (eventName == "PositionFeesCollected") {
    handlePositionFeesCollected(eventData);
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
    return;
  }

  if (eventName == "PositionImpactPoolDistributed") {
    let transaction = getOrCreateTransaction(event);
    handlePositionImpactPoolDistributed(eventData, transaction, network);
    return;
  }

  if (eventName == "OraclePriceUpdate") {
    handleOraclePriceUpdate(eventData);
    return;
  }
}

function handleEventLog2(event: EventLog2, network: string): void {
  let eventName = event.params.eventName;
  let eventData = createEventDataFromEvent<EventLog2>(event, network);
  let eventId = getIdFromEvent(event);

  if (eventName == "OrderCreated") {
    handleOrderCreated(eventData);
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
    handleOrderExecuted(eventData);
    return;
  }

  if (eventName == "OrderCancelled") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderCancelledState(eventData, transaction);
    if (order !== null) {
      if (ClaimRef.load(order.id)) {
        saveClaimActionOnOrderCancelled(eventData);
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

function handleDepositCreated(event: EventLog2, eventData: EventData): void {
  let transaction = getOrCreateTransaction(event);
  let account = eventData.getAddressItemString("account")!;
  saveUserStat("deposit", account, transaction.timestamp);

  let depositRef = new DepositRef(eventData.getBytes32Item("key")!.toHexString());
  depositRef.marketAddress = eventData.getAddressItemString("market")!;

  // old DepositCreated event does not contain "account"
  depositRef.account = eventData.getAddressItemString("account")!;
  depositRef.save();
}

function handleDepositExecuted(event: EventLog2, eventData: EventData): void {
  let key = eventData.getBytes32Item("key")!.toHexString();
  let depositRef = DepositRef.load(key)!;
  let marketInfo = MarketInfo.load(depositRef.marketAddress)!;

  let longTokenAmount = eventData.getUintItem("longTokenAmount")!;
  let longTokenPrice = getTokenPrice(marketInfo.longToken)!;

  let shortTokenAmount = eventData.getUintItem("shortTokenAmount")!;
  let shortTokenPrice = getTokenPrice(marketInfo.shortToken)!;

  let depositUsd = longTokenAmount.times(longTokenPrice).plus(shortTokenAmount.times(shortTokenPrice));
  saveUserGlpGmMigrationStatGmData(depositRef.account, event.block.timestamp.toI32(), depositUsd);
}

export function handleEventLogArbitrum(event: EventLog): void {
  handleEventLog(event, "arbitrum");
}

export function handleEventLogGoerli(event: EventLog): void {
  handleEventLog(event, "goerli");
}

export function handleEventLogAvalanche(event: EventLog): void {
  handleEventLog(event, "avalanche");
}

export function handleEventLogFuji(event: EventLog): void {
  handleEventLog(event, "fuji");
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
