import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import {
  EventLog,
  EventLog1,
  EventLog2,
  EventLogEventDataAddressItemsArrayItemsStruct,
  EventLogEventDataAddressItemsItemsStruct,
  EventLogEventDataBytesItemsArrayItemsStruct,
  EventLogEventDataBytesItemsItemsStruct,
  EventLogEventDataStringItemsArrayItemsStruct,
  EventLogEventDataStruct,
  EventLogEventDataUintItemsArrayItemsStruct,
  EventLogEventDataUintItemsItemsStruct
} from "../../generated/EventEmitter/EventEmitter";
import { Transaction as TransactionEntity } from "../../generated/schema";
import { getIdFromEvent, getOrCreateTransaction } from "../entities/common";

export function createEventDataFromEvent<T extends ethereum.Event>(event: T, network: string): EventData {
  if (event instanceof EventLog) {
    return new EventData(event, event.params.eventData, event.params.eventName, network);
  } else if (event instanceof EventLog1) {
    return new EventData(event, event.params.eventData as EventLogEventDataStruct, event.params.eventName, network);
  } else if (event instanceof EventLog2) {
    return new EventData(event, event.params.eventData as EventLogEventDataStruct, event.params.eventName, network);
  }

  log.warning("Unknown event", []);
  throw new Error("unknown event");
}

export class EventData {
  _cachedTransaction: TransactionEntity | null = null;
  _cachedEventId: string | null = null;

  constructor(
    private rawEvent: ethereum.Event,
    private rawData: EventLogEventDataStruct,
    public eventName: string,
    public network: string
  ) {}

  get transaction(): TransactionEntity {
    if (this._cachedTransaction == null) {
      this._cachedTransaction = getOrCreateTransaction(this.rawEvent);
    }

    return this._cachedTransaction as TransactionEntity;
  }

  get timestamp(): i32 {
    return this.transaction.timestamp;
  }

  get eventId(): string {
    if (this._cachedEventId == null) {
      this._cachedEventId = getIdFromEvent(this.rawEvent);
    }

    return this._cachedEventId as string;
  }

  getAddressItemOrNull(key: string): Address | null {
    return getItemByKey<Address, EventLogEventDataAddressItemsItemsStruct>(this.rawData.addressItems.items, key);
  }

  getAddressItem(key: string): Address {
    let result = this.getAddressItemOrNull(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getAddressItemStringOrNull(key: string): string | null {
    let item = this.getAddressItemOrNull(key);

    if (item != null) {
      return item.toHexString();
    }

    return null;
  }

  getAddressItemString(key: string): string {
    let result = this.getAddressItemStringOrNull(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getAddressArrayItemOrNull(key: string): Array<Address> | null {
    return getItemByKey<Array<Address>, EventLogEventDataAddressItemsArrayItemsStruct>(
      this.rawData.addressItems.arrayItems,
      key
    );
  }

  getAddressArrayItem(key: string): Array<Address> {
    let result = this.getAddressArrayItemOrNull(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getAddressArrayItemStringOrNull(key: string): Array<string> | null {
    let items = this.getAddressArrayItemOrNull(key);

    if (items != null) {
      let _items = items as Array<Address>;
      let stringsArray = new Array<string>(items.length);

      for (let i = 0; i < _items.length; i++) {
        let item = _items[i] as Address;
        stringsArray[i] = item.toHexString();
      }

      return stringsArray;
    }

    return null;
  }

  getStringItemOrNull(key: string): string | null {
    let items = this.rawData.stringItems.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].key == key) {
        return items[i].value;
      }
    }

    return null;
  }

  getStringItem(key: string): string {
    let result = this.getStringItemOrNull(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getStringArrayItemOrNull(key: string): Array<string> | null {
    return getItemByKey<Array<string>, EventLogEventDataStringItemsArrayItemsStruct>(
      this.rawData.stringItems.arrayItems,
      key
    );
  }

  getStringArrayItem(key: string): Array<string> {
    let result = this.getStringArrayItemOrNull(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getUintItemOrNull(key: string): BigInt | null {
    return getItemByKey<BigInt, EventLogEventDataUintItemsItemsStruct>(this.rawData.uintItems.items, key);
  }

  getUintItem(key: string): BigInt {
    let result = this.getUintItemOrNull(key);
    if (result == null || !result) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getUintArrayItemOrNull(key: string): Array<BigInt> | null {
    return getItemByKey<Array<BigInt>, EventLogEventDataUintItemsArrayItemsStruct>(
      this.rawData.uintItems.arrayItems,
      key
    );
  }

  getUintArrayItem(key: string): Array<BigInt> {
    let result = this.getUintArrayItemOrNull(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getIntItemOrNull(key: string): BigInt | null {
    return getItemByKey<BigInt, EventLogEventDataUintItemsItemsStruct>(
      this.rawData.intItems.items as Array<EventLogEventDataUintItemsItemsStruct>,
      key
    );
  }

  getIntItem(key: string): BigInt {
    let result = this.getIntItemOrNull(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getIntArrayItemOrNull(key: string): Array<BigInt> | null {
    return getItemByKey<Array<BigInt>, EventLogEventDataUintItemsArrayItemsStruct>(
      this.rawData.intItems.arrayItems,
      key
    );
  }

  getIntArrayItem(key: string): Array<BigInt> {
    let result = this.getIntArrayItemOrNull(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getBytesItemOrNull(key: string): Bytes | null {
    return getItemByKey<Bytes, EventLogEventDataBytesItemsItemsStruct>(this.rawData.bytesItems.items, key);
  }

  getBytesItem(key: string): Bytes {
    let result = this.getBytesItemOrNull(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getBytesArrayItemOrNull(key: string): Array<Bytes> | null {
    return getItemByKey<Array<Bytes>, EventLogEventDataBytesItemsArrayItemsStruct>(
      this.rawData.bytesItems.arrayItems,
      key
    );
  }

  getBytesArrayItem(key: string): Array<Bytes> {
    let result = this.getBytesArrayItemOrNull(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getBytes32ItemOrNull(key: string): Bytes | null {
    return getItemByKey<Bytes, EventLogEventDataBytesItemsItemsStruct>(
      this.rawData.bytes32Items.items as Array<EventLogEventDataBytesItemsItemsStruct>,
      key
    );
  }

  getBytes32Item(key: string): Bytes {
    let result = this.getBytes32ItemOrNull(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getBytes32ArrayItemOrNull(key: string): Array<Bytes> | null {
    return getItemByKey<Array<Bytes>, EventLogEventDataBytesItemsArrayItemsStruct>(
      this.rawData.bytes32Items.arrayItems,
      key
    );
  }

  getBytes32ArrayItem(key: string): Array<Bytes> {
    let result = this.getBytes32ArrayItemOrNull(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  // boolean type is not nullable in AssemblyScript, so we return false if the key is not found
  getBoolItemOrFalse(key: string): boolean {
    let items = this.rawData.boolItems.items;

    for (let i = 0; i < items.length; i++) {
      if (items[i].key == key) {
        return items[i].value;
      }
    }

    return false;
  }

  getBoolItem(key: string): boolean {
    let items = this.rawData.boolItems.items;

    for (let i = 0; i < items.length; i++) {
      if (items[i].key == key) {
        return items[i].value;
      }
    }

    log.warning("received null for key {}", [key]);
    throw new Error("received null");
  }
}

class EventDataItem<T> extends ethereum.Tuple {
  get key(): string {
    return this[0].toString();
  }

  get value(): T {
    return this[1] as T;
  }
}

function getItemByKey<T, TItem extends EventDataItem<T>>(items: Array<TItem>, key: string): T | null {
  for (let i = 0; i < items.length; i++) {
    if (items[i].key == key) {
      return items[i].value;
    }
  }

  return null;
}
