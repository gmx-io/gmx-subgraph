import { BigInt, log } from "@graphprotocol/graph-ts";
import { ClaimableCollateral, ClaimableCollateralGroup } from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { ClaimableCollateralUpdatedEventData } from "../utils/eventData/ClaimableCollateralUpdatedEventData";
import { CollateralClaimedEventData } from "../utils/eventData/CollateralClaimedEventData";
import { SetClaimableCollateralFactorForTimeEventData } from "../utils/eventData/SetClaimableCollateralFactorForTime";
import { SetClaimableCollateralFactorForAccountEventData } from "../utils/eventData/SetClaimableCollateralFactorForAccount";

export function handleClaimableCollateralUpdated(eventData: EventData): void {
  let data = new ClaimableCollateralUpdatedEventData(eventData);
  let entity = getOrCreateClaimableCollateral(data.account, data.market, data.token, data.timeKey);
  let groupEntity = getOrCreateClaimableCollateralGroup(data.market, data.token, data.timeKey);

  entity.value = data.nextValue;
  entity.factorByTime = groupEntity.factor;

  let claimables = groupEntity.claimables;

  if (!claimables.includes(entity.id)) {
    claimables.push(entity.id);
  }

  groupEntity.claimables = claimables;

  entity.save();
  groupEntity.save();
}

export function handleSetClaimableCollateralFactorForTime(eventData: EventData): void {
  let data = new SetClaimableCollateralFactorForTimeEventData(eventData);

  let entity = getOrCreateClaimableCollateralGroup(data.market, data.token, data.timeKey);

  entity.factor = data.factor;

  let claimables = entity.claimables;

  for (let i = 0; i < claimables.length; i++) {
    let id = claimables[i];

    if (!id) {
      log.warning("ClaimableCollateral id is undefined {}", [i.toString()]);
      throw new Error("ClaimableCollateral id is undefined");
    }

    let claimable = ClaimableCollateral.load(id.toString());

    if (claimable == null) {
      log.warning("ClaimableCollateral not found {}", [id]);
      throw new Error("ClaimableCollateral not found");
    }

    claimable.factorByTime = data.factor;
    claimable.save();
  }

  entity.save();
}

export function handleSetClaimableCollateralFactorForAccount(eventData: EventData): void {
  let data = new SetClaimableCollateralFactorForAccountEventData(eventData);

  let entity = getOrCreateClaimableCollateral(data.account, data.market, data.token, data.timeKey);

  entity.factor = data.factor;

  entity.save();
}

export function handleCollateralClaimed(eventData: EventData): void {
  let data = new CollateralClaimedEventData(eventData);

  let entity = getOrCreateClaimableCollateral(data.account, data.market, data.token, data.timeKey);
  entity.claimed = true;
  entity.save();
}

function getOrCreateClaimableCollateral(
  account: string,
  market: string,
  token: string,
  timeKey: string
): ClaimableCollateral {
  let id = account + ":" + market + ":" + token + ":" + timeKey;

  let entity = ClaimableCollateral.load(id);

  if (entity == null) {
    entity = new ClaimableCollateral(id);
    entity.account = account;
    entity.marketAddress = market;
    entity.tokenAddress = token;
    entity.timeKey = timeKey;
    entity.claimed = false;
    entity.factor = BigInt.fromI32(0);
  }

  return entity!;
}

function getOrCreateClaimableCollateralGroup(market: string, token: string, timeKey: string): ClaimableCollateralGroup {
  let id = market + ":" + token + ":" + timeKey.toString();
  let entity = ClaimableCollateralGroup.load(id);

  if (entity == null) {
    entity = new ClaimableCollateralGroup(id);
    entity.marketAddress = market;
    entity.tokenAddress = token;
    entity.timeKey = timeKey;
    entity.claimables = new Array<string>(0);
    entity.factor = BigInt.fromI32(0);
  }

  return entity!;
}
