import { BigInt } from "@graphprotocol/graph-ts";
import { EventData } from "../eventData";

/*
EventLog2: DepositCreated
    account: 0x0000000000000000000000000000000000000000 (address)
    receiver: 0x0000000000000000000000000000000000000000 (address)
    callbackContract: 0x0000000000000000000000000000000000000000 (address)
    market: 0x339eF6aAcF8F4B2AD15BdcECBEED1842Ec4dBcBf (address)
    initialLongToken: 0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62 (address)
    initialShortToken: 0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5 (address)
    longTokenSwapPath: [] (address)
    shortTokenSwapPath: [] (address)
    initialLongTokenAmount: 0 (uint)
    initialShortTokenAmount: 500000000 (uint)
    minMarketTokens: 3222324039216131002547 (uint)
    updatedAtBlock: 48401308 (uint)
    executionFee: 220000000000000 (uint)
    callbackGasLimit: 0 (uint)
    shouldUnwrapNativeToken: false (bool)
    key: 0x0000000000000012345 (bytes32)
*/

export class DepositCreatedEventEventData {
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

  get initialLongToken(): string {
    return this.eventData.getAddressItemString("initialLongToken")!;
  }

  get initialShortToken(): string {
    return this.eventData.getAddressItemString("initialShortToken")!;
  }

  get longTokenSwapPath(): string[] {
    return this.eventData.getAddressArrayItemString("longTokenSwapPath")!;
  }

  get shortTokenSwapPath(): string[] {
    return this.eventData.getAddressArrayItemString("shortTokenSwapPath")!;
  }

  get initialLongTokenAmount(): BigInt {
    return this.eventData.getUintItem("initialLongTokenAmount")!;
  }

  get initialShortTokenAmount(): BigInt {
    return this.eventData.getUintItem("initialShortTokenAmount")!;
  }

  get minMarketTokens(): BigInt {
    return this.eventData.getUintItem("minMarketTokens")!;
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
