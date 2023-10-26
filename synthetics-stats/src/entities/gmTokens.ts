import { BigInt, log } from "@graphprotocol/graph-ts";
import { EventData } from "../utils/eventData";
import {
  CollectedMarketFeesInfo,
  DepositCreatedEvent,
  Transaction,
  UserGmTokensAction,
  UserGmTokensRef,
  WithdrawalCreatedEvent,
} from "../../generated/schema";
import { WithdrawalCreatedEventData } from "../utils/eventData/withdrawalCreatedEventData";
import { DepositCreatedEventEventData } from "../utils/eventData/DepositCreatedEventData";

export function handleWithdrawalCreated(eventData: EventData): void {
  createWithdrawalCreatedEvent(new WithdrawalCreatedEventData(eventData));
}

export function handleDepositCreated(eventData: EventData): void {
  createUserDepositCreatedEvent(new DepositCreatedEventEventData(eventData));
}

export function handleUserGmTokensChange(
  account: string,
  tokensDiff: BigInt,
  transaction: Transaction,
  marketAddress: string,
  isDeposit: boolean
): void {
  let prevTokensChange = getLatestUserGmTokensChange(account, marketAddress);

  let tokensAction = createUserGmTokensChangeWithoutSave(
    account,
    marketAddress,
    transaction
  );

  if (prevTokensChange) {
    tokensAction.prevAction = prevTokensChange!.id;
  }

  let prevTokensAmount = prevTokensChange
    ? prevTokensChange.tokensAmount
    : BigInt.fromI32(0);
  let prevFeeUsdPerGmToken = prevTokensChange
    ? prevTokensChange.feeUsdPerGmToken
    : BigInt.fromI32(0);
  let prevCummulativeIncome = prevTokensChange
    ? prevTokensChange.cummulativeIncome
    : BigInt.fromI32(0);

  let feeUsdPerGmToken = getFeesPerGmToken(marketAddress);

  if (prevFeeUsdPerGmToken.gt(BigInt.fromI32(0))) {
    let income = prevTokensAmount.times(
      feeUsdPerGmToken.minus(prevFeeUsdPerGmToken)
    );
    tokensAction.cummulativeIncome = prevCummulativeIncome.plus(income);
  }

  let newAmount = isDeposit
    ? prevTokensAmount.plus(tokensDiff)
    : prevTokensAmount.minus(tokensDiff);

  if (newAmount.lt(BigInt.fromI32(0))) {
    log.warning(
      "handleUserGmTokensChange NEGATIVE account={} prevTokensAmount={} tokensAmount={} tokensDiff={}",
      [
        account,
        prevTokensAmount ? prevTokensAmount.toString() : "null",
        newAmount.toString(),
        tokensDiff.toString(),
      ]
    );
  }

  tokensAction.tokensAmount = newAmount;
  tokensAction.tokensDiff = isDeposit
    ? tokensDiff
    : BigInt.fromI32(0).minus(tokensDiff);
  tokensAction.feeUsdPerGmToken = feeUsdPerGmToken;
  tokensAction.isDeposit = isDeposit;

  tokensAction.feeUsdPerGmToken = feeUsdPerGmToken;
  tokensAction.timestamp = transaction.timestamp;

  tokensAction.save();

  updateLatestUserGmTokensChange(account, marketAddress, tokensAction);
}

function getFeesPerGmToken(marketAddress: string): BigInt {
  let id = marketAddress + ":total";

  let collectedFees = CollectedMarketFeesInfo.load(id);
  if (collectedFees) {
    return collectedFees.feeUsdPerGmToken;
  } else {
    log.warning("getFeesPerGmToken SKIP {}", [id]);
    return BigInt.fromI32(0);
  }
}

function createUserGmTokensChangeWithoutSave(
  account: string,
  marketAddress: string,
  transaction: Transaction
): UserGmTokensAction {
  let id = account + ":" + marketAddress + ":" + transaction.id;

  let entity = new UserGmTokensAction(id);

  entity.marketAddress = marketAddress;
  entity.account = account;
  entity.tokensAmount = BigInt.fromI32(0);
  entity.tokensDiff = BigInt.fromI32(0);
  entity.feeUsdPerGmToken = BigInt.fromI32(0);
  entity.cummulativeIncome = BigInt.fromI32(0);
  entity.timestamp = transaction.timestamp;

  return entity!;
}

function createUserDepositCreatedEvent(
  event: DepositCreatedEventEventData
): DepositCreatedEvent {
  let entity = DepositCreatedEvent.load(event.key);

  entity = new DepositCreatedEvent(event.key);
  entity.marketAddress = event.market;
  // FIXME remove :)
  entity.account = event.account;
  entity.save();

  return entity!;
}

function createWithdrawalCreatedEvent(
  event: WithdrawalCreatedEventData
): WithdrawalCreatedEvent {
  let entity = new WithdrawalCreatedEvent(event.key);

  entity.marketAddress = event.market;
  entity.tokensAmount = event.marketTokenAmount;
  // FIXME only for dev purpose :)
  entity.account = event.account;

  entity.save();

  return entity;
}

function getLatestUserGmTokensChange(
  account: string,
  marketAddress: string
): UserGmTokensAction | null {
  let id = account + ":" + marketAddress;

  let userGmTokensRef = UserGmTokensRef.load(id);
  if (!userGmTokensRef) {
    userGmTokensRef = new UserGmTokensRef(id);
    userGmTokensRef.save();
  }

  return userGmTokensRef.latestAction
    ? UserGmTokensAction.load(userGmTokensRef.latestAction)
    : null;
}

function updateLatestUserGmTokensChange(
  account: string,
  marketAddress: string,
  latestChange: UserGmTokensAction
): void {
  let id = account + ":" + marketAddress;
  let userGmTokensRef = UserGmTokensRef.load(id);
  if (!userGmTokensRef) {
    userGmTokensRef = new UserGmTokensRef(id);
  }

  userGmTokensRef.latestAction = latestChange.id;
  userGmTokensRef.save();
}
