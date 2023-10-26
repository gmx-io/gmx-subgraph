import { BigInt } from "@graphprotocol/graph-ts";
import { EventData } from "../eventData";

/*
EventLog2: WithdrawalCreated
account: 0x0000000000000000000000000000000000000000 (address)
receiver: 0x0000000000000000000000000000000000000000 (address)
callbackContract: 0x0000000000000000000000000000000000000000 (address)
market: 0x339eF6aAcF8F4B2AD15BdcECBEED1842Ec4dBcBf (address)
longTokenSwapPath: [] (address)
shortTokenSwapPath: [] (address)
marketTokenAmount: 1775745206846571315804 (uint)
minLongTokenAmount: 3713934 (uint)
minShortTokenAmount: 997000000 (uint)
updatedAtBlock: 48568097 (uint)
executionFee: 220000000000000 (uint)
callbackGasLimit: 0 (uint)
shouldUnwrapNativeToken: false (bool)
key: 0x00000000000000000000000000000000000000001234 (bytes32)
*/

export class WithdrawalCreatedEventData {
  constructor(private eventData: EventData) {}

  get account(): string {
    return this.eventData.getAddressItemString("account")!;
  }

  get receiver(): string {
    return this.eventData.getAddressItemString("receiver")!;
  }

  get callbackContract(): string {
    return this.eventData.getAddressItemString("callbackContract")!;
  }

  get market(): string {
    return this.eventData.getAddressItemString("market")!;
  }

  get longTokenSwapPath(): string[] {
    return this.eventData.getAddressArrayItemString("longTokenSwapPath")!;
  }

  get shortTokenSwapPath(): string[] {
    return this.eventData.getAddressArrayItemString("shortTokenSwapPath")!;
  }

  get marketTokenAmount(): BigInt {
    return this.eventData.getUintItem("marketTokenAmount")!;
  }

  get minLongTokenAmount(): BigInt {
    return this.eventData.getUintItem("minLongTokenAmount")!;
  }

  get minShortTokenAmount(): BigInt {
    return this.eventData.getUintItem("minShortTokenAmount")!;
  }

  get updatedAtBlock(): BigInt {
    return this.eventData.getUintItem("updatedAtBlock")!;
  }

  get executionFee(): BigInt {
    return this.eventData.getUintItem("executionFee")!;
  }

  get callbackGasLimit(): BigInt {
    return this.eventData.getUintItem("callbackGasLimit")!;
  }

  get shouldUnwrapNativeToken(): boolean {
    return this.eventData.getBoolItem("shouldUnwrapNativeToken")!;
  }

  get key(): string {
    return this.eventData.getBytes32Item("key")!.toHexString();
  }
}
