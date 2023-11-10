import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { EventData } from "../eventData";

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
  constructor(private eventData: EventData) {}

  get market(): string {
    return this.eventData.getAddressItemStringOrDie("market");
  }

  get collateralToken(): string {
    return this.eventData.getAddressItemStringOrDie("collateralToken");
  }

  get affiliate(): string {
    return this.eventData.getAddressItemStringOrDie("affiliate");
  }

  get trader(): string {
    return this.eventData.getAddressItemStringOrDie("trader");
  }

  get uiFeeReceiver(): string {
    return this.eventData.getAddressItemStringOrDie("uiFeeReceiver");
  }

  get collateralTokenPriceMin(): BigInt {
    return this.eventData.getUintItemOrDie("collateralTokenPrice.min");
  }

  get collateralTokenPriceMax(): BigInt {
    return this.eventData.getUintItemOrDie("collateralTokenPrice.max");
  }

  get tradeSizeUsd(): BigInt {
    return this.eventData.getUintItemOrDie("tradeSizeUsd");
  }

  get totalRebateFactor(): BigInt {
    return this.eventData.getUintItemOrDie("totalRebateFactor");
  }

  get traderDiscountFactor(): BigInt {
    return this.eventData.getUintItemOrDie("traderDiscountFactor");
  }

  get totalRebateAmount(): BigInt {
    return this.eventData.getUintItemOrDie("totalRebateAmount");
  }

  get traderDiscountAmount(): BigInt {
    return this.eventData.getUintItemOrDie("traderDiscountAmount");
  }

  get affiliateRewardAmount(): BigInt {
    return this.eventData.getUintItemOrDie("affiliateRewardAmount");
  }

  get fundingFeeAmount(): BigInt {
    return this.eventData.getUintItemOrDie("fundingFeeAmount");
  }

  get claimableLongTokenAmount(): BigInt {
    return this.eventData.getUintItemOrDie("claimableLongTokenAmount");
  }

  get claimableShortTokenAmount(): BigInt {
    return this.eventData.getUintItemOrDie("claimableShortTokenAmount");
  }

  get latestFundingFeeAmountPerSize(): BigInt {
    return this.eventData.getUintItemOrDie("latestFundingFeeAmountPerSize");
  }

  get latestLongTokenClaimableFundingAmountPerSize(): BigInt {
    return this.eventData.getUintItemOrDie("latestLongTokenClaimableFundingAmountPerSize");
  }

  get latestShortTokenClaimableFundingAmountPerSize(): BigInt {
    return this.eventData.getUintItemOrDie("latestShortTokenClaimableFundingAmountPerSize");
  }

  get borrowingFeeUsd(): BigInt {
    return this.eventData.getUintItemOrDie("borrowingFeeUsd");
  }

  get borrowingFeeAmount(): BigInt {
    return this.eventData.getUintItemOrDie("borrowingFeeAmount");
  }

  get borrowingFeeReceiverFactor(): BigInt {
    return this.eventData.getUintItemOrDie("borrowingFeeReceiverFactor");
  }

  get borrowingFeeAmountForFeeReceiver(): BigInt {
    return this.eventData.getUintItemOrDie("borrowingFeeAmountForFeeReceiver");
  }

  get positionFeeFactor(): BigInt {
    return this.eventData.getUintItemOrDie("positionFeeFactor");
  }

  get protocolFeeAmount(): BigInt {
    return this.eventData.getUintItemOrDie("protocolFeeAmount");
  }

  get positionFeeReceiverFactor(): BigInt {
    return this.eventData.getUintItemOrDie("positionFeeReceiverFactor");
  }

  get feeReceiverAmount(): BigInt {
    return this.eventData.getUintItemOrDie("feeReceiverAmount");
  }

  get feeAmountForPool(): BigInt {
    return this.eventData.getUintItemOrDie("feeAmountForPool");
  }

  get positionFeeAmountForPool(): BigInt {
    return this.eventData.getUintItemOrDie("positionFeeAmountForPool");
  }

  get positionFeeAmount(): BigInt {
    return this.eventData.getUintItemOrDie("positionFeeAmount");
  }

  get totalCostAmount(): BigInt {
    return this.eventData.getUintItemOrDie("totalCostAmount");
  }

  get uiFeeReceiverFactor(): BigInt {
    return this.eventData.getUintItemOrDie("uiFeeReceiverFactor");
  }

  get uiFeeAmount(): BigInt {
    return this.eventData.getUintItemOrDie("uiFeeAmount");
  }

  get isIncrease(): boolean {
    return this.eventData.getBoolItemOrDie("isIncrease");
  }

  get orderKey(): string {
    return this.eventData.getBytes32ItemOrDie("orderKey").toHexString();
  }

  get positionKey(): string {
    return this.eventData.getBytes32ItemOrDie("positionKey").toHexString();
  }

  get referralCode(): string {
    return this.eventData.getBytes32ItemOrDie("referralCode").toHexString();
  }
}
