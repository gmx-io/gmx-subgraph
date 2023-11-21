import { BigInt } from "@graphprotocol/graph-ts";
import { Ctx } from "../eventData";

/*
token: 0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62 (address)
minPrice: 307124596764500000000000000 (uint)
maxPrice: 307136214319700000000000000 (uint)
timestamp: 1698042828 (uint)
priceSourceType: 2 (uint)
*/

export class OraclePriceUpdateEventData {
  constructor(private ctx: Ctx) {}

  get token(): string {
    return this.ctx.getAddressItemString("token");
  }

  get minPrice(): BigInt {
    return this.ctx.getUintItem("minPrice");
  }

  get maxPrice(): BigInt {
    return this.ctx.getUintItem("maxPrice");
  }

  get timestamp(): BigInt {
    return this.ctx.getUintItem("timestamp");
  }

  get priceSourceType(): BigInt {
    return this.ctx.getUintItem("priceSourceType");
  }
}
