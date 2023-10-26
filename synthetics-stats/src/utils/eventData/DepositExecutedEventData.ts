import { BigInt } from "@graphprotocol/graph-ts";
import { EventData } from "../eventData";

/*
EventLog2: DepositExecuted
account: 0xc9e1CE91d3f782499cFe787b6F1d2AF0Ca76C049 (address)
longTokenAmount: 0 (uint)
shortTokenAmount: 500000000 (uint)
receivedMarketTokens: 3252482413094614694063 (uint)
key: 0x800512721db4496a37259bf3a2f03c307c1dcd051770703bf6246a2c1af04824 (bytes32)
*/

export class DepositExecutedEventEventData {
  constructor(private eventData: EventData) {}

  get account(): string {
    return this.eventData.getAddressItemString("account")!;
  }

  get longTokenAmount(): BigInt {
    return this.eventData.getUintItem("longTokenAmount")!;
  }

  get shortTokenAmount(): BigInt {
    return this.eventData.getUintItem("shortTokenAmount")!;
  }

  get receivedMarketTokens(): BigInt {
    return this.eventData.getUintItem("receivedMarketTokens")!;
  }

  get key(): string {
    return this.eventData.getBytes32Item("key")!.toHexString();
  }
}
