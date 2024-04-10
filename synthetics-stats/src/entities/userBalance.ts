import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  CollectedMarketFeesInfo,
  LatestUserGmTokensBalanceChangeRef,
  Transaction,
  UserGmTokensBalanceChange
} from "../../generated/schema";
import { getOrCreateCollectedMarketFees } from "./fees";

let ZERO = BigInt.fromI32(0);
let ONE = BigInt.fromI32(1);

export function saveUserGmTokensBalanceChange(
  account: string,
  marketAddress: string,
  value: BigInt,
  transaction: Transaction,
  transactionLogIndex: BigInt
): void {
  let prevEntity = getLatestUserGmTokensBalanceChange(account, marketAddress);
  let isDeposit = value.gt(ZERO);
  let entity = _createUserGmTokensBalanceChange(
    account,
    marketAddress,
    transaction,
    transactionLogIndex,
    isDeposit ? "in" : "out"
  );
  let totalFees = CollectedMarketFeesInfo.load(marketAddress + ":total");
  let prevBalance = prevEntity ? prevEntity.tokensBalance : ZERO;
  let prevCumulativeIncome = prevEntity ? prevEntity.cumulativeIncome : ZERO;

  let income = calcIncomeForEntity(prevEntity, isDeposit);

  entity.tokensBalance = prevBalance.plus(value);
  entity.cumulativeIncome = prevCumulativeIncome.plus(income);
  entity.index = prevEntity ? prevEntity.index.plus(ONE) : ZERO;

  if (totalFees) {
    entity.cumulativeFeeUsdPerGmToken = isDeposit
      ? // We need to get `cumulativeFeeUsdPerGmToken` value at the time before a deposit or withdrawal occured.
        // In case of deposits `Transfer` event is emitted inside *execution* transaction *after* `SwapFeesInfo` event.
        // And in case of withdrawals `Transfer` event is emitted inside *creation* transaction *before* `SwapFeesInfo` is emitted inside subsequent *execution* transaction
        totalFees.prevCumulativeFeeUsdPerGmToken
      : totalFees.cumulativeFeeUsdPerGmToken;
  }

  entity.save();

  saveLatestUserGmTokensBalanceChange(entity);
}

function getLatestUserGmTokensBalanceChange(account: string, marketAddress: string): UserGmTokensBalanceChange | null {
  let id = account + ":" + marketAddress;
  let latestRef = LatestUserGmTokensBalanceChangeRef.load(id);

  if (!latestRef) return null;

  let latestId = latestRef.latestUserGmTokensBalanceChange;

  if (!latestId) {
    log.warning("LatestUserGmTokensBalanceChangeRef.latestUserGmTokensBalanceChange is null: {}", [id]);
    throw new Error("LatestUserGmTokensBalanceChangeRef.latestUserGmTokensBalanceChange is null");
  }

  return UserGmTokensBalanceChange.load(latestId);

  return null;
}

function saveLatestUserGmTokensBalanceChange(change: UserGmTokensBalanceChange): void {
  let id = change.account + ":" + change.marketAddress;
  let latestRef = LatestUserGmTokensBalanceChangeRef.load(id);

  if (!latestRef) {
    latestRef = new LatestUserGmTokensBalanceChangeRef(id);
  }

  latestRef.latestUserGmTokensBalanceChange = change.id;

  latestRef.save();
}

function calcIncomeForEntity(entity: UserGmTokensBalanceChange | null, isDeposit: boolean): BigInt {
  if (!entity) return ZERO;
  if (entity.tokensBalance.equals(ZERO)) return ZERO;

  let currentFees = getOrCreateCollectedMarketFees(entity.marketAddress, 0, "total");
  let latestCumulativeFeePerGm = isDeposit
    ? currentFees.prevCumulativeFeeUsdPerGmToken
    : currentFees.cumulativeFeeUsdPerGmToken;
  let feeUsdPerGmToken = latestCumulativeFeePerGm.minus(entity.cumulativeFeeUsdPerGmToken);

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
  newEntity.tokensBalance = ZERO;
  newEntity.timestamp = transaction.timestamp;
  newEntity.cumulativeIncome = ZERO;
  newEntity.cumulativeFeeUsdPerGmToken = ZERO;

  return newEntity;
}
