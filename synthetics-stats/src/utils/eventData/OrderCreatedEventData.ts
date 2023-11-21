import { BigInt } from "@graphprotocol/graph-ts";
import { Ctx } from "../eventData";

/*
EventLog2: OrderCreated
    account: 0xc9e1CE91d3f782499cFe787b6F1d2AF0Ca76C049 (address)
    receiver: 0xc9e1CE91d3f782499cFe787b6F1d2AF0Ca76C049 (address)
    callbackContract: 0x0000000000000000000000000000000000000000 (address)
    uiFeeReceiver: 0x0000000000000000000000000000000000000000 (address)
    market: 0x0000000000000000000000000000000000000000 (address)
    initialCollateralToken: 0x7b7c6c49fA99b37270077FBFA398748c27046984 (address)
    swapPath: ["0x22B9076BBCD93E491999AA748fDD6623fa019532","0x1529876A9348D61C6c4a3EEe1fe6CbF1117Ca315"] (address)
    orderType: 0 (uint)
    decreasePositionSwapType: 0 (uint)
    sizeDeltaUsd: 0 (uint)
    initialCollateralDeltaAmount: 1000000000000000000 (uint)
    triggerPrice: 0 (uint)
    acceptablePrice: 0 (uint)
    executionFee: 605000000000000 (uint)
    callbackGasLimit: 0 (uint)
    minOutputAmount: 1226156718486731 (uint)
    updatedAtBlock: 54293843 (uint)
    isLong: false (bool)
    shouldUnwrapNativeToken: true (bool)
    isFrozen: false (bool)
    key: 0x880b1710b27cb59aa3c26f34e6776300aefb6758f8cbd648aba0034b8743278e (bytes32)
*/

export class OrderCreatedEventData {
  constructor(private ctx: Ctx) {}

  get account(): string {
    return this.ctx.getAddressItemString("account");
  }

  get receiver(): string {
    return this.ctx.getAddressItemString("receiver");
  }

  get callbackContract(): string {
    return this.ctx.getAddressItemString("callbackContract");
  }

  get uiFeeReceiver(): string {
    return this.ctx.getAddressItemString("uiFeeReceiver");
  }

  get market(): string {
    return this.ctx.getAddressItemString("market");
  }

  get initialCollateralToken(): string {
    return this.ctx.getAddressItemString("initialCollateralToken");
  }

  get swapPath(): Array<string> | null {
    return this.ctx.getAddressArrayItemStringOrNull("swapPath");
  }

  get orderType(): BigInt {
    return this.ctx.getUintItem("orderType");
  }

  get decreasePositionSwapType(): BigInt {
    return this.ctx.getUintItem("decreasePositionSwapType");
  }

  get sizeDeltaUsd(): BigInt {
    return this.ctx.getUintItem("sizeDeltaUsd");
  }

  get initialCollateralDeltaAmount(): BigInt {
    return this.ctx.getUintItem("initialCollateralDeltaAmount");
  }

  get triggerPrice(): BigInt {
    return this.ctx.getUintItem("triggerPrice");
  }

  get acceptablePrice(): BigInt {
    return this.ctx.getUintItem("acceptablePrice");
  }

  get executionFee(): BigInt {
    return this.ctx.getUintItem("executionFee");
  }

  get callbackGasLimit(): BigInt {
    return this.ctx.getUintItem("callbackGasLimit");
  }

  get minOutputAmount(): BigInt {
    return this.ctx.getUintItem("minOutputAmount");
  }

  get updatedAtBlock(): BigInt {
    return this.ctx.getUintItem("updatedAtBlock");
  }

  get isLong(): boolean {
    return this.ctx.getBoolItem("isLong");
  }

  get shouldUnwrapNativeToken(): boolean {
    return this.ctx.getBoolItem("shouldUnwrapNativeToken");
  }

  get isFrozen(): boolean {
    return this.ctx.getBoolItem("isFrozen");
  }

  get key(): string {
    return this.ctx.getBytes32Item("key").toHexString();
  }
}
