import { BigInt } from "@graphprotocol/graph-ts";
import { EventData } from "../eventData";

/*
EventLog2: ClaimableCollateralUpdated

eventData.addressItems.initItems(2);
eventData.addressItems.setItem(0, "market", market);
eventData.addressItems.setItem(1, "token", token);

eventData.uintItems.initItems(2);
eventData.uintItems.setItem(0, "timeKey", timeKey);
eventData.uintItems.setItem(1, "factor", factor);
*/

export class SetClaimableCollateralFactorForTimeEventData {
  constructor(private eventData: EventData) {}

  get market(): string {
    return this.eventData.getAddressItemString("market")!;
  }

  get token(): string {
    return this.eventData.getAddressItemString("token")!;
  }

  get timeKey(): string {
    return this.eventData.getUintItem("timeKey")!.toString();
  }

  get factor(): BigInt {
    return this.eventData.getUintItem("factor")!;
  }
}
