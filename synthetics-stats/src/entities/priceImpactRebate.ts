import { BigInt, log } from "@graphprotocol/graph-ts";
import { PriceImpactRebate, PriceImpactRebateGroup } from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { ClaimableCollateralUpdatedEventData } from "../utils/eventData/ClaimableCollateralUpdatedEventData";
import { CollateralClaimedEventData } from "../utils/eventData/CollateralClaimedEventData";
import { SetClaimableCollateralFactorForTimeEventData } from "../utils/eventData/SetClaimableCollateralFactorForTime";
import { SetClaimableCollateralFactorForAccountEventData } from "../utils/eventData/SetClaimableCollateralFactorForAccount";

export function handleClaimableCollateralUpdated(eventData: EventData): void {
  let data = new ClaimableCollateralUpdatedEventData(eventData);
  let entity = getOrCreatePriceImpactRebate(data.account, data.market, data.token, data.timeKey);
  let groupEntity = getOrCreatePriceImpactRebateGroup(data.market, data.token, data.timeKey);

  entity.value = data.nextValue;
  entity.factorByTime = groupEntity.factor;

  let rebates = groupEntity.rebates;
  rebates.push(entity.id);
  groupEntity.rebates = rebates;

  entity.save();
  groupEntity.save();
}

export function handleSetClaimableCollateralFactorForTime(eventData: EventData): void {
  let data = new SetClaimableCollateralFactorForTimeEventData(eventData);

  let entity = getOrCreatePriceImpactRebateGroup(data.market, data.token, data.timeKey);

  entity.factor = data.factor;

  let rebates = entity.rebates;

  for (let i = 0; i < rebates.length; i++) {
    let rebateId = rebates[i];

    if (!rebateId) {
      log.warning("Rebate id is undefined {}", [i.toString()]);
      throw new Error("Rebate id is undefined");
    }

    let rebate = PriceImpactRebate.load(rebateId.toString());

    if (rebate == null) {
      log.warning("Rebate not found {}", [rebateId]);
      throw new Error("Rebate not found");
    }

    rebate.factorByTime = data.factor;
    rebate.save();
  }

  entity.save();
}

export function handleSetClaimableCollateralFactorForAccount(eventData: EventData): void {
  let data = new SetClaimableCollateralFactorForAccountEventData(eventData);

  let entity = getOrCreatePriceImpactRebate(data.account, data.market, data.token, data.timeKey);

  entity.factor = data.factor;

  entity.save();
}

export function handleCollateralClaimed(eventData: EventData): void {
  let data = new CollateralClaimedEventData(eventData);

  let entity = getOrCreatePriceImpactRebate(data.account, data.market, data.token, data.timeKey);
  entity.claimed = true;
  entity.save();
}

function getOrCreatePriceImpactRebate(
  account: string,
  market: string,
  token: string,
  timeKey: string
): PriceImpactRebate {
  let id = account + ":" + market + ":" + token + ":" + timeKey;

  let entity = PriceImpactRebate.load(id);

  if (entity == null) {
    entity = new PriceImpactRebate(id);
    entity.account = account;
    entity.marketAddress = market;
    entity.tokenAddress = token;
    entity.timeKey = timeKey;
    entity.claimed = false;
    entity.factor = BigInt.fromI32(0);
  }

  return entity!;
}

function getOrCreatePriceImpactRebateGroup(market: string, token: string, timeKey: string): PriceImpactRebateGroup {
  let id = market + ":" + token + ":" + timeKey.toString();
  let entity = PriceImpactRebateGroup.load(id);

  if (entity == null) {
    entity = new PriceImpactRebateGroup(id);
    entity.marketAddress = market;
    entity.tokenAddress = token;
    entity.timeKey = timeKey;
    entity.rebates = new Array<string>(0);
    entity.factor = BigInt.fromI32(0);
  }

  return entity!;
}
