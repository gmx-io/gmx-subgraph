import { MarketInfo, MarketPoolValueInfo } from "../../generated/schema";
import { EventData } from "../utils/eventData";

export function saveMarketInfo(eventData: EventData): MarketInfo {
  let id = eventData.getAddressItemString("marketToken")!;
  let marketInfo = new MarketInfo(id);
  marketInfo.marketToken = id;
  marketInfo.indexToken = eventData.getAddressItemString("indexToken")!;
  marketInfo.longToken = eventData.getAddressItemString("longToken")!;
  marketInfo.shortToken = eventData.getAddressItemString("shortToken")!;
  marketInfo.save();

  return marketInfo as MarketInfo;
}

export function saveMarketPoolValueInfo(
  eventData: EventData,
): MarketPoolValueInfo {
  let entity = getOrCreateMarketPoolValueInfo(eventData.getAddressItemString("market")!);

  entity.marketTokensSupply = eventData.getUintItem("marketTokensSupply")!;
  entity.poolValue = eventData.getIntItem("poolValue")!;
  entity.save();
  
  return entity;
}

export function getMarketPoolValueInfo(
  marketAddress: string
): MarketPoolValueInfo | null {
  let id = marketAddress;
  return MarketPoolValueInfo.load(id);
}

function getOrCreateMarketPoolValueInfo(
  marketAddress: string,
): MarketPoolValueInfo {
  let id = marketAddress;
  let entity = MarketPoolValueInfo.load(id);
  if (entity == null) {
    entity = new MarketPoolValueInfo(id);
    entity.marketAddress = marketAddress;
  }
  return entity as MarketPoolValueInfo;
}
