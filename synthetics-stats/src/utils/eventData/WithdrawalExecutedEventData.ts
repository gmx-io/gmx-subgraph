import { EventData } from "../eventData";

/*
EventLog2: WithdrawalExecuted
account: 0x000000000 (address)
key: 0x000000cd7f99ce665bde7247f448e582be12c5b25f6869358c07a093 (bytes32)
*/

export class WithdrawalExecutedEventData {
  constructor(private eventData: EventData) {}

  get account(): string {
    return this.eventData.getAddressItemString("account")!;
  }

  get key(): string {
    return this.eventData.getBytes32Item("key")!.toHexString();
  }
}
