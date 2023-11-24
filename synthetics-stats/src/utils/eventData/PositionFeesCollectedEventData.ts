import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Ctx } from "../eventData";

/*
EventLog1: PositionFeesCollected
  Data:
    market: 0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407 (address)
    collateralToken: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 (address)
    affiliate: 0x0000000000000000000000000000000000000000 (address)
    trader: 0xc9e1CE91d3f782499cFe787b6F1d2AF0Ca76C049 (address)
    uiFeeReceiver: 0x0000000000000000000000000000000000000000 (address)
    collateralTokenPrice.min: 999998000000000000000000 (uint)
    collateralTokenPrice.max: 1000113500000000000000000 (uint)
    tradeSizeUsd: 39959781418800000000000000000000 (uint)
    totalRebateFactor: 0 (uint)
    traderDiscountFactor: 0 (uint)
    totalRebateAmount: 0 (uint)
    traderDiscountAmount: 0 (uint)
    affiliateRewardAmount: 0 (uint)
    fundingFeeAmount: 0 (uint)
    claimableLongTokenAmount: 0 (uint)
    claimableShortTokenAmount: 0 (uint)
    latestFundingFeeAmountPerSize: 45272400790624412778 (uint)
    latestLongTokenClaimableFundingAmountPerSize: 111910292357229835945620543616 (uint)
    latestShortTokenClaimableFundingAmountPerSize: 888702023172452045 (uint)
    borrowingFeeUsd: 0 (uint)
    borrowingFeeAmount: 0 (uint)
    borrowingFeeReceiverFactor: 370000000000000000000000000000 (uint)
    borrowingFeeAmountForFeeReceiver: 0 (uint)
    positionFeeFactor: 500000000000000000000000000 (uint)
    protocolFeeAmount: 19979 (uint)
    positionFeeReceiverFactor: 370000000000000000000000000000 (uint)
    feeReceiverAmount: 7392 (uint)
    feeAmountForPool: 12587 (uint)
    positionFeeAmountForPool: 12587 (uint)
    positionFeeAmount: 19979 (uint)
    totalCostAmount: 19979 (uint)
    uiFeeReceiverFactor: 0 (uint)
    uiFeeAmount: 0 (uint)
    isIncrease: true (bool)
    orderKey: 0xfb49e4289ddeedcf650f009a3c93c4f4d678a63dd70f7a53d62f29683dd0d14b (bytes32)
    positionKey: 0x901ca6988ba47c81395e1301fe8bb8dfbeddabb54bfe75db251965e67fb34c1c (bytes32)
    referralCode: 0x0000000000000000000000000000000000000000000000000000000000000000 (bytes32)
*/

export class PositionFeesCollectedEventData {
  constructor(private ctx: Ctx) {}

  get market(): string {
    return this.ctx.getAddressItemString("market");
  }

  get collateralToken(): string {
    return this.ctx.getAddressItemString("collateralToken");
  }

  get affiliate(): string {
    return this.ctx.getAddressItemString("affiliate");
  }

  get trader(): string {
    return this.ctx.getAddressItemString("trader");
  }

  get uiFeeReceiver(): string {
    return this.ctx.getAddressItemString("uiFeeReceiver");
  }

  get collateralTokenPriceMin(): BigInt {
    return this.ctx.getUintItem("collateralTokenPrice.min");
  }

  get collateralTokenPriceMax(): BigInt {
    return this.ctx.getUintItem("collateralTokenPrice.max");
  }

  get tradeSizeUsd(): BigInt {
    return this.ctx.getUintItem("tradeSizeUsd");
  }

  get totalRebateFactor(): BigInt {
    return this.ctx.getUintItem("totalRebateFactor");
  }

  get traderDiscountFactor(): BigInt {
    return this.ctx.getUintItem("traderDiscountFactor");
  }

  get totalRebateAmount(): BigInt {
    return this.ctx.getUintItem("totalRebateAmount");
  }

  get traderDiscountAmount(): BigInt {
    return this.ctx.getUintItem("traderDiscountAmount");
  }

  get affiliateRewardAmount(): BigInt {
    return this.ctx.getUintItem("affiliateRewardAmount");
  }

  get fundingFeeAmount(): BigInt {
    return this.ctx.getUintItem("fundingFeeAmount");
  }

  get claimableLongTokenAmount(): BigInt {
    return this.ctx.getUintItem("claimableLongTokenAmount");
  }

  get claimableShortTokenAmount(): BigInt {
    return this.ctx.getUintItem("claimableShortTokenAmount");
  }

  get latestFundingFeeAmountPerSize(): BigInt {
    return this.ctx.getUintItem("latestFundingFeeAmountPerSize");
  }

  get latestLongTokenClaimableFundingAmountPerSize(): BigInt {
    return this.ctx.getUintItem("latestLongTokenClaimableFundingAmountPerSize");
  }

  get latestShortTokenClaimableFundingAmountPerSize(): BigInt {
    return this.ctx.getUintItem("latestShortTokenClaimableFundingAmountPerSize");
  }

  get borrowingFeeUsd(): BigInt {
    return this.ctx.getUintItem("borrowingFeeUsd");
  }

  get borrowingFeeAmount(): BigInt {
    return this.ctx.getUintItem("borrowingFeeAmount");
  }

  get borrowingFeeReceiverFactor(): BigInt {
    return this.ctx.getUintItem("borrowingFeeReceiverFactor");
  }

  get borrowingFeeAmountForFeeReceiver(): BigInt {
    return this.ctx.getUintItem("borrowingFeeAmountForFeeReceiver");
  }

  get positionFeeFactor(): BigInt {
    return this.ctx.getUintItem("positionFeeFactor");
  }

  get protocolFeeAmount(): BigInt {
    return this.ctx.getUintItem("protocolFeeAmount");
  }

  get positionFeeReceiverFactor(): BigInt {
    return this.ctx.getUintItem("positionFeeReceiverFactor");
  }

  get feeReceiverAmount(): BigInt {
    return this.ctx.getUintItem("feeReceiverAmount");
  }

  get feeAmountForPool(): BigInt {
    return this.ctx.getUintItem("feeAmountForPool");
  }

  get positionFeeAmountForPool(): BigInt {
    return this.ctx.getUintItem("positionFeeAmountForPool");
  }

  get positionFeeAmount(): BigInt {
    return this.ctx.getUintItem("positionFeeAmount");
  }

  get totalCostAmount(): BigInt {
    return this.ctx.getUintItem("totalCostAmount");
  }

  get uiFeeReceiverFactor(): BigInt {
    return this.ctx.getUintItem("uiFeeReceiverFactor");
  }

  get uiFeeAmount(): BigInt {
    return this.ctx.getUintItem("uiFeeAmount");
  }

  get isIncrease(): boolean {
    return this.ctx.getBoolItem("isIncrease");
  }

  get orderKey(): string {
    return this.ctx.getBytes32Item("orderKey").toHexString();
  }

  get positionKey(): string {
    return this.ctx.getBytes32Item("positionKey").toHexString();
  }

  get referralCode(): string {
    return this.ctx.getBytes32Item("referralCode").toHexString();
  }
}
