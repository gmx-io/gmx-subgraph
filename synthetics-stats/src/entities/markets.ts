import { MarketPoolValueInfo } from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { timestampToPeriodStart } from "../utils/time";

export function saveMarketPoolValueInfoForPeriod(
  eventData: EventData,
  period: string,
  timestamp: i32
): void {
 let entity = getOrCreateMarketPoolValueInfo(eventData, period, timestamp);
 
 entity.marketTokensSupply = eventData.getUintItem("marketTokensSupply")!;
 entity.poolValue = eventData.getIntItem("poolValue")!;
 entity.save();
}

function getOrCreateMarketPoolValueInfo(
  eventData: EventData,
  period: string,
  timestamp: i32
): MarketPoolValueInfo {
  let marketAddress = eventData.getAddressItemString("market")!;
  let timestampGroup = timestampToPeriodStart(timestamp, period);
  let id = marketAddress + ":" + period;
  if (period != "total") {
    id += ":" + timestampGroup.toString();
  }
  let entity = MarketPoolValueInfo.load(id);
  if (entity == null) {
    entity = new MarketPoolValueInfo(id);
    entity.marketAddress = marketAddress;
    entity.period = period;
    entity.timestampGroup = timestampGroup;
  }
  return entity as MarketPoolValueInfo;
}