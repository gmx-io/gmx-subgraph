import { Bytes } from "@graphprotocol/graph-ts";

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
} from "./entities/incentives/liquidityIncentives";
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
import { Ctx, createCtxFromEvent } from "./utils/eventData";

let ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

export function handleSellUSDG(event: SellUSDG): void {
  saveUserGlpGmMigrationStatGlpData(
    event.params.account.toHexString(),
    event.block.timestamp.toI32(),
    event.params.usdgAmount,
    event.params.feeBasisPoints
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
    saveUserGmTokensBalanceChange(from, marketAddress, value.neg(), transaction, event.transactionLogIndex);
  }

  // `to` user receives GM tokens
  if (to != ADDRESS_ZERO) {
    // LiquidityProviderIncentivesStat *should* be updated before UserMarketInfo
    saveLiquidityProviderIncentivesStat(to, marketAddress, "1w", value, event.block.timestamp.toI32());
    saveUserMarketInfo(to, marketAddress, value);
    let transaction = getOrCreateTransaction(event);
    saveUserGmTokensBalanceChange(to, marketAddress, value, transaction, event.transactionLogIndex);
  }

  if (from == ADDRESS_ZERO) {
    saveMarketInfoTokensSupply(marketAddress, value);
  }

  if (to == ADDRESS_ZERO) {
    saveMarketInfoTokensSupply(marketAddress, value.neg());
  }
}

export function handleEventLog(event: EventLog, network: string): void {
  let ctx = createCtxFromEvent<EventLog>(event, network);

  if (ctx.eventName == "DepositExecuted") {
    handleDepositExecuted(event as EventLog2, ctx);
    return;
  }
}

function handleEventLog1(event: EventLog1, network: string): void {
  let ctx = createCtxFromEvent<EventLog1>(event, network);
  let eventName = ctx.eventName;
  let eventId = ctx.eventId;

  if (eventName == "MarketCreated") {
    saveMarketInfo(ctx);
    MarketTokenTemplate.create(ctx.getAddressItem("marketToken"));
    return;
  }

  if (eventName == "DepositCreated") {
    handleDepositCreated(event as EventLog2, ctx);
    return;
  }

  if (eventName == "WithdrawalCreated") {
    let transaction = getOrCreateTransaction(event);
    let account = ctx.getAddressItemString("account");
    saveUserStat("withdrawal", account, transaction.timestamp);
    return;
  }

  if (eventName == "OrderExecuted") {
    let order = saveOrderExecutedState(ctx);

    if (order == null) {
      return;
    }

    if (order.orderType == orderTypes.get("MarketSwap") || order.orderType == orderTypes.get("LimitSwap")) {
      saveSwapExecutedTradeAction(ctx, order as Order);
    } else if (
      order.orderType == orderTypes.get("MarketIncrease") ||
      order.orderType == orderTypes.get("LimitIncrease")
    ) {
      savePositionIncreaseExecutedTradeAction(ctx, order as Order);
    } else if (
      order.orderType == orderTypes.get("MarketDecrease") ||
      order.orderType == orderTypes.get("LimitDecrease") ||
      order.orderType == orderTypes.get("StopLossDecrease") ||
      order.orderType == orderTypes.get("Liquidation")
    ) {
      savePositionDecreaseExecutedTradeAction(ctx, order as Order);
    }
    return;
  }

  if (eventName == "OrderCancelled") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderCancelledState(ctx, transaction);
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
    let order = saveOrderUpdate(ctx);
    if (order !== null) {
      saveOrderUpdatedTradeAction(eventId, order as Order, transaction);
    }

    return;
  }

  if (eventName == "OrderFrozen") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderFrozenState(ctx);

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
    saveOrderSizeDeltaAutoUpdate(ctx);
    return;
  }

  if (eventName == "OrderCollateralDeltaAmountAutoUpdated") {
    saveOrderCollateralAutoUpdate(ctx);
    return;
  }

  if (eventName == "SwapInfo") {
    let transaction = getOrCreateTransaction(event);
    let tokenIn = ctx.getAddressItemString("tokenIn");
    let tokenOut = ctx.getAddressItemString("tokenOut");
    let amountIn = ctx.getUintItem("amountIn");
    let tokenInPrice = ctx.getUintItem("tokenInPrice");
    let volumeUsd = amountIn!.times(tokenInPrice!);
    let receiver = ctx.getAddressItemString("receiver");

    saveSwapInfo(ctx, transaction);
    saveSwapVolumeInfo(transaction.timestamp, tokenIn, tokenOut, volumeUsd);
    saveUserStat("swap", receiver, transaction.timestamp);
    return;
  }

  if (eventName == "SwapFeesCollected") {
    handleSwapFeesCollected(ctx);
    return;
  }

  // Only for liquidations if remaining collateral is not sufficient to pay the fees
  if (eventName == "PositionFeesInfo") {
    savePositionFeesInfo(ctx);
    return;
  }

  if (eventName == "PositionFeesCollected") {
    handlePositionFeesCollected(ctx);
    return;
  }

  if (eventName == "PositionIncrease") {
    let transaction = getOrCreateTransaction(event);
    let collateralToken = ctx.getAddressItemString("collateralToken");
    let marketToken = ctx.getAddressItemString("market");
    let sizeDeltaUsd = ctx.getUintItem("sizeDeltaUsd");
    let account = ctx.getAddressItemString("account");

    savePositionIncrease(ctx, transaction);
    saveVolumeInfo("margin", transaction.timestamp, sizeDeltaUsd);
    savePositionVolumeInfo(transaction.timestamp, collateralToken, marketToken, sizeDeltaUsd);
    saveUserStat("margin", account, transaction.timestamp);
    return;
  }

  if (eventName == "PositionDecrease") {
    let transaction = getOrCreateTransaction(event);
    let collateralToken = ctx.getAddressItemString("collateralToken");
    let marketToken = ctx.getAddressItemString("market");
    let sizeDeltaUsd = ctx.getUintItem("sizeDeltaUsd");
    let account = ctx.getAddressItemString("account");

    savePositionDecrease(ctx, transaction);
    saveVolumeInfo("margin", transaction.timestamp, sizeDeltaUsd);
    savePositionVolumeInfo(transaction.timestamp, collateralToken, marketToken, sizeDeltaUsd);
    saveUserStat("margin", account, transaction.timestamp);
    return;
  }

  if (eventName == "FundingFeesClaimed") {
    let transaction = getOrCreateTransaction(event);
    handleCollateralClaimAction("ClaimFunding", ctx, transaction);
    return;
  }

  if (eventName == "CollateralClaimed") {
    let transaction = getOrCreateTransaction(event);
    handleCollateralClaimAction("ClaimPriceImpactFee", ctx, transaction);
    return;
  }

  if (eventName == "ClaimableFundingUpdated") {
    let transaction = getOrCreateTransaction(event);
    handleClaimableFundingUpdated(ctx, transaction);
    return;
  }

  if (eventName == "MarketPoolValueUpdated") {
    // `saveMarketIncentivesStat should be called before `MarketPoolInfo` entity is updated
    saveMarketIncentivesStat(ctx, event);
    return;
  }

  if (eventName == "PositionImpactPoolDistributed") {
    let transaction = getOrCreateTransaction(event);
    handlePositionImpactPoolDistributed(ctx, transaction, network);
    return;
  }

  if (eventName == "OraclePriceUpdate") {
    handleOraclePriceUpdate(ctx);
    return;
  }
}

function handleEventLog2(event: EventLog2, network: string): void {
  let eventName = event.params.eventName;
  let ctx = createCtxFromEvent<EventLog2>(event, network);
  let eventId = getIdFromEvent(event);

  if (eventName == "OrderCreated") {
    handleOrderCreated(ctx);
    return;
  }

  if (eventName == "DepositCreated") {
    handleDepositCreated(event, ctx);
    return;
  }

  if (eventName == "DepositExecuted") {
    handleDepositExecuted(event, ctx);
    return;
  }

  if (eventName == "WithdrawalCreated") {
    let transaction = getOrCreateTransaction(event);
    let account = ctx.getAddressItemString("account");
    saveUserStat("withdrawal", account, transaction.timestamp);
    return;
  }

  if (eventName == "OrderExecuted") {
    handleOrderExecuted(ctx);
    return;
  }

  if (eventName == "OrderCancelled") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderCancelledState(ctx, transaction);
    if (order !== null) {
      if (ClaimRef.load(order.id)) {
        saveClaimActionOnOrderCancelled(ctx);
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
    let order = saveOrderUpdate(ctx);
    if (order !== null) {
      saveOrderUpdatedTradeAction(eventId, order as Order, transaction);
    }

    return;
  }

  if (eventName == "OrderFrozen") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderFrozenState(ctx);

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

function handleDepositCreated(event: EventLog2, ctx: Ctx): void {
  let transaction = getOrCreateTransaction(event);
  let account = ctx.getAddressItemString("account");
  saveUserStat("deposit", account, transaction.timestamp);

  let depositRef = new DepositRef(ctx.getBytes32Item("key").toHexString());
  depositRef.marketAddress = ctx.getAddressItemString("market");

  // old DepositCreated event does not contain "account"
  depositRef.account = ctx.getAddressItemString("account");
  depositRef.save();
}

function handleDepositExecuted(event: EventLog2, ctx: Ctx): void {
  let key = ctx.getBytes32Item("key").toHexString();
  let depositRef = DepositRef.load(key)!;
  let marketInfo = MarketInfo.load(depositRef.marketAddress)!;

  let longTokenAmount = ctx.getUintItem("longTokenAmount");
  let longTokenPrice = getTokenPrice(marketInfo.longToken)!;

  let shortTokenAmount = ctx.getUintItem("shortTokenAmount");
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
