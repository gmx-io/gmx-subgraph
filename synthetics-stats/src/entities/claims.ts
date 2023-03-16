import { BigInt } from "@graphprotocol/graph-ts";
import { ClaimCollateralAction, Transaction } from "../../generated/schema";
import { EventData } from "../utils/eventData";

export function handleCollateralClaimAction(
  eventData: EventData,
  transaction: Transaction,
  eventName: string
): ClaimCollateralAction {
  let account = eventData.getAddressItemString("account")!;

  let id = transaction.id + ":" + account + ":" + eventName;

  let claimAction = getOrCreateClaimCollateralAction(id);

  claimAction.eventName = eventName;
  claimAction.account = account;

  let marketAddresses = claimAction.marketAddresses;
  marketAddresses.push(eventData.getAddressItemString("market")!);
  claimAction.marketAddresses = marketAddresses;

  let tokenAddresses = claimAction.tokenAddresses;
  tokenAddresses.push(eventData.getAddressItemString("token")!);
  claimAction.tokenAddresses = tokenAddresses;

  let amounts = claimAction.amounts;
  amounts.push(eventData.getUintItem("amount")!);
  claimAction.amounts = amounts;

  claimAction.transaction = transaction.id;

  claimAction.save();

  return claimAction;
}

export function getOrCreateClaimCollateralAction(
  id: string
): ClaimCollateralAction {
  let entity = ClaimCollateralAction.load(id);

  if (!entity) {
    entity = new ClaimCollateralAction(id);
    entity.marketAddresses = new Array<string>(0);
    entity.tokenAddresses = new Array<string>(0);
    entity.amounts = new Array<BigInt>(0);
  }

  return entity as ClaimCollateralAction;
}
