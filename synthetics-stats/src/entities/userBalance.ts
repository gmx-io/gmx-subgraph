import { BigInt } from "@graphprotocol/graph-ts";
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
  transactionLogIndex: BigInt
): void {
  let prevEntity = getLatestUserGmTokensBalanceChange(account, marketAddress);
  let entity = _createUserGmTokensBalanceChange(account, marketAddress, transaction, transactionLogIndex);
  let totalFees = CollectedMarketFeesInfo.load(marketAddress + ":total");
  let prevBalance = prevEntity ? prevEntity.tokensBalance : ZERO;
  let prevCumulativeIncome = prevEntity ? prevEntity.cumulativeIncome : ZERO;
  let income = prevEntity ? calcIncomeForEntity(prevEntity) : ZERO;

  entity.income = income;
  entity.tokensBalance = prevBalance.plus(value);
  entity.tokensDelta = value;
  entity.cumulativeIncome = prevCumulativeIncome.plus(income);
  entity.prevCumulativeFeeUsdPerGmToken = totalFees ? totalFees.prevCumulativeFeeUsdPerGmToken : ZERO;
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
  transactionLogIndex: BigInt
): UserGmTokensBalanceChange {
  let entity = UserGmTokensBalanceChange.load(
    account + ":" + marketAddress + ":" + transaction.hash + ":" + transactionLogIndex.toString()
  );
  if (entity) {
    throw new Error("UserGmTokensBalanceChange already exists");
  }

  let newEntity = new UserGmTokensBalanceChange(
    account + ":" + marketAddress + ":" + transaction.hash + ":" + transactionLogIndex.toString()
  );

  newEntity.account = account;
  newEntity.marketAddress = marketAddress;
  newEntity.tokensDelta = ZERO;
  newEntity.tokensBalance = ZERO;
  newEntity.timestamp = transaction.timestamp;
  newEntity.income = ZERO;
  newEntity.cumulativeIncome = ZERO;
  newEntity.cumulativeFeeUsdPerGmToken = ZERO;
  newEntity.prevCumulativeFeeUsdPerGmToken = ZERO;

  return newEntity;
}
