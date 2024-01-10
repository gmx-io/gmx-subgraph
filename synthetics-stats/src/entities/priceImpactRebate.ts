import { PriceImpactRebateByUser, PriceImpactRebateFactorByTime } from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { ClaimableCollateralUpdatedEventData } from "../utils/eventData/ClaimableCollateralUpdatedEventData";
import { CollateralClaimedEventData } from "../utils/eventData/CollateralClaimedEventData";
import { SetClaimableCollateralFactorForTimeEventData } from "../utils/eventData/SetClaimableCollateralFactorForTime";

export function handleClaimableCollateralUpdated(eventData: EventData): void {
  let data = new ClaimableCollateralUpdatedEventData(eventData);
  let entity = getOrCreatePriceImpactRebateByUser(data.account, data.market, data.token, data.timeKey);

  entity.value = data.nextValue;

  entity.save();
}

export function handleSetClaimableCollateralFactorForTime(eventData: EventData): void {
  let data = new SetClaimableCollateralFactorForTimeEventData(eventData);

  if (data.account) {
    let entity = getOrCreatePriceImpactRebateByUser(data.account!, data.market, data.token, data.timeKey);

    entity.factor = data.factor;

    entity.save();
  } else {
    let entity = getOrCreatePriceImpactRebateFactorByTime(data.market, data.token, data.timeKey);

    entity.factor = data.factor;

    entity.save();
  }
}

export function handleCollateralClaimed(eventData: EventData): void {
  let data = new CollateralClaimedEventData(eventData);

  let entity = getOrCreatePriceImpactRebateByUser(data.account, data.market, data.token, data.timeKey);
  entity.claimed = true;
  entity.save();
}

function getOrCreatePriceImpactRebateByUser(
  account: string,
  market: string,
  token: string,
  timeKey: string
): PriceImpactRebateByUser {
  let id = account + ":" + market + ":" + token + ":" + timeKey;

  let entity = PriceImpactRebateByUser.load(id);

  if (entity == null) {
    entity = new PriceImpactRebateByUser(id);
    entity.account = account;
    entity.marketAddress = market;
    entity.tokenAddress = token;
    entity.timeKey = timeKey;
    entity.claimed = false;
  }

  return entity!;
}

function getOrCreatePriceImpactRebateFactorByTime(
  market: string,
  token: string,
  timeKey: string
): PriceImpactRebateFactorByTime {
  let id = market + ":" + token + ":" + timeKey.toString();
  let entity = PriceImpactRebateFactorByTime.load(id);

  if (entity == null) {
    entity = new PriceImpactRebateFactorByTime(id);
    entity.marketAddress = market;
    entity.tokenAddress = token;
    entity.timeKey = timeKey;
  }

  return entity!;
}
