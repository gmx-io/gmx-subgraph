import { BigInt } from "@graphprotocol/graph-ts";
import { EventData } from "../eventData";

/*
eventData.addressItems.initItems(4);
eventData.addressItems.setItem(0, "market", market);
eventData.addressItems.setItem(1, "token", token);
eventData.addressItems.setItem(2, "account", account);
eventData.addressItems.setItem(3, "receiver", receiver);

eventData.uintItems.initItems(3);
eventData.uintItems.setItem(0, "timeKey", timeKey);
eventData.uintItems.setItem(1, "amount", amount);
eventData.uintItems.setItem(2, "nextPoolValue", nextPoolValue);

eventEmitter.emitEventLog1(
    "CollateralClaimed",
    Cast.toBytes32(account),
    eventData
);
*/

export class CollateralClaimedEventData {
  constructor(private eventData: EventData) {}

  get market(): string {
    return this.eventData.getAddressItemString("market")!;
  }

  get token(): string {
    return this.eventData.getAddressItemString("token")!;
  }

  get account(): string {
    return this.eventData.getAddressItemString("account")!;
  }

  get receiver(): string {
    return this.eventData.getAddressItemString("receiver")!;
  }

  get timeKey(): string {
    return this.eventData.getUintItem("timeKey")!.toString();
  }

  get amount(): BigInt {
    return this.eventData.getUintItem("amount")!;
  }

  get nextPoolValue(): BigInt {
    return this.eventData.getUintItem("nextPoolValue")!;
  }
}
