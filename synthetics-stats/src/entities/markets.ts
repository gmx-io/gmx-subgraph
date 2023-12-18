import { log, BigInt } from "@graphprotocol/graph-ts";
import { MarketInfo } from "../../generated/schema";
import { marketConfigs } from "../config/markets";
import { EventData } from "../utils/eventData";

let ZERO = BigInt.fromI32(0);

export function saveMarketInfo(eventData: EventData): MarketInfo {
  let id = eventData.getAddressItemString("marketToken")!;
  let marketInfo = new MarketInfo(id);
  marketInfo.marketToken = id;
  marketInfo.indexToken = eventData.getAddressItemString("indexToken")!;
  marketInfo.longToken = eventData.getAddressItemString("longToken")!;
  marketInfo.shortToken = eventData.getAddressItemString("shortToken")!;
  marketInfo.marketTokensSupply = BigInt.fromI32(0);
  marketInfo.save();

  return marketInfo as MarketInfo;
}

export function getMarketInfo(marketAddress: string): MarketInfo {
  let entity = MarketInfo.load(marketAddress);

  if (!entity) {
    let marketConfig = marketConfigs.get(marketAddress);

    if (marketConfig) {
      entity = new MarketInfo(marketAddress);
      entity.marketToken = marketConfig.marketToken;
      entity.indexToken = marketConfig.indexToken;
      entity.longToken = marketConfig.longToken;
      entity.shortToken = marketConfig.shortToken;
      entity.save();
    } else {
      log.error("MarketInfo not found {}", [marketAddress]);
      throw new Error("MarketInfo not found");
    }
  }

  return entity!;
}

export function saveMarketInfoTokensSupply(marketAddress: string, value: BigInt): void {
  let marketInfo = getMarketInfo(marketAddress);
  marketInfo.marketTokensSupply = marketInfo.marketTokensSupply.plus(value);
  marketInfo.save();
}
