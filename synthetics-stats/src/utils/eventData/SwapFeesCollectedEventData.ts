import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Ctx } from "../eventData";
/*
EventLog1: SwapFeesCollected
  Data:
    uiFeeReceiver: 0x0000000000000000000000000000000000000000 (address)
    market: 0xDdF708B284C5C26BE67Adf9C51DFa935b5035bF8 (address)
    token: 0x82F0b3695Ed2324e55bbD9A9554cB4192EC3a514 (address)
    tokenPrice: 1829399400000000 (uint)
    feeReceiverAmount: 259000000000000 (uint)
    feeAmountForPool: 441000000000000 (uint)
    amountAfterFees: 999300000000000000 (uint)
    uiFeeReceiverFactor: 0 (uint)
    uiFeeAmount: 0 (uint)
    tradeKey: 0x88faea5e120893f278b9948effb8ad60b2f9e323039dfcc9038434218b715818 (bytes32)
    action: deposit (string)
*/

export class SwapFeesCollectedEventData {
  constructor(private ctx: Ctx) {}

  get uiFeeReceiver(): string {
    return this.ctx.getAddressItemString("uiFeeReceiver");
  }

  get market(): string {
    return this.ctx.getAddressItemString("market");
  }

  get token(): string {
    return this.ctx.getAddressItemString("token");
  }

  get tokenPrice(): BigInt {
    return this.ctx.getUintItem("tokenPrice");
  }

  get feeReceiverAmount(): BigInt {
    return this.ctx.getUintItem("feeReceiverAmount");
  }

  get feeAmountForPool(): BigInt {
    return this.ctx.getUintItem("feeAmountForPool");
  }

  get amountAfterFees(): BigInt {
    return this.ctx.getUintItem("amountAfterFees");
  }

  get uiFeeReceiverFactor(): BigInt {
    return this.ctx.getUintItem("uiFeeReceiverFactor");
  }

  get uiFeeAmount(): BigInt {
    return this.ctx.getUintItem("uiFeeAmount");
  }

  get tradeKey(): string {
    return this.ctx.getBytes32Item("tradeKey").toHexString();
  }

  get action(): string {
    return this.ctx.getStringItem("action");
  }

  get swapFeeType(): Bytes | null {
    return this.ctx.getBytes32ItemOrNull("swapFeeType");
  }
}