import { BigInt } from "@graphprotocol/graph-ts";
import { EventData } from "../eventData";

/*
EventLog1: ClaimableCollateralUpdated

market: 0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9 (address)
token: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 (address)
account: 0xC91CC0d42A48bCE63C4223C630daecF364E451C9 (address)
timeKey: 473159 (uint)
delta: 4101823255 (uint)
nextValue: 4101823255 (uint)
nextPoolValue: 45965608008 (uint)
*/

export class ClaimableCollateralUpdatedEventData {
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

  get timeKey(): string {
    return this.eventData.getUintItem("timeKey")!.toString();
  }

  get delta(): BigInt {
    return this.eventData.getUintItem("delta")!;
  }

  get nextValue(): BigInt {
    return this.eventData.getUintItem("nextValue")!;
  }

  get nextPoolValue(): BigInt {
    return this.eventData.getUintItem("nextPoolValue")!;
  }
}
