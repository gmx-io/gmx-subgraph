import { BigInt } from "@graphprotocol/graph-ts";
import { MarketInfo, PoolValue } from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { DebugMarketInfo, markets } from "../config/markets";

export function saveMarketInfo(eventData: EventData): MarketInfo {
  let id = eventData.getAddressItemString("marketToken")!;
  let marketInfo = new MarketInfo(id);
  marketInfo.marketToken = id;
  marketInfo.indexToken = eventData.getAddressItemString("indexToken")!;
  marketInfo.longToken = eventData.getAddressItemString("longToken")!;
  marketInfo.shortToken = eventData.getAddressItemString("shortToken")!;
  marketInfo.save();

  let poolValueRef = new PoolValue(id);
  poolValueRef.poolValue = BigInt.fromI32(0);
  poolValueRef.pendingFeeUsds = new Array<BigInt>(0);
  poolValueRef.pendingCollectedMarketFeesInfoIds = new Array<string>(0);
  poolValueRef.save();

  return marketInfo as MarketInfo;
}
