import { TokenPrice } from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { OraclePriceUpdateEventData } from "../utils/events/OraclePriceUpdateEventData";

export function updateTokenPrice(eventData: EventData): void {
  let event = new OraclePriceUpdateEventData(eventData);
  let tokenPrice = TokenPrice.load(event.token);

  if (!tokenPrice) {
    tokenPrice = new TokenPrice(event.token);
  }

  tokenPrice.minPrice = event.minPrice;
  tokenPrice.maxPrice = event.maxPrice;

  tokenPrice.save();
}
