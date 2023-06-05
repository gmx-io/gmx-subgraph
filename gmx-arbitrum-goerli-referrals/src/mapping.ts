import { BigInt, Address, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  // ReferralStorage,
  GovSetCodeOwner,
  RegisterCode,
  SetCodeOwner,
  // SetHandler,
  SetReferrerDiscountShare,
  SetReferrerTier,
  SetTier,
  SetTraderReferralCode,
} from "../generated/ReferralStorage/ReferralStorage";
import {
  AnswerUpdated as AnswerUpdatedEvent
} from '../generated/ChainlinkAggregatorETH/ChainlinkAggregator'
import {
  IncreasePositionReferral,
  DecreasePositionReferral,
} from "../generated/PositionManager/PositionManager";
import { BatchSend } from "../generated/BatchSender/BatchSender";
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
  ExecuteDecreaseOrder,
  PositionReferralAction,
  TraderToReferralCode,
  ChainlinkPrice
} from "../generated/schema";
import { timestampToPeriod } from "../../utils";
import { EventData } from "./utils/eventData";
import {
  EventLog1,
  EventLog2,
  EventLogEventDataStruct,
} from "../generated/EventEmitter/EventEmitter";
import { getTokenByPriceFeed, getTokenDecimals } from "./tokens";

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
const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
let ZERO = BigInt.fromI32(0);
let ONE = BigInt.fromI32(1);
let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000);

export function handleEventLog2(event: EventLog2): void {
  let eventName = event.params.eventName;
  // let eventData = new EventData(
  //   event.params.eventData as EventLogEventDataStruct
  // );

  if (eventName == "OrderCreated") {
    // saveStats(eventData);

    // let market = eventData.getAddressItemString("market")!;
    return;
  }
}

export function handleAnswerUpdated(event: AnswerUpdatedEvent): void {
  let tokens = getTokenByPriceFeed(event.address.toHexString());
  _storeChainlinkPrice(tokens, event.params.current)
}

export function handleEventLog1(event: EventLog1): void {
  let eventName = event.params.eventName;
  let eventData = new EventData(
    event.params.eventData as EventLogEventDataStruct
  );

  if (eventName == "PositionIncrease" || eventName == "PositionDecrease") {
    let account = eventData.getAddressItem("account")!;
    let sizeDelta = eventData.getUintItem("sizeInUsd")!;
    let traderToReferralCode = TraderToReferralCode.load(account.toHexString());
    if (traderToReferralCode == null) {
      return;
    }

    let referralCode = traderToReferralCode.referralCode;
    let referralCodeEntity = ReferralCode.load(referralCode!);
    let affiliate = referralCodeEntity!.owner;

    _handlePositionAction(
      event.block.number,
      event.transaction.hash,
      event.logIndex,
      event.block.timestamp,
      account,
      sizeDelta,
      referralCode.toString(),
      Address.fromString(affiliate),
      eventName == "PositionIncrease",
      "v2"
    );
    return;
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

function _createOrUpdateDistribution(
  event: ethereum.Event,
  receiver: string,
  token: string,
  market: string | null,
  amount: BigInt,
  typeId: BigInt
): void {
  let id =
    receiver +
    ":" +
    event.transaction.hash.toHexString() +
    ":" +
    typeId.toString();
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
    _createOrUpdateDistribution(
      event,
      receiver,
      token,
      null,
      amounts[i],
      typeId
    );
  }
}

export function handleDecreasePositionReferral(
  event: DecreasePositionReferral
): void {
  let sizeDelta = event.params.sizeDelta;
  if (sizeDelta == ZERO) {
    // sizeDelta is incorrectly emitted for decrease orders
    let prevLogIndex = event.logIndex - ONE;
    let executeDecreaseOrderId =
      event.transaction.hash.toHexString() + ":" + prevLogIndex.toString();
    let executeDecreaseOrderEntity = ExecuteDecreaseOrder.load(
      executeDecreaseOrderId
    );
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
    "v1"
  );
}

export function handleIncreasePositionReferral(
  event: IncreasePositionReferral
): void {
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
    "v1"
  );
}

export function handleRegisterCode(event: RegisterCode): void {
  _registerCode(event.block.timestamp, event.params.code, event.params.account);
}

function _registerCode(timestamp: BigInt, code: Bytes, owner: Address): void {
  let affiliateResult = _getOrCreateAffiliateWithCreatedFlag(
    owner.toHexString()
  );
  let affiliateCreated = affiliateResult.created;

  let referralCodeEntity = new ReferralCode(code.toHexString());
  referralCodeEntity.owner = owner.toHexString();
  referralCodeEntity.code = code.toHex();
  referralCodeEntity.save();

  let totalAffiliateStat = _getOrCreateAffiliateStat(
    timestamp,
    "total",
    owner,
    code.toHex()
  );
  totalAffiliateStat.save();

  let dailyAffiliateStat = _getOrCreateAffiliateStat(
    timestamp,
    "daily",
    owner,
    code.toHex()
  );
  dailyAffiliateStat.save();

  let totalGlobalStatEntity = _getOrCreateGlobalStat(timestamp, "total", null);
  totalGlobalStatEntity.referralCodesCount += ONE;
  totalGlobalStatEntity.referralCodesCountCumulative =
    totalGlobalStatEntity.referralCodesCount;
  if (affiliateCreated) {
    totalGlobalStatEntity.affiliatesCount += ONE;
    totalGlobalStatEntity.affiliatesCountCumulative =
      totalGlobalStatEntity.affiliatesCount;
  }
  totalGlobalStatEntity.save();

  let dailyGlobalStatEntity = _getOrCreateGlobalStat(
    timestamp,
    "daily",
    totalGlobalStatEntity
  );
  dailyGlobalStatEntity.referralCodesCount += ONE;
  if (affiliateCreated) {
    dailyGlobalStatEntity.affiliatesCount += ONE;
  }
  dailyGlobalStatEntity.save();
}

export function handleSetCodeOwner(event: SetCodeOwner): void {
  let referralCodeEntity = ReferralCode.load(event.params.code.toHexString());
  if (referralCodeEntity == null) {
    _registerCode(
      event.block.timestamp,
      event.params.code,
      event.params.newAccount
    );
  } else {
    referralCodeEntity.owner = event.params.newAccount.toHexString();
    referralCodeEntity.save();
  }
}

export function handleGovSetCodeOwner(event: GovSetCodeOwner): void {
  let referralCodeEntity = ReferralCode.load(event.params.code.toHexString());
  if (referralCodeEntity == null) {
    _registerCode(
      event.block.timestamp,
      event.params.code,
      event.params.newAccount
    );
  } else {
    referralCodeEntity.owner = event.params.newAccount.toHexString();
    referralCodeEntity.save();
  }
}

export function handleSetReferrerDiscountShare(
  event: SetReferrerDiscountShare
): void {
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

export function handleSetTraderReferralCode(
  event: SetTraderReferralCode
): void {
  let referralCodeEntity = ReferralCode.load(event.params.code.toHexString());
  if (referralCodeEntity == null) {
    // SetTraderReferralCode can be emitted with non-existent code
    return;
  }

  let traderToReferralCode = new TraderToReferralCode(
    event.params.account.toHexString()
  );
  traderToReferralCode.referralCode = event.params.code.toHexString();
  traderToReferralCode.save();

  let timestamp = event.block.timestamp;

  // global stats
  let totalGlobalStatEntity = _getOrCreateGlobalStat(timestamp, "total", null);
  totalGlobalStatEntity.referralsCount += ONE;
  totalGlobalStatEntity.referralsCountCumulative += ONE;
  totalGlobalStatEntity.save();

  let dailyGlobalStatEntity = _getOrCreateGlobalStat(
    timestamp,
    "daily",
    totalGlobalStatEntity
  );
  dailyGlobalStatEntity.referralsCount += ONE;
  dailyGlobalStatEntity.save();

  // affiliate stats
  let affiliate = Address.fromString(referralCodeEntity.owner);
  let totalAffiliateStatEntity = _getOrCreateAffiliateStat(
    timestamp,
    "total",
    affiliate,
    event.params.code.toHex()
  );
  if (
    _createRegisteredReferralIfNotExist(
      totalAffiliateStatEntity.id,
      event.params.account
    )
  ) {
    totalAffiliateStatEntity.registeredReferralsCount += ONE;
    totalAffiliateStatEntity.registeredReferralsCountCumulative += ONE;
    totalAffiliateStatEntity.save();
  }

  let dailyAffiliateStatEntity = _getOrCreateAffiliateStat(
    timestamp,
    "daily",
    affiliate,
    event.params.code.toHex()
  );
  if (
    _createRegisteredReferralIfNotExist(
      dailyAffiliateStatEntity.id,
      event.params.account
    )
  ) {
    dailyAffiliateStatEntity.registeredReferralsCount += ONE;
  }
  dailyAffiliateStatEntity.registeredReferralsCountCumulative =
    totalAffiliateStatEntity.registeredReferralsCountCumulative;
  dailyAffiliateStatEntity.save();
}

export function handleExecuteDecreaseOrder(
  event: ExecuteDecreaseOrderEvent
): void {
  let id =
    event.transaction.hash.toHexString() + ":" + event.logIndex.toString();
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
  let id =
    period + ":" + periodTimestamp.toString() + ":" + referral.toHexString();

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

function _getOrCreateGlobalStat(
  timestamp: BigInt,
  period: string,
  totalEntity: GlobalStat | null
): GlobalStat {
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
      entity.referralCodesCountCumulative =
        totalEntity.referralCodesCountCumulative;
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

  entity.volume += volume;
  entity.totalRebateUsd += totalRebateUsd;
  entity.discountUsd += discountUsd;
  entity.trades += BigInt.fromI32(1);

  if (period == "total") {
    totalEntity = entity;
  }

  entity.volumeCumulative = totalEntity.volume;
  entity.totalRebateUsdCumulative = totalEntity.totalRebateUsd;
  entity.discountUsdCumulative = totalEntity.discountUsd;
  entity.tradesCumulative = totalEntity.trades;
  entity.affiliatesCountCumulative = totalEntity.affiliatesCount;
  entity.referralCodesCountCumulative = totalEntity.referralCodesCount;

  entity.save();

  return entity as GlobalStat;
}

function _getOrCreateAffiliateStat(
  timestamp: BigInt,
  period: string,
  affiliate: Address,
  referralCode: string
): AffiliateStat {
  let periodTimestamp = timestampToPeriod(timestamp, period);
  let id =
    period +
    ":" +
    periodTimestamp.toString() +
    ":" +
    referralCode +
    ":" +
    affiliate.toHexString();

  let entity = AffiliateStat.load(id);
  if (entity === null) {
    entity = new AffiliateStat(id);
    entity.volume = ZERO;
    entity.volumeCumulative = ZERO;
    entity.trades = ZERO;
    entity.tradesCumulative = ZERO;
    entity.tradedReferralsCount = ZERO;
    entity.tradedReferralsCountCumulative = ZERO;
    entity.registeredReferralsCount = ZERO;
    entity.registeredReferralsCountCumulative = ZERO;

    entity.totalRebateUsd = ZERO;
    entity.totalRebateUsdCumulative = ZERO;
    entity.discountUsd = ZERO;
    entity.discountUsdCumulative = ZERO;

    entity.timestamp = periodTimestamp;
    entity.affiliate = affiliate.toHexString();
    entity.referralCode = referralCode;
    entity.period = period;

    let v1Data = _createAffiliateStatData(id, "v1");
    entity.v1Data = v1Data.id;

    let v2Data = _createAffiliateStatData(id, "v2");
    entity.v2Data = v2Data.id;
  }
  return entity as AffiliateStat;
}

function _getReferralStatData(
  referralStatId: string,
  version: Version
): ReferralStatData {
  let id = referralStatId + ":" + version;
  let entity = ReferralStatData.load(id);
  return entity as ReferralStatData;
}

function _createReferralStatData(
  affiliateStatId: string,
  version: Version
): ReferralStatData {
  let id = affiliateStatId + ":" + version;
  let entity = new ReferralStatData(id);
  entity.volume = ZERO;
  entity.volumeCumulative = ZERO;
  entity.discountUsd = ZERO;
  entity.discountUsdCumulative = ZERO;

  entity.save();
  return entity;
}

function _getAffiliateStatData(
  affiliateStatId: string,
  version: Version
): AffiliateStatData {
  let id = affiliateStatId + ":" + version;
  let entity = AffiliateStatData.load(id);
  return entity as AffiliateStatData;
}

function _createAffiliateStatData(
  affiliateStatId: string,
  version: Version
): AffiliateStatData {
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
  let entity = _getOrCreateAffiliateStat(
    timestamp,
    period,
    affiliate,
    referralCode
  );
  let isNewReferral = _createTradedReferralIfNotExist(entity.id, referral);

  if (isNewReferral) {
    entity.tradedReferralsCount += BigInt.fromI32(1);
  }

  entity.volume += volume;
  entity.trades += ONE;
  entity.totalRebateUsd += totalRebateUsd;
  entity.discountUsd += discountUsd;

  let entityData = _getAffiliateStatData(entity.id, version);
  entityData.volume += volume;
  entityData.trades += ONE;
  entityData.totalRebateUsd += totalRebateUsd;
  entityData.discountUsd += discountUsd;

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
    entity.discountUsdCumulative = totalEntity!.discountUsdCumulative;
    entity.tradedReferralsCountCumulative = totalEntity!.tradedReferralsCount;

    let totalEntityData = _getAffiliateStatData(totalEntity!.id, version);
    entityData.volumeCumulative = totalEntityData.volumeCumulative;
    entityData.tradesCumulative = totalEntityData.tradesCumulative;
    entityData.totalRebateUsdCumulative =
      totalEntityData.totalRebateUsdCumulative;
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
  version: Version
): void {
  let actionId = transactionHash.toHexString() + ":" + eventLogIndex.toString();
  let action = new PositionReferralAction(actionId);
  action.isIncrease = isIncrease;
  action.account = referral.toHexString();
  action.referralCode = referralCode;
  action.affiliate = affiliate.toHexString();
  action.transactionHash = transactionHash.toHexString();
  action.blockNumber = blockNumber.toI32();
  action.logIndex = eventLogIndex.toI32();
  action.timestamp = timestamp;
  action.volume = volume;
  action.save();

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
  entity.marginFee = BigInt.fromI32(10);
  entity.totalRebate = tierEntity!.totalRebate;
  entity.discountShare =
    affiliateEntity.discountShare > ZERO
      ? affiliateEntity.discountShare
      : tierEntity!.discountShare;
  entity.blockNumber = blockNumber;
  entity.transactionHash = transactionHash.toHexString();
  entity.timestamp = timestamp;

  let feesUsd = entity.volume.times(entity.marginFee).div(BASIS_POINTS_DIVISOR);
  let totalRebateUsd = feesUsd
    .times(entity.totalRebate)
    .div(BASIS_POINTS_DIVISOR);
  let discountUsd = totalRebateUsd
    .times(entity.discountShare)
    .div(BASIS_POINTS_DIVISOR);

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

  let totalReferralStatEntity = _storeReferralStats(
    timestamp,
    "total",
    referral,
    volume,
    discountUsd,
    null,
    version
  );
  _storeReferralStats(
    timestamp,
    "daily",
    referral,
    volume,
    discountUsd,
    totalReferralStatEntity,
    version
  );

  let totalGlobalStatEntity = _storeGlobalStats(
    timestamp,
    "total",
    volume,
    totalRebateUsd,
    discountUsd,
    null
  );
  _storeGlobalStats(
    timestamp,
    "daily",
    volume,
    totalRebateUsd,
    discountUsd,
    totalGlobalStatEntity
  );
}

function _createTradedReferralIfNotExist(
  affiliateStatId: string,
  referral: Address
): boolean {
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

function _createRegisteredReferralIfNotExist(
  affiliateStatId: string,
  referral: Address
): boolean {
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
    created = true;
  }
  return new AffiliateResult(entity as Affiliate, created);
}

function _storeChainlinkPrice(tokens: string[], value: BigInt): void {
  for (let i = 0; i < tokens.length; i++) {
    let id = tokens[i];
    let entity = new ChainlinkPrice(id)
    entity.value = value
    entity.save()
  }
}

function _getAmountInUsd(tokenAddress: string, amount: BigInt): BigInt {
  let price = ChainlinkPrice.load(tokenAddress)
  if (price == null) {
    return ZERO
  }
  let decimals = getTokenDecimals(tokenAddress)
  if (decimals == 0) {
    return ZERO
  }
  
  // 30 USD decimals
  // 8 Chainlink decimals
  return amount.times(price.value).times(BigInt.fromI32(10).pow(22 - decimals as u8))
}