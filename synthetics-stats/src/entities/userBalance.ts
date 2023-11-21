import { BigInt, log } from "@graphprotocol/graph-ts";
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
  transaction: Transaction,
  transactionLogIndex: BigInt,
  postfix: string
): void {
  let prevEntity = getLatestUserGmTokensBalanceChange(account, marketAddress);
  let entity = _createUserGmTokensBalanceChange(account, marketAddress, transaction, transactionLogIndex, postfix);
  let totalFees = CollectedMarketFeesInfo.load(marketAddress + ":total");
  let prevBalance = prevEntity ? prevEntity.tokensBalance : ZERO;
  let prevCumulativeIncome = prevEntity ? prevEntity.cumulativeIncome : ZERO;
  let income = prevEntity ? calcIncomeForEntity(prevEntity) : ZERO;

  entity.tokensBalance = prevBalance.plus(value);
  entity.tokensDelta = value;
  entity.cumulativeIncome = prevCumulativeIncome.plus(income);
  entity.prevCumulativeFeeUsdPerGmToken = totalFees ? totalFees.prevCumulativeFeeUsdPerGmToken : ZERO;
  entity.cumulativeFeeUsdPerGmToken = totalFees ? totalFees.cumulativeFeeUsdPerGmToken : ZERO;
  entity.index = getBalanceChangeNextIndex(account, marketAddress);
  entity.save();

  saveLatestUserGmTokensBalanceChange(entity);
}

function getBalanceChangeNextIndex(account: string, marketAddress: string): BigInt {
  let id = account + ":" + marketAddress;
  let latestRef = LatestUserGmTokensBalanceChangeRef.load(id);

  return latestRef ? latestRef.nextIndex : BigInt.fromI32(0);
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
    latestRef.nextIndex = BigInt.fromI32(0);
  }

  latestRef.nextIndex = latestRef.nextIndex.plus(BigInt.fromI32(1));
  latestRef.latestUserGmTokensBalanceChange = change.id;

  latestRef.save();
}

function calcIncomeForEntity(entity: UserGmTokensBalanceChange | null): BigInt {
  if (!entity) return ZERO;
  if (entity.tokensBalance.equals(ZERO)) return ZERO;

  let currentFees = getOrCreateCollectedMarketFees(entity.marketAddress, 0, "total");
  let feeUsdPerGmToken = currentFees.cumulativeFeeUsdPerGmToken.minus(entity.prevCumulativeFeeUsdPerGmToken);

  return feeUsdPerGmToken.times(entity.tokensBalance).div(BigInt.fromI32(10).pow(18));
}

function _createUserGmTokensBalanceChange(
  account: string,
  marketAddress: string,
  transaction: Transaction,
  transactionLogIndex: BigInt,
  postfix: string
): UserGmTokensBalanceChange {
  let id =
    account + ":" + marketAddress + ":" + transaction.hash + ":" + transactionLogIndex.toString() + ":" + postfix;
  let entity = UserGmTokensBalanceChange.load(id);

  if (entity) {
    log.warning("UserGmTokensBalanceChange already exists: {}", [entity.id]);
    throw new Error("UserGmTokensBalanceChange already exists");
  }

  let newEntity = new UserGmTokensBalanceChange(id);

  newEntity.account = account;
  newEntity.marketAddress = marketAddress;

  newEntity.index = ZERO;
  newEntity.tokensDelta = ZERO;
  newEntity.tokensBalance = ZERO;
  newEntity.timestamp = transaction.timestamp;
  newEntity.cumulativeIncome = ZERO;
  newEntity.cumulativeFeeUsdPerGmToken = ZERO;
  newEntity.prevCumulativeFeeUsdPerGmToken = ZERO;

  return newEntity;
}
