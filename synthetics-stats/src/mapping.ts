import { Address, Bytes, log } from "@graphprotocol/graph-ts";

import { BatchSend } from "../generated/BatchSender/BatchSender";
import { EventLog, EventLog1, EventLog2, EventLogEventDataStruct } from "../generated/EventEmitter/EventEmitter";
import { RemoveLiquidity } from "../generated/GlpManager/GlpManager";
import { ClaimRef, DepositRef, MarketInfo, Order, SellUSDG } from "../generated/schema";
import { GlvTokenTemplate, MarketTokenTemplate } from "../generated/templates";
import { Transfer } from "../generated/templates/MarketTokenTemplate/MarketToken";
import { SellUSDG as SellUSDGEvent } from "../generated/Vault/Vault";

import { getMarketPoolValueFromContract } from "./contracts/getMarketPoolValueFromContract";
import { getMarketTokensSupplyFromContract } from "./contracts/getMarketTokensSupplyFromContract";
import {
  saveClaimableFundingFeeInfo as handleClaimableFundingUpdated,
  handleCollateralClaimAction,
  isFundingFeeSettleOrder,
  saveClaimActionOnOrderCancelled,
  saveClaimActionOnOrderCreated,
  saveClaimActionOnOrderExecuted
} from "./entities/claims";
import { getIdFromEvent, getOrCreateTransaction } from "./entities/common";
import { saveDistribution } from "./entities/distributions";
import {
  getSwapActionByFeeType,
  handlePositionImpactPoolDistributed,
  saveCollectedMarketFees,
  savePositionFeesInfo,
  savePositionFeesInfoWithPeriod,
  saveSwapFeesInfo,
  saveSwapFeesInfoWithPeriod
} from "./entities/fees";
import {
  saveLiquidityProviderIncentivesStat,
  saveLiquidityProviderInfo,
  saveMarketIncentivesStat,
  saveUserGlpGmMigrationStatGlpData,
  saveUserGlpGmMigrationStatGmData
} from "./entities/incentives/liquidityIncentives";
import { saveTradingIncentivesStat } from "./entities/incentives/tradingIncentives";
import {
  getMarketInfo,
  saveMarketInfo,
  saveMarketInfoMarketTokensSupplyFromPoolUpdated,
  saveMarketInfoTokensSupply
} from "./entities/markets";
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
import {
  handleClaimableCollateralUpdated,
  handleCollateralClaimed,
  handleSetClaimableCollateralFactorForAccount,
  handleSetClaimableCollateralFactorForTime
} from "./entities/priceImpactRebate";
import { getTokenPrice, handleOraclePriceUpdate } from "./entities/prices";
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
import { saveUserStat } from "./entities/user";
import { saveUserGmTokensBalanceChange } from "./entities/userBalance";
import { savePositionVolumeInfo, saveSwapVolumeInfo, saveVolumeInfo } from "./entities/volume";
import { EventData } from "./utils/eventData";

let ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
let SELL_USDG_ID = "last";

export function handleSellUSDG(event: SellUSDGEvent): void {
  let sellUsdgEntity = new SellUSDG(SELL_USDG_ID);
  sellUsdgEntity.txHash = event.transaction.hash.toHexString();
  sellUsdgEntity.logIndex = event.logIndex.toI32();
  sellUsdgEntity.feeBasisPoints = event.params.feeBasisPoints;
  sellUsdgEntity.save();
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
  let sellUsdgEntity = SellUSDG.load(SELL_USDG_ID);

  if (sellUsdgEntity == null) {
    log.error("No SellUSDG entity tx: {}", [event.transaction.hash.toHexString()]);
    throw new Error("No SellUSDG entity");
  }

  if (sellUsdgEntity.txHash != event.transaction.hash.toHexString()) {
    log.error("SellUSDG entity tx hashes don't match: expected {} actual {}", [
      event.transaction.hash.toHexString(),
      sellUsdgEntity.txHash
    ]);
    throw new Error("SellUSDG entity tx hashes don't match");
  }

  let expectedLogIndex = event.logIndex.toI32() - 1;
  if (sellUsdgEntity.logIndex != expectedLogIndex) {
    log.error("SellUSDG entity incorrect log index: expected {} got {}", [
      expectedLogIndex.toString(),
      (sellUsdgEntity.logIndex as number).toString()
    ]);
    throw new Error("SellUSDG entity tx hashes don't match");
  }

  saveUserGlpGmMigrationStatGlpData(
    event.params.account.toHexString(),
    event.block.timestamp.toI32(),
    event.params.usdgAmount,
    sellUsdgEntity.feeBasisPoints
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

export function handleGlvTokenTransfer(event: Transfer): void {
  let glvAddress = event.address.toHexString();
  let from = event.params.from.toHexString();
  let to = event.params.to.toHexString();
  let value = event.params.value;

  // `from` user redeems or transfers out GLV tokens
  if (from != ADDRESS_ZERO) {
    // LiquidityProviderIncentivesStat *should* be updated before LiquidityProviderInfo
    saveLiquidityProviderIncentivesStat(from, glvAddress, "Glv", "1w", value.neg(), event.block.timestamp.toI32());
    saveLiquidityProviderInfo(from, glvAddress, "Glv", value.neg());
  }

  // `to` user receives GLV tokens
  if (to != ADDRESS_ZERO) {
    saveLiquidityProviderIncentivesStat(to, glvAddress, "Glv", "1w", value, event.block.timestamp.toI32());
    saveLiquidityProviderInfo(to, glvAddress, "Glv", value);
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
    saveLiquidityProviderIncentivesStat(
      from,
      marketAddress,
      "Market",
      "1w",
      value.neg(),
      event.block.timestamp.toI32()
    );
    saveLiquidityProviderInfo(from, marketAddress, "Market", value.neg());
    let transaction = getOrCreateTransaction(event);
    saveUserGmTokensBalanceChange(from, marketAddress, value.neg(), transaction, event.logIndex);
  }

  // `to` user receives GM tokens
  if (to != ADDRESS_ZERO) {
    // LiquidityProviderIncentivesStat *should* be updated before LiquidityProviderInfo
    saveLiquidityProviderIncentivesStat(to, marketAddress, "Market", "1w", value, event.block.timestamp.toI32());
    saveLiquidityProviderInfo(to, marketAddress, "Market", value);
    let transaction = getOrCreateTransaction(event);
    saveUserGmTokensBalanceChange(to, marketAddress, value, transaction, event.logIndex);
  }

  if (from == ADDRESS_ZERO) {
    saveMarketInfoTokensSupply(marketAddress, value);
  }

  if (to == ADDRESS_ZERO) {
    saveMarketInfoTokensSupply(marketAddress, value.neg());
  }
}

export function handleEventLog(event: EventLog): void {
  let eventName = event.params.eventName;
  let eventData = new EventData(event.params.eventData as EventLogEventDataStruct);

  if (eventName == "DepositExecuted") {
    handleDepositExecuted(event as EventLog2, eventData);
    return;
  }
}

function handleEventLog1(event: EventLog1, network: string): void {
  let eventName = event.params.eventName;
  let eventData = new EventData(event.params.eventData as EventLogEventDataStruct);
  let eventId = getIdFromEvent(event);

  if (eventName == "MarketCreated") {
    saveMarketInfo(eventData);
    MarketTokenTemplate.create(eventData.getAddressItem("marketToken")!);
    return;
  }

  if (eventName == "GlvCreated") {
    // saveMarketInfo(eventData);
    log.warning("block number: {} tx hash: {}", [
      event.block.number.toHexString(),
      event.transaction.hash.toHexString()
    ]);
    let glvToken = eventData.getAddressItem("glvToken");
    if (!glvToken) {
      // for fuji
      glvToken = eventData.getAddressItem("glv")!;
    }
    log.warning("glv token: {}", [glvToken ? glvToken.toHexString() : "undefined"]);
    GlvTokenTemplate.create(glvToken as Address);
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
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderExecutedState(eventData, transaction);

    if (order == null) {
      return;
    }

    if (order.orderType == orderTypes.get("MarketSwap") || order.orderType == orderTypes.get("LimitSwap")) {
      saveSwapExecutedTradeAction(eventId, order as Order, transaction);
    } else if (
      order.orderType == orderTypes.get("MarketIncrease") ||
      order.orderType == orderTypes.get("LimitIncrease") ||
      order.orderType == orderTypes.get("StopIncrease")
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

    let orderKey = eventData.getBytes32Item("orderKey")!.toHexString();
    if (orderKey != "0x0000000000000000000000000000000000000000000000000000000000000000") {
      saveUserStat("swap", receiver, transaction.timestamp);
    }
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
    let poolValue = getMarketPoolValueFromContract(swapFeesInfo.marketAddress, network, transaction);
    // only deposits and withdrawals affect marketTokensSupply, for others we may use cached value
    // be aware: getMarketTokensSupplyFromContract returns value by block number, i.e. latest value in block
    let marketTokensSupply = isDepositOrWithdrawalAction(action)
      ? getMarketTokensSupplyFromContract(swapFeesInfo.marketAddress)
      : getMarketInfo(swapFeesInfo.marketAddress).marketTokensSupply;

    saveCollectedMarketFees(
      transaction,
      swapFeesInfo.marketAddress,
      poolValue,
      swapFeesInfo.feeUsdForPool,
      marketTokensSupply
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
    let liquidationFeeAmount = eventData.getUintItem("liquidationFeeAmount")!;
    let borrowingFeeUsd = eventData.getUintItem("borrowingFeeUsd")!;
    let positionFeesInfo = savePositionFeesInfo(eventData, "PositionFeesCollected", transaction);
    let poolValue = getMarketPoolValueFromContract(positionFeesInfo.marketAddress, network, transaction);
    let marketInfo = getMarketInfo(positionFeesInfo.marketAddress);

    saveCollectedMarketFees(
      transaction,
      positionFeesInfo.marketAddress,
      poolValue,
      positionFeesInfo.feeUsdForPool,
      marketInfo.marketTokensSupply
    );
    savePositionFeesInfoWithPeriod(
      positionFeeAmount,
      positionFeeAmountForPool,
      liquidationFeeAmount,
      borrowingFeeUsd,
      collateralTokenPriceMin,
      transaction.timestamp
    );

    saveTradingIncentivesStat(
      eventData.getAddressItemString("trader")!,
      event.block.timestamp.toI32(),
      positionFeeAmount,
      collateralTokenPriceMin
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
    handleCollateralClaimAction("ClaimPriceImpact", eventData, transaction);
    handleCollateralClaimed(eventData);
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
    saveMarketInfoMarketTokensSupplyFromPoolUpdated(
      eventData.getAddressItemString("market")!,
      eventData.getUintItem("marketTokensSupply")
    );
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

  if (eventName == "ClaimableCollateralUpdated") {
    handleClaimableCollateralUpdated(eventData);
    return;
  }
}

function handleEventLog2(event: EventLog2, network: string): void {
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

  if (eventName == "SetClaimableCollateralFactorForTime") {
    handleSetClaimableCollateralFactorForTime(eventData);
    return;
  }

  if (eventName == "SetClaimableCollateralFactorForAccount") {
    handleSetClaimableCollateralFactorForAccount(eventData);
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
      order.orderType == orderTypes.get("LimitIncrease") ||
      order.orderType == orderTypes.get("StopIncrease")
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

function isDepositOrWithdrawalAction(action: string): boolean {
  return action == "deposit" || action == "withdrawal";
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

export function handleEventLog1Botanix(event: EventLog1): void {
  handleEventLog1(event, "botanix");
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

export function handleEventLog2Botanix(event: EventLog2): void {
  handleEventLog2(event, "botanix");
}
