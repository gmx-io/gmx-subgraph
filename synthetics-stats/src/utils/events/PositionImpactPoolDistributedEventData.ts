import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import { EventData } from "../eventData";
/*
EventLog1: PositionImpactPoolDistributed 
    market: 0x339eF6aAcF8F4B2AD15BdcECBEED1842Ec4dBcBf (address)
    distributionAmount: 16278 (uint)
    nextPositionImpactPoolAmount: 661876257 (uint)
*/

export class PositionImpactPoolDistributedEventData {
  constructor(private eventData: EventData) {}

  get market(): string {
    return this.eventData.getAddressItemString("market")!;
  }

  get distributionAmount(): BigInt {
    return this.eventData.getUintItem("distributionAmount")!;
  }

  get nextPositionImpactPoolAmount(): BigInt {
    return this.eventData.getUintItem("nextPositionImpactPoolAmount")!;
  }
}
