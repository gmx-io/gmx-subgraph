import { log, BigInt } from "@graphprotocol/graph-ts";
import { MarketInfo } from "../../generated/schema";
import { EventData } from "../utils/eventData";

export function saveMarketInfo(eventData: EventData): MarketInfo {
  let id = eventData.getAddressItemString("marketToken")!;
  let marketInfo = new MarketInfo(id);
  marketInfo.marketToken = id;
  marketInfo.indexToken = eventData.getAddressItemString("indexToken")!;
  marketInfo.longToken = eventData.getAddressItemString("longToken")!;
  marketInfo.shortToken = eventData.getAddressItemString("shortToken")!;
  marketInfo.marketTokensSupply = BigInt.fromI32(0);
  marketInfo.save();

  return marketInfo!;
}

export function saveMarketPoolValueInfo(eventData: EventData): void {
  let id = eventData.getAddressItemString("market")!;
  let marketInfo = getMarketInfo(id);

  marketInfo.marketTokensSupply = eventData.getUintItem("marketTokensSupply")!

  marketInfo.save();
}

export function getMarketInfo(id: string): MarketInfo {
  let entity = MarketInfo.load(id);

  if (entity == null) {
    log.warning("market {} does not exist", [id])
    throw Error("Market does not exist")
  }
  
  return entity!;
}