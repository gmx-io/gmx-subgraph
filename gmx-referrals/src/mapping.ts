import { BigInt, Address, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  GovSetCodeOwner,
  RegisterCode,
  SetCodeOwner,
  SetReferrerDiscountShare,
  SetReferrerTier,
  SetTier,
  SetTraderReferralCode
} from "../generated/ReferralStorage/ReferralStorage";
import { IncreasePositionReferral, DecreasePositionReferral } from "../generated/PositionManager/PositionManager";
import { BatchSend } from "../generated/BatchSender/BatchSender";
import { AnswerUpdated as AnswerUpdatedEvent } from "../generated/ChainlinkAggregatorETH/ChainlinkAggregator";
import { ExecuteDecreaseOrder as ExecuteDecreaseOrderEvent } from "../generated/OrderBook/OrderBook";
import {
  ReferralVolumeRecord,
  AffiliateStat,
  AffiliateStatData,
  GlobalStat,
  Tier,
  Affiliate,
  TradedReferral,
  RegisteredReferral,
  ReferralStat,
  ReferralStatData,
  Distribution,
  ReferralCode,
  TraderToReferralCode,
  TokenPrice,
  ExecuteDecreaseOrder
} from "../generated/schema";
import { timestampToPeriod } from "../../utils";
import { EventData } from "./utils/eventData";
import { EventLog1, EventLogEventDataStruct } from "../generated/EventEmitter/EventEmitter";
import { getTokenByPriceFeed } from "./priceFeeds";

class AffiliateResult {
  created: boolean;
  entity: Affiliate;

  constructor(entity: Affiliate, created: boolean) {
    this.entity = entity;
    this.created = created;
  }
}

type Version = string;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";
let ZERO = BigInt.fromI32(0);
let ONE = BigInt.fromI32(1);
let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000);
let FLOAT = BigInt.fromI32(10).pow(30);

// v1 margin fee has 4 decimals, v2 position fee factor has 30 decimals
let POSITION_FEE_FACTOR_V1 = BigInt.fromI32(10)
  .times(FLOAT)
  .div(BASIS_POINTS_DIVISOR);

export function handleEventLog1(event: EventLog1): void {
  let eventName = event.params.eventName;
  let eventData = new EventData(event.params.eventData as EventLogEventDataStruct);

  if (eventName == "PositionFeesCollected") {
    let referralCode = eventData.getBytes32Item("referralCode")!;
    let affiliate = eventData.getAddressItem("affiliate")!;

    if (referralCode.toHexString() == ZERO_BYTES32) {
      return;
    }

    let account = eventData.getAddressItem("trader")!;
    let sizeDelta = eventData.getUintItem("tradeSizeUsd")!;
    let isIncrease = eventData.getBoolItem("isIncrease")!;
    let positionFeeFactor = eventData.getUintItem("positionFeeFactor")!;

    _handlePositionAction(
      event.block.number,
      event.transaction.hash,
      event.logIndex,
      event.block.timestamp,
      account,
      sizeDelta,
      referralCode.toHexString(),
      affiliate,
      isIncrease,
      positionFeeFactor,
      "v2"
    );
  } else if (eventName == "OraclePriceUpdate") {
    _updateTokenPrice(eventData.getAddressItem("token")!, eventData.getUintItem("maxPrice")!);
  } else if (eventName == "AffiliateRewardClaimed") {
    let typeId = BigInt.fromI32(1000);
    _createOrUpdateDistribution(
      event,
      eventData.getAddressItemString("affiliate")!,
      eventData.getAddressItemString("token")!,
      eventData.getAddressItemString("market")!,
      eventData.getUintItem("amount")!,
      typeId
    );
    return;
  }
}

// Chainlink prices are required for V1 distributions before V2 prices existed
export function handleAnswerUpdated(event: AnswerUpdatedEvent): void {
  let token = getTokenByPriceFeed(event.address.toHexString());
  // Chainlink prices have 8 decimals
  // WETH and WAVAX have 18 decimals, price should be in 12 decimals
  let price = event.params.current.times(BigInt.fromI32(10000));
  _updateTokenPrice(token!, price);
}

function _updateTokenPrice(tokenAddress: Address, price: BigInt): void {
  let id = tokenAddress.toHexString();
  let entity = TokenPrice.load(id);
  if (entity == null) {
    entity = new TokenPrice(id);
  }
  entity.value = price;
  entity.save();
}

function _createOrUpdateDistribution(
  event: ethereum.Event,
  receiver: string,
  token: string,
  market: string | null,
  amount: BigInt,
  typeId: BigInt
): void {
  let id = receiver + ":" + event.transaction.hash.toHexString() + ":" + typeId.toString();
  let entity = Distribution.load(id);
  if (entity == null) {
    entity = new Distribution(id);
    entity.tokens = new Array<string>(0);
    entity.markets = new Array<string>(0);
    entity.amounts = new Array<BigInt>(0);
    entity.amountsInUsd = new Array<BigInt>(0);
  }
  let tokens = entity.tokens;
  tokens.push(token);
  entity.tokens = tokens;

  let amounts = entity.amounts;
  amounts.push(amount);
  entity.amounts = amounts;

  let amountsInUsd = entity.amountsInUsd;
  amountsInUsd.push(_getAmountInUsd(token, amount));
  entity.amountsInUsd = amountsInUsd;

  if (market != null) {
    let markets = entity.markets;
    markets.push(market);
    entity.markets = markets;
  }

  entity.typeId = typeId;
  entity.receiver = receiver;

  entity.blockNumber = event.block.number;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.timestamp = event.block.timestamp;

  entity.save();
}

export function handleBatchSend(event: BatchSend): void {
  let typeId = event.params.typeId;
  let token = event.params.token.toHexString();
  let receivers = event.params.accounts;
  let amounts = event.params.amounts;
  for (let i = 0; i < event.params.accounts.length; i++) {
    let receiver = receivers[i].toHexString();
    _createOrUpdateDistribution(event, receiver, token, null, amounts[i], typeId);
  }
}

export function handleDecreasePositionReferral(event: DecreasePositionReferral): void {
  let sizeDelta = event.params.sizeDelta;
  if (sizeDelta == ZERO) {
    // sizeDelta is incorrectly emitted for decrease orders
    let prevLogIndex = event.logIndex - ONE;
    let executeDecreaseOrderId = event.transaction.hash.toHexString() + ":" + prevLogIndex.toString();
    let executeDecreaseOrderEntity = ExecuteDecreaseOrder.load(executeDecreaseOrderId);
    if (executeDecreaseOrderEntity != null) {
      sizeDelta = executeDecreaseOrderEntity.sizeDelta;
    }
  }

  _handlePositionAction(
    event.block.number,
    event.transaction.hash,
    event.logIndex,
    event.block.timestamp,
    event.params.account,
    sizeDelta,
    event.params.referralCode.toHex(),
    event.params.referrer,
    false,
    POSITION_FEE_FACTOR_V1,
    "v1"
  );
}

export function handleIncreasePositionReferral(event: IncreasePositionReferral): void {
  _handlePositionAction(
    event.block.number,
    event.transaction.hash,
    event.logIndex,
    event.block.timestamp,
    event.params.account,
    event.params.sizeDelta,
    event.params.referralCode.toHex(),
    event.params.referrer,
    true,
    POSITION_FEE_FACTOR_V1,
    "v1"
  );
}

export function handleRegisterCode(event: RegisterCode): void {
  _registerCode(event.block.timestamp, event.params.code, event.params.account);
}

function _registerCode(timestamp: BigInt, code: Bytes, owner: Address): void {
  let affiliateResult = _getOrCreateAffiliateWithCreatedFlag(owner.toHexString());
  let affiliateCreated = affiliateResult.created;

  let referralCodeEntity = ReferralCode.load(code.toHexString());
  let referralCodeCreated = false;
  if (!referralCodeEntity) {
    referralCodeEntity = new ReferralCode(code.toHexString());
    referralCodeEntity.code = code.toHex();
    referralCodeCreated = true;
  }
  referralCodeEntity.owner = owner.toHexString();
  referralCodeEntity.save();

  let totalAffiliateStat = _getOrCreateAffiliateStat(timestamp, "total", owner, code.toHex());
  totalAffiliateStat.save();

  let dailyAffiliateStat = _getOrCreateAffiliateStat(timestamp, "daily", owner, code.toHex());
  dailyAffiliateStat.save();

  if (!referralCodeCreated) {
    return;
  }

  let totalGlobalStatEntity = _getOrCreateGlobalStat(timestamp, "total", null);
  totalGlobalStatEntity.referralCodesCount = totalGlobalStatEntity.referralCodesCount.plus(ONE);
  totalGlobalStatEntity.referralCodesCountCumulative = totalGlobalStatEntity.referralCodesCount;
  if (affiliateCreated) {
    totalGlobalStatEntity.affiliatesCount = totalGlobalStatEntity.affiliatesCount.plus(ONE);
    totalGlobalStatEntity.affiliatesCountCumulative = totalGlobalStatEntity.affiliatesCount;
  }
  totalGlobalStatEntity.save();

  let dailyGlobalStatEntity = _getOrCreateGlobalStat(timestamp, "daily", totalGlobalStatEntity);
  dailyGlobalStatEntity.referralCodesCount = dailyGlobalStatEntity.referralCodesCount.plus(ONE);
  if (affiliateCreated) {
    dailyGlobalStatEntity.affiliatesCount = dailyGlobalStatEntity.affiliatesCount.plus(ONE);
  }
  dailyGlobalStatEntity.save();
}

export function handleSetCodeOwner(event: SetCodeOwner): void {
  _registerCode(event.block.timestamp, event.params.code, event.params.newAccount);
}

export function handleGovSetCodeOwner(event: GovSetCodeOwner): void {
  _registerCode(event.block.timestamp, event.params.code, event.params.newAccount);
}

export function handleSetReferrerDiscountShare(event: SetReferrerDiscountShare): void {
  let entity = _getOrCreateAffiliate(event.params.referrer.toHexString());
  entity.discountShare = event.params.discountShare;
  entity.save();
}

export function handleSetReferrerTier(event: SetReferrerTier): void {
  let entity = _getOrCreateAffiliate(event.params.referrer.toHexString());
  entity.tierId = event.params.tierId;
  entity.save();
}

export function handleSetTier(event: SetTier): void {
  let entity = _getOrCreateTier(event.params.tierId.toString());
  entity.totalRebate = event.params.totalRebate;
  entity.discountShare = event.params.discountShare;
  entity.save();
}

export function handleSetTraderReferralCode(event: SetTraderReferralCode): void {
  let referralCodeEntity = ReferralCode.load(event.params.code.toHexString());
  if (referralCodeEntity == null) {
    // SetTraderReferralCode can be emitted with non-existent code
    return;
  }

  let traderToReferralCode = new TraderToReferralCode(event.params.account.toHexString());
  traderToReferralCode.referralCode = event.params.code.toHexString();
  traderToReferralCode.save();

  let timestamp = event.block.timestamp;

  // global stats
  let totalGlobalStatEntity = _getOrCreateGlobalStat(timestamp, "total", null);
  totalGlobalStatEntity.referralsCount = totalGlobalStatEntity.referralsCount.plus(ONE);
  totalGlobalStatEntity.referralsCountCumulative = totalGlobalStatEntity.referralsCountCumulative.plus(ONE);
  totalGlobalStatEntity.save();

  let dailyGlobalStatEntity = _getOrCreateGlobalStat(timestamp, "daily", totalGlobalStatEntity);
  dailyGlobalStatEntity.referralsCount = dailyGlobalStatEntity.referralsCount.plus(ONE);
  dailyGlobalStatEntity.save();

  // affiliate stats
  let affiliate = Address.fromString(referralCodeEntity.owner);
  let totalAffiliateStatEntity = _getOrCreateAffiliateStat(timestamp, "total", affiliate, event.params.code.toHex());
  if (_createRegisteredReferralIfNotExist(totalAffiliateStatEntity.id, event.params.account)) {
    totalAffiliateStatEntity.registeredReferralsCount = totalAffiliateStatEntity.registeredReferralsCount.plus(ONE);
    totalAffiliateStatEntity.registeredReferralsCountCumulative = totalAffiliateStatEntity.registeredReferralsCountCumulative.plus(
      ONE
    );
    totalAffiliateStatEntity.save();
  }

  let dailyAffiliateStatEntity = _getOrCreateAffiliateStat(timestamp, "daily", affiliate, event.params.code.toHex());
  if (_createRegisteredReferralIfNotExist(dailyAffiliateStatEntity.id, event.params.account)) {
    dailyAffiliateStatEntity.registeredReferralsCount = dailyAffiliateStatEntity.registeredReferralsCount.plus(ONE);
  }
  dailyAffiliateStatEntity.save();
}

export function handleExecuteDecreaseOrder(event: ExecuteDecreaseOrderEvent): void {
  let id = event.transaction.hash.toHexString() + ":" + event.logIndex.toString();
  let entity = new ExecuteDecreaseOrder(id);
  entity.sizeDelta = event.params.sizeDelta;
  entity.account = event.params.account.toHexString();
  entity.timestamp = event.block.timestamp;
  entity.save();
}

function _getOrCreateTier(id: string): Tier {
  let entity = Tier.load(id);
  if (entity == null) {
    entity = new Tier(id);
    // default values for tier 0
    entity.totalRebate = BigInt.fromI32(1000);
    entity.discountShare = BigInt.fromI32(5000);
    entity.save();
  }
  return entity as Tier;
}

function _storeReferralStats(
  timestamp: BigInt,
  period: string,
  referral: Address,
  volume: BigInt,
  discountUsd: BigInt,
  totalEntity: ReferralStat | null,
  version: Version
): ReferralStat {
  let periodTimestamp = timestampToPeriod(timestamp, period);
  let id = period + ":" + periodTimestamp.toString() + ":" + referral.toHexString();

  let entity = ReferralStat.load(id);
  let v1Data: ReferralStatData | null = null;
  let v2Data: ReferralStatData | null = null;
  if (entity === null) {
    entity = new ReferralStat(id);
    entity.referral = referral.toHexString();
    entity.volume = ZERO;
    entity.volumeCumulative = ZERO;
    entity.discountUsd = ZERO;
    entity.discountUsdCumulative = ZERO;
    entity.timestamp = periodTimestamp;
    entity.period = period;

    v1Data = _createReferralStatData(id, "v1");
    entity.v1Data = v1Data.id;

    v2Data = _createReferralStatData(id, "v2");
    entity.v2Data = v2Data.id;
  } else {
    v1Data = _getReferralStatData(id, "v1");
    v2Data = _getReferralStatData(id, "v2");
  }

  entity.volume += volume;
  entity.discountUsd += discountUsd;

  let entityData = version == "v1" ? v1Data : v2Data;
  entityData!.volume += volume;
  entityData!.discountUsd += discountUsd;

  if (period == "total") {
    totalEntity = entity;
  }
  entity.volumeCumulative = totalEntity!.volume;
  entity.discountUsdCumulative = totalEntity!.discountUsd;

  let totalEntityData = _getReferralStatData(totalEntity!.id, version);
  entityData!.volumeCumulative = totalEntityData.volume;
  entityData!.discountUsdCumulative = totalEntityData.discountUsd;

  entity.save();
  entityData!.save();

  return entity as ReferralStat;
}

function _getOrCreateGlobalStat(timestamp: BigInt, period: string, totalEntity: GlobalStat | null): GlobalStat {
  let periodTimestamp = timestampToPeriod(timestamp, period);
  let id = period + ":" + periodTimestamp.toString();

  let entity = GlobalStat.load(id);
  if (entity == null) {
    entity = new GlobalStat(id);
    entity.volume = ZERO;
    entity.volumeCumulative = ZERO;
    entity.totalRebateUsd = ZERO;
    entity.totalRebateUsdCumulative = ZERO;
    entity.discountUsd = ZERO;
    entity.discountUsdCumulative = ZERO;
    entity.trades = ZERO;
    entity.tradesCumulative = ZERO;

    entity.referralCodesCount = ZERO;
    entity.referralCodesCountCumulative = ZERO;

    entity.affiliatesCount = ZERO;
    entity.affiliatesCountCumulative = ZERO;

    entity.referralsCount = ZERO;
    entity.referralsCountCumulative = ZERO;

    if (totalEntity) {
      entity.affiliatesCountCumulative = totalEntity.affiliatesCount;
      entity.referralCodesCountCumulative = totalEntity.referralCodesCountCumulative;
      entity.volumeCumulative = totalEntity.volumeCumulative;
      entity.totalRebateUsdCumulative = totalEntity.totalRebateUsdCumulative;
      entity.discountUsdCumulative = totalEntity.discountUsdCumulative;
      entity.referralsCountCumulative = totalEntity.referralsCountCumulative;
    }

    entity.period = period;
    entity.timestamp = periodTimestamp;
  }
  return entity as GlobalStat;
}

function _storeGlobalStats(
  timestamp: BigInt,
  period: string,
  volume: BigInt,
  totalRebateUsd: BigInt,
  discountUsd: BigInt,
  totalEntity: GlobalStat | null
): GlobalStat {
  let entity = _getOrCreateGlobalStat(timestamp, period, totalEntity);

  entity.volume = entity.volume.plus(volume);
  entity.totalRebateUsd = entity.totalRebateUsd.plus(totalRebateUsd);
  entity.discountUsd = entity.discountUsd.plus(discountUsd);
  entity.trades = entity.trades.plus(ONE);

  if (period == "total") {
    totalEntity = entity;
  }

  entity.volumeCumulative = totalEntity!.volume;
  entity.totalRebateUsdCumulative = totalEntity!.totalRebateUsd;
  entity.discountUsdCumulative = totalEntity!.discountUsd;
  entity.tradesCumulative = totalEntity!.trades;
  entity.affiliatesCountCumulative = totalEntity!.affiliatesCount;
  entity.referralCodesCountCumulative = totalEntity!.referralCodesCount;

  entity.save();

  return entity as GlobalStat;
}

function _getAffiliateStatId(
  periodTimestamp: BigInt,
  period: string,
  affiliate: Address,
  referralCode: string
): string {
  return period + ":" + periodTimestamp.toString() + ":" + referralCode + ":" + affiliate.toHexString();
}

function _getOrCreateAffiliateStat(
  timestamp: BigInt,
  period: string,
  affiliate: Address,
  referralCode: string
): AffiliateStat {
  let periodTimestamp = timestampToPeriod(timestamp, period);
  let id = _getAffiliateStatId(periodTimestamp, period, affiliate, referralCode);

  let entity = AffiliateStat.load(id);

  if (entity === null) {
    entity = new AffiliateStat(id);
    entity.volume = ZERO;
    entity.volumeCumulative = ZERO;
    entity.trades = ZERO;
    entity.tradedReferralsCount = ZERO;
    entity.registeredReferralsCount = ZERO;

    entity.totalRebateUsd = ZERO;
    entity.discountUsd = ZERO;

    entity.timestamp = periodTimestamp;
    entity.affiliate = affiliate.toHexString();
    entity.referralCode = referralCode;
    entity.period = period;

    let v1Data = _createAffiliateStatData(id, "v1");
    entity.v1Data = v1Data.id;

    let v2Data = _createAffiliateStatData(id, "v2");
    entity.v2Data = v2Data.id;

    if (period == "total") {
      entity.totalRebateUsdCumulative = ZERO;
      entity.tradedReferralsCountCumulative = ZERO;
      entity.registeredReferralsCountCumulative = ZERO;
      entity.discountUsdCumulative = ZERO;
      entity.tradesCumulative = ZERO;
    } else {
      let totalPeriodTimestamp = timestampToPeriod(timestamp, "total");
      let totalId = _getAffiliateStatId(totalPeriodTimestamp, "total", affiliate, referralCode);
      let totalEntity = AffiliateStat.load(totalId);

      if (totalEntity == null) {
        throw new Error("AffiliateStat total entity is not found");
      }

      entity.tradedReferralsCountCumulative = totalEntity.tradedReferralsCountCumulative;
      entity.registeredReferralsCountCumulative = totalEntity.registeredReferralsCountCumulative;
      entity.totalRebateUsdCumulative = totalEntity.totalRebateUsdCumulative;
      entity.discountUsdCumulative = totalEntity.discountUsdCumulative;
      entity.tradesCumulative = totalEntity.tradesCumulative;
      entity.volumeCumulative = totalEntity.volumeCumulative;
    }
  }

  return entity as AffiliateStat;
}

function _getReferralStatData(referralStatId: string, version: Version): ReferralStatData {
  let id = referralStatId + ":" + version;
  let entity = ReferralStatData.load(id);
  return entity as ReferralStatData;
}

function _createReferralStatData(affiliateStatId: string, version: Version): ReferralStatData {
  let id = affiliateStatId + ":" + version;
  let entity = new ReferralStatData(id);
  entity.volume = ZERO;
  entity.volumeCumulative = ZERO;
  entity.discountUsd = ZERO;
  entity.discountUsdCumulative = ZERO;

  entity.save();
  return entity;
}

function _getAffiliateStatData(affiliateStatId: string, version: Version): AffiliateStatData {
  let id = affiliateStatId + ":" + version;
  let entity = AffiliateStatData.load(id);
  return entity as AffiliateStatData;
}

function _createAffiliateStatData(affiliateStatId: string, version: Version): AffiliateStatData {
  let id = affiliateStatId + ":" + version;
  let entity = new AffiliateStatData(id);
  entity.volume = ZERO;
  entity.volumeCumulative = ZERO;
  entity.totalRebateUsd = ZERO;
  entity.totalRebateUsdCumulative = ZERO;
  entity.discountUsd = ZERO;
  entity.discountUsdCumulative = ZERO;
  entity.trades = ZERO;
  entity.tradesCumulative = ZERO;

  entity.save();
  return entity;
}

function _storeAffiliateStats(
  timestamp: BigInt,
  period: string,
  volume: BigInt,
  referralCode: string,
  affiliate: Address,
  referral: Address,
  totalRebateUsd: BigInt,
  discountUsd: BigInt,
  totalEntity: AffiliateStat | null,
  version: Version
): AffiliateStat {
  let entity = _getOrCreateAffiliateStat(timestamp, period, affiliate, referralCode);
  let isNewReferral = _createTradedReferralIfNotExist(entity.id, referral);

  if (isNewReferral) {
    entity.tradedReferralsCount = entity.tradedReferralsCount.plus(ONE);
  }

  entity.volume = entity.volume.plus(volume);
  entity.trades = entity.trades.plus(ONE);
  entity.totalRebateUsd = entity.totalRebateUsd.plus(totalRebateUsd);
  entity.discountUsd = entity.discountUsd.plus(discountUsd);

  let entityData = _getAffiliateStatData(entity.id, version);
  entityData.volume = entityData.volume.plus(volume);
  entityData.trades = entityData.trades.plus(ONE);
  entityData.totalRebateUsd = entityData.totalRebateUsd.plus(totalRebateUsd);
  entityData.discountUsd = entityData.discountUsd.plus(discountUsd);

  if (period == "total") {
    entity.volumeCumulative = entity.volume;
    entity.totalRebateUsdCumulative = entity.totalRebateUsd;
    entity.discountUsdCumulative = entity.discountUsd;
    entity.tradesCumulative = entity.trades;
    entity.tradedReferralsCountCumulative = entity.tradedReferralsCount;

    entityData.volumeCumulative = entityData.volume;
    entityData.totalRebateUsdCumulative = entityData.totalRebateUsd;
    entityData.discountUsdCumulative = entityData.discountUsd;
    entityData.tradesCumulative = entityData.trades;
  } else {
    entity.volumeCumulative = totalEntity!.volumeCumulative;
    entity.tradesCumulative = totalEntity!.tradesCumulative;
    entity.totalRebateUsdCumulative = totalEntity!.totalRebateUsdCumulative;
    entity.volumeCumulative = totalEntity!.volumeCumulative;
    entity.discountUsdCumulative = totalEntity!.discountUsdCumulative;
    entity.tradedReferralsCountCumulative = totalEntity!.tradedReferralsCount;
    entity.registeredReferralsCountCumulative = totalEntity!.registeredReferralsCount;

    let totalEntityData = _getAffiliateStatData(totalEntity!.id, version);
    entityData.volumeCumulative = totalEntityData.volumeCumulative;
    entityData.tradesCumulative = totalEntityData.tradesCumulative;
    entityData.totalRebateUsdCumulative = totalEntityData.totalRebateUsdCumulative;
    entityData.discountUsdCumulative = totalEntityData.discountUsdCumulative;
  }

  entityData.save();
  entity.save();

  return entity as AffiliateStat;
}

function _handlePositionAction(
  blockNumber: BigInt,
  transactionHash: Bytes,
  eventLogIndex: BigInt,
  timestamp: BigInt,
  referral: Address,
  volume: BigInt,
  referralCode: string,
  affiliate: Address,
  isIncrease: boolean,
  positionFeeFactor: BigInt,
  version: Version
): void {
  if (referral.toHexString() == ZERO_ADDRESS || referralCode == ZERO_BYTES32) {
    return;
  }

  let affiliateEntity = _getOrCreateAffiliate(affiliate.toHexString());
  let tierEntity = _getOrCreateTier(affiliateEntity.tierId.toString());

  let id = transactionHash.toHexString() + ":" + eventLogIndex.toString();
  let entity = new ReferralVolumeRecord(id);

  entity.volume = volume;
  entity.referral = referral.toHexString();
  entity.referralCode = referralCode;
  entity.affiliate = affiliate.toHexString();
  entity.tierId = affiliateEntity.tierId;
  entity.totalRebate = tierEntity!.totalRebate;
  entity.discountShare =
    affiliateEntity.discountShare > ZERO ? affiliateEntity.discountShare : tierEntity!.discountShare;
  entity.blockNumber = blockNumber;
  entity.transactionHash = transactionHash.toHexString();
  entity.timestamp = timestamp;

  let feesUsd = entity.volume.times(positionFeeFactor).div(FLOAT);
  let totalRebateUsd = feesUsd.times(entity.totalRebate).div(BASIS_POINTS_DIVISOR);
  let discountUsd = totalRebateUsd.times(entity.discountShare).div(BASIS_POINTS_DIVISOR);

  entity.totalRebateUsd = totalRebateUsd;
  entity.discountUsd = discountUsd;

  entity.save();

  let totalAffiliateStatEntity = _storeAffiliateStats(
    timestamp,
    "total",
    volume,
    referralCode,
    affiliate,
    referral,
    totalRebateUsd,
    discountUsd,
    null,
    version
  );
  _storeAffiliateStats(
    timestamp,
    "daily",
    volume,
    referralCode,
    affiliate,
    referral,
    totalRebateUsd,
    discountUsd,
    totalAffiliateStatEntity,
    version
  );

  let totalReferralStatEntity = _storeReferralStats(timestamp, "total", referral, volume, discountUsd, null, version);
  _storeReferralStats(timestamp, "daily", referral, volume, discountUsd, totalReferralStatEntity, version);

  let totalGlobalStatEntity = _storeGlobalStats(timestamp, "total", volume, totalRebateUsd, discountUsd, null);
  _storeGlobalStats(timestamp, "daily", volume, totalRebateUsd, discountUsd, totalGlobalStatEntity);
}

function _createTradedReferralIfNotExist(affiliateStatId: string, referral: Address): boolean {
  let id = affiliateStatId + ":" + referral.toHexString();
  let entity = TradedReferral.load(id);
  if (entity == null) {
    entity = new TradedReferral(id);
    entity.affiliateStat = affiliateStatId;
    entity.referral = referral.toHexString();
    entity.save();
    return true;
  }
  return false;
}

function _createRegisteredReferralIfNotExist(affiliateStatId: string, referral: Address): boolean {
  let id = affiliateStatId + ":" + referral.toHexString();
  let entity = RegisteredReferral.load(id);
  if (entity == null) {
    entity = new RegisteredReferral(id);
    entity.affiliateStat = affiliateStatId;
    entity.referral = referral.toHexString();
    entity.save();
    return true;
  }
  return false;
}

function _getOrCreateAffiliate(id: string): Affiliate {
  let entity = Affiliate.load(id);
  if (entity == null) {
    entity = new Affiliate(id);
    entity.tierId = ZERO;
    entity.discountShare = ZERO;
    entity.save();
  }
  return entity as Affiliate;
}

function _getOrCreateAffiliateWithCreatedFlag(id: string): AffiliateResult {
  let entity = Affiliate.load(id);
  let created = false;
  if (entity == null) {
    entity = new Affiliate(id);
    entity.tierId = ZERO;
    entity.discountShare = ZERO;
    entity.save();
  }
  return new AffiliateResult(entity as Affiliate, created);
}

function _getAmountInUsd(tokenAddress: string, amount: BigInt): BigInt {
  let tokenPrice = TokenPrice.load(tokenAddress);
  if (tokenPrice == null) {
    return ZERO;
  }

  return amount.times(tokenPrice.value);
}
