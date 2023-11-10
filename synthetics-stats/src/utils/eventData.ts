import { Address, ethereum, BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import {
  EventLogEventDataAddressItemsItemsStruct,
  EventLogEventDataUintItemsItemsStruct,
  EventLogEventDataStruct,
  EventLogEventDataAddressItemsArrayItemsStruct,
  EventLogEventDataUintItemsArrayItemsStruct,
  EventLogEventDataBytesItemsItemsStruct,
  EventLogEventDataBytesItemsArrayItemsStruct,
  EventLogEventDataStringItemsArrayItemsStruct,
  EventLog
} from "../../generated/EventEmitter/EventEmitter";
import { Transaction } from "../../generated/schema";
import { getIdFromEvent, getOrCreateTransaction } from "../entities/common";

export class EventData {
  rawData: EventLogEventDataStruct;
  _cachedTransaction: Transaction | null = null;
  _cachedEventId: string | null = null;

  constructor(public event: EventLog, public network: string) {
    this.rawData = event.params.eventData;
  }

  get transaction(): Transaction {
    if (this._cachedTransaction == null) {
      this._cachedTransaction = getOrCreateTransaction(this.event);
    }

    return this._cachedTransaction as Transaction;
  }

  get timestamp(): i32 {
    return this.transaction.timestamp;
  }

  get eventId(): string {
    if (this._cachedEventId == null) {
      this._cachedEventId = getIdFromEvent(this.event);
    }

    return this._cachedEventId as string;
  }

  get eventName(): string {
    return this.event.params.eventName;
  }

  getAddressItem(key: string): Address | null {
    return getItemByKey<Address, EventLogEventDataAddressItemsItemsStruct>(this.rawData.addressItems.items, key);
  }

  getAddressItemOrDie(key: string): Address {
    log.warning("getAddressItemOrDie: fetching {}", [key]);
    let result = this.getAddressItem(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getAddressItemString(key: string): string | null {
    let item = this.getAddressItem(key);

    if (item != null) {
      return item.toHexString();
    }

    return null;
  }

  getAddressItemStringOrDie(key: string): string {
    log.warning("fetching getAddressItemStringOrDie: {}", [key]);
    let result = this.getAddressItemString(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getAddressArrayItem(key: string): Array<Address> | null {
    return getItemByKey<Array<Address>, EventLogEventDataAddressItemsArrayItemsStruct>(
      this.rawData.addressItems.arrayItems,
      key
    );
  }

  getAddressArrayItemOrDie(key: string): Array<Address> {
    log.warning("fetching getAddressArrayItemOrDie: {}", [key]);
    let result = this.getAddressArrayItem(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getAddressArrayItemString(key: string): Array<string> | null {
    let items = this.getAddressArrayItem(key);

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

  getAddressArrayItemStringOrDie(key: string): Array<string> {
    log.warning("getAddressArrayItemStringOrDie: fetching {}", [key]);
    let result = this.getAddressArrayItemString(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getStringItem(key: string): string | null {
    let items = this.rawData.stringItems.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].key == key) {
        return items[i].value;
      }
    }

    return null;
  }

  getStringItemOrDie(key: string): string {
    log.warning("getStringItemOrDie: fetching {}", [key]);
    let result = this.getStringItem(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getStringArrayItem(key: string): Array<string> | null {
    return getItemByKey<Array<string>, EventLogEventDataStringItemsArrayItemsStruct>(
      this.rawData.stringItems.arrayItems,
      key
    );
  }

  getStringArrayItemOrDie(key: string): Array<string> {
    log.warning("fetching getStringArrayItemOrDie: {}", [key]);
    let result = this.getStringArrayItem(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getUintItem(key: string): BigInt | null {
    return getItemByKey<BigInt, EventLogEventDataUintItemsItemsStruct>(this.rawData.uintItems.items, key);
  }

  getUintItemOrDie(key: string): BigInt {
    log.warning("getUintItemOrDie: fetching {}", [key]);
    let result = this.getUintItem(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getUintArrayItem(key: string): Array<BigInt> | null {
    return getItemByKey<Array<BigInt>, EventLogEventDataUintItemsArrayItemsStruct>(
      this.rawData.uintItems.arrayItems,
      key
    );
  }

  getUintArrayItemOrDie(key: string): Array<BigInt> {
    log.warning("getUintArrayItemOrDie: fetching {}", [key]);
    let result = this.getUintArrayItem(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getIntItem(key: string): BigInt | null {
    return getItemByKey<BigInt, EventLogEventDataUintItemsItemsStruct>(
      this.rawData.intItems.items as Array<EventLogEventDataUintItemsItemsStruct>,
      key
    );
  }

  getIntItemOrDie(key: string): BigInt {
    log.warning("getIntItemOrDie: fetching {}", [key]);
    let result = this.getIntItem(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getIntArrayItem(key: string): Array<BigInt> | null {
    return getItemByKey<Array<BigInt>, EventLogEventDataUintItemsArrayItemsStruct>(
      this.rawData.intItems.arrayItems,
      key
    );
  }

  getIntArrayItemOrDie(key: string): Array<BigInt> {
    log.warning("getIntArrayItemOrDie: fetching {}", [key]);
    let result = this.getIntArrayItem(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getBytesItem(key: string): Bytes | null {
    return getItemByKey<Bytes, EventLogEventDataBytesItemsItemsStruct>(this.rawData.bytesItems.items, key);
  }

  getBytesItemOrDie(key: string): Bytes {
    log.warning("getBytesItemOrDie: fetching {}", [key]);
    let result = this.getBytesItem(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getBytesArrayItem(key: string): Array<Bytes> | null {
    return getItemByKey<Array<Bytes>, EventLogEventDataBytesItemsArrayItemsStruct>(
      this.rawData.bytesItems.arrayItems,
      key
    );
  }

  getBytesArrayItemOrDie(key: string): Array<Bytes> {
    log.warning("getBytesArrayItemOrDie: fetching {}", [key]);
    let result = this.getBytesArrayItem(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getBytes32Item(key: string): Bytes | null {
    return getItemByKey<Bytes, EventLogEventDataBytesItemsItemsStruct>(
      this.rawData.bytes32Items.items as Array<EventLogEventDataBytesItemsItemsStruct>,
      key
    );
  }

  getBytes32ItemOrDie(key: string): Bytes {
    log.warning("getBytes32ItemOrDie: fetching {}", [key]);
    let result = this.getBytes32Item(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  getBytes32ArrayItem(key: string): Array<Bytes> | null {
    return getItemByKey<Array<Bytes>, EventLogEventDataBytesItemsArrayItemsStruct>(
      this.rawData.bytes32Items.arrayItems,
      key
    );
  }

  getBytes32ArrayItemOrDie(key: string): Array<Bytes> {
    log.warning("fetching getBytes32ArrayItemOrDie: {}", [key]);
    let result = this.getBytes32ArrayItem(key);
    if (result == null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
  }

  // boolean type is not nullable in AssemblyScript, so we return false if the key is not found
  getBoolItem(key: string): boolean {
    let items = this.rawData.boolItems.items;

    for (let i = 0; i < items.length; i++) {
      if (items[i].key == key) {
        return items[i].value;
      }
    }

    return false;
  }

  getBoolItemOrDie(key: string): boolean {
    log.warning("fetching getBoolItemOrDie: {}", [key]);
    let result = this.getBoolItem(key);
    if (result === null) {
      log.warning("received null for key {}", [key]);
      throw new Error("received null");
    }
    return result!;
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
