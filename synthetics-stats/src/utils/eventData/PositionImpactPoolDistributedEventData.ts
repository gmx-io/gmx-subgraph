import { BigInt } from "@graphprotocol/graph-ts";
import { Ctx } from "../eventData";

/*
market: 0x339eF6aAcF8F4B2AD15BdcECBEED1842Ec4dBcBf (address)
distributionAmount: 16278 (uint)
nextPositionImpactPoolAmount: 661876257 (uint)
*/

export class PositionImpactPoolDistributedEventData {
  constructor(private ctx: Ctx) {}

  get market(): string {
    return this.ctx.getAddressItemString("market");
  }

  get distributionAmount(): BigInt {
    return this.ctx.getUintItem("distributionAmount");
  }

  get nextPositionImpactPoolAmount(): BigInt {
    return this.ctx.getUintItem("nextPositionImpactPoolAmount");
  }
}
