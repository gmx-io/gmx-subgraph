import { BigInt } from "@graphprotocol/graph-ts";
import { EventData } from "../eventData";

/*
EventLog1: MarketPoolValueUpdated
    market: 0x70d95587d40A2caf56bd97485aB3Eec10Bee6336 (address)
    longTokenAmount: 6088502165509350933813 (uint)
    shortTokenAmount: 8119820180338 (uint)
    longTokenUsd: 9633508212528878869740167823194370000 (uint)
    shortTokenUsd: 8120756882794003791680000000000000000 (uint)
    totalBorrowingFees: 24253064237319177760800158997305547 (uint)
    borrowingFeePoolFactor: 630000000000000000000000000000 (uint)
    impactPoolAmount: 166464092070843159 (uint)
    marketTokensSupply: 19248245443925757180323660 (uint)
    poolValue: 17737043886648522121801267453574866671 (int)
    longPnl: -141367923758120031205672774014364584 (int)
    shortPnl: 173605186765705231507747816140980407 (int)
    netPnl: 32237263007585200302075042126615823 (int)
    actionType: 0x607991fc5963e264f1a94faa126c63482fdc5af14a656f08751dc8b0c5d47630 (bytes32)
    tradeKey: 0xabbce870896391ae4548dd2ed4fe3505b0c1a4d7f343bde492ec89717c8d30e5 (bytes32)
*/
export class MarketPoolValueUpdatedEventData {
  constructor(private eventData: EventData) {}

  get market(): string {
    return this.eventData.getAddressItemString("market")!;
  }

  get longTokenAmount(): BigInt {
    return this.eventData.getUintItem("longTokenAmount")!;
  }

  get shortTokenAmount(): BigInt {
    return this.eventData.getUintItem("shortTokenAmount")!;
  }

  get longTokenUsd(): BigInt {
    return this.eventData.getUintItem("longTokenUsd")!;
  }

  get shortTokenUsd(): BigInt {
    return this.eventData.getUintItem("shortTokenUsd")!;
  }

  get totalBorrowingFees(): BigInt {
    return this.eventData.getUintItem("totalBorrowingFees")!;
  }

  get borrowingFeePoolFactor(): BigInt {
    return this.eventData.getUintItem("borrowingFeePoolFactor")!;
  }

  get impactPoolAmount(): BigInt {
    return this.eventData.getUintItem("impactPoolAmount")!;
  }

  get marketTokensSupply(): BigInt {
    return this.eventData.getUintItem("marketTokensSupply")!;
  }

  get poolValue(): BigInt {
    return this.eventData.getIntItem("poolValue")!;
  }

  get longPnl(): BigInt {
    return this.eventData.getIntItem("longPnl")!;
  }

  get shortPnl(): BigInt {
    return this.eventData.getIntItem("shortPnl")!;
  }

  get netPnl(): BigInt {
    return this.eventData.getIntItem("netPnl")!;
  }

  get actionType(): string {
    return this.eventData.getBytes32Item("actionType")!.toHexString();
  }

  get tradeKey(): string {
    return this.eventData.getBytes32Item("tradeKey")!.toHexString();
  }
}
