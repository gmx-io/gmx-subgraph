import { Bytes, BigInt, log, Entity } from "@graphprotocol/graph-ts";
import {
  CollectedMarketFeesInfo,
  LatestUserGmTokensBalanceChangeRef,
  Transaction,
  UserGmTokensBalanceChange
} from "../../generated/schema";
import { getOrCreateCollectedMarketFees } from "./fees";

let ZERO = BigInt.fromI32(0);

export function saveUserGmTokensBalanceChange(
  account: string,
  marketAddress: string,
  value: BigInt,
  transaction: Transaction
): void {
  let prevEntity = getLatestUserGmTokensBalanceChange(account, marketAddress);
  let entity = _getOrCreateUserGmTokensBalanceChange(account, marketAddress, transaction);

  if (prevEntity) {
    if (entity.id == prevEntity.id) {
      prevEntity = null;
    }
  }

  let totalFees = CollectedMarketFeesInfo.load(marketAddress + ":total");
  let prevValue = prevEntity ? prevEntity.tokensBalance : ZERO;
  let prevCumulativeIncome = prevEntity ? prevEntity.cumulativeIncome : ZERO;
  let income = prevEntity ? calcIncomeForEntity(prevEntity) : ZERO;

  entity.tokensBalance = entity.tokensBalance.notEqual(ZERO) ? entity.tokensBalance.plus(value) : prevValue.plus(value);
  entity.tokensDelta = entity.tokensDelta.notEqual(ZERO) ? entity.tokensDelta.plus(value) : value;
  entity.income = income;
  entity.cumulativeIncome = entity.cumulativeIncome.notEqual(ZERO)
    ? entity.cumulativeIncome
    : prevCumulativeIncome.plus(income);
  entity.cumulativeFeeUsdPerGmToken = totalFees ? totalFees.cumulativeFeeUsdPerGmToken : ZERO;
  entity.save();

  saveLatestUserGmTokensBalanceChange(entity);
}

function getLatestUserGmTokensBalanceChange(account: string, marketAddress: string): UserGmTokensBalanceChange | null {
  let id = account + ":" + marketAddress;
  let latestRef = LatestUserGmTokensBalanceChangeRef.load(id);

  if (!latestRef) return null;

  let latestId = latestRef.latestUserGmTokensBalanceChange;

  if (latestId) return UserGmTokensBalanceChange.load(latestId);

  return null;
}

function saveLatestUserGmTokensBalanceChange(change: UserGmTokensBalanceChange): void {
  let id = change.account + ":" + change.marketAddress;
  let latestRef = LatestUserGmTokensBalanceChangeRef.load(id);

  if (!latestRef) {
    latestRef = new LatestUserGmTokensBalanceChangeRef(id);
    latestRef.account = change.account;
    latestRef.marketAddress = change.marketAddress;
  }

  // several transfers can be in one transaction
  if (latestRef.latestUserGmTokensBalanceChange != change.id) {
    latestRef.latestUserGmTokensBalanceChange = change.id;
  }

  latestRef.save();
}

function calcIncomeForEntity(entity: UserGmTokensBalanceChange | null): BigInt {
  if (!entity) return ZERO;
  if (entity.tokensBalance.equals(ZERO)) return ZERO;

  let currentFees = getOrCreateCollectedMarketFees(entity.marketAddress, 0, "total");
  let feeUsdPerGmToken = currentFees.cumulativeFeeUsdPerGmToken.minus(entity.cumulativeFeeUsdPerGmToken);

  return feeUsdPerGmToken.times(entity.tokensBalance).div(BigInt.fromI32(10).pow(18));
}

function _getOrCreateUserGmTokensBalanceChange(
  account: string,
  marketAddress: string,
  transaction: Transaction
): UserGmTokensBalanceChange {
  let entity = UserGmTokensBalanceChange.load(account + ":" + marketAddress + ":" + transaction.hash);
  if (entity) return entity!;

  let newEntity = new UserGmTokensBalanceChange(account + ":" + marketAddress + ":" + transaction.hash);

  newEntity.account = account;
  newEntity.marketAddress = marketAddress;
  newEntity.tokensDelta = ZERO;
  newEntity.tokensBalance = ZERO;
  newEntity.timestamp = transaction.timestamp;
  newEntity.income = ZERO;
  newEntity.cumulativeIncome = ZERO;
  newEntity.cumulativeFeeUsdPerGmToken = ZERO;

  return newEntity;
}
