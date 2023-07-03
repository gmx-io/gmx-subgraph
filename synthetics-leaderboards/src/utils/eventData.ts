import { Address, ethereum, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  EventLog1EventDataAddressItemsItemsStruct,
  EventLog1EventDataUintItemsItemsStruct,
  EventLog1EventDataStruct,
  EventLog1EventDataAddressItemsArrayItemsStruct,
  EventLog1EventDataUintItemsArrayItemsStruct,
  EventLog1EventDataBytesItemsItemsStruct,
  EventLog1EventDataBytes32ItemsItemsStruct,
  EventLog1EventDataBytesItemsArrayItemsStruct,
  EventLog1EventDataStringItemsArrayItemsStruct,
} from "../../generated/EventEmitter/EventEmitter";

export class EventData {
  constructor(public rawData: EventLog1EventDataStruct) {}

  getAddressItem(key: string): Address | null {
    return getItemByKey<Address, EventLog1EventDataAddressItemsItemsStruct>(
      this.rawData.addressItems.items,
      key
    );
  }

  getAddressItemString(key: string): string | null {
    let item = this.getAddressItem(key);

    if (item != null) {
      return item.toHexString();
    }

    return null;
  }

  getAddressArrayItem(key: string): Array<Address> | null {
    return getItemByKey<
      Array<Address>,
      EventLog1EventDataAddressItemsArrayItemsStruct
    >(this.rawData.addressItems.arrayItems, key);
  }

  getAddressArrayItemString(key: string): Array<string> | null {
    let items = this.getAddressArrayItem(key);

    if (items != null) {
      let _items = items as Array<Address>;
      let strigsArray = new Array<string>(items.length);

      for (let i = 0; i < _items.length; i++) {
        let item = _items[i] as Address;
        strigsArray[i] = item.toHexString();
      }

      return strigsArray;
    }

    return null;
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

  getStringArrayItem(key: string): Array<string> | null {
    return getItemByKey<
      Array<string>,
      EventLog1EventDataStringItemsArrayItemsStruct
    >(this.rawData.stringItems.arrayItems, key);
  }

  getUintItem(key: string): BigInt | null {
    return getItemByKey<BigInt, EventLog1EventDataUintItemsItemsStruct>(
      this.rawData.uintItems.items,
      key
    );
  }

  getUintArrayItem(key: string): Array<BigInt> | null {
    return getItemByKey<
      Array<BigInt>,
      EventLog1EventDataUintItemsArrayItemsStruct
    >(this.rawData.uintItems.arrayItems, key);
  }

  getIntItem(key: string): BigInt | null {
    return getItemByKey<BigInt, EventLog1EventDataUintItemsItemsStruct>(
      this.rawData.intItems.items as Array<
        EventLog1EventDataUintItemsItemsStruct
      >,
      key
    );
  }

  getIntArrayItem(key: string): Array<BigInt> | null {
    return getItemByKey<
      Array<BigInt>,
      EventLog1EventDataUintItemsArrayItemsStruct
    >(this.rawData.intItems.arrayItems, key);
  }

  getBytesItem(key: string): Bytes | null {
    return getItemByKey<Bytes, EventLog1EventDataBytesItemsItemsStruct>(
      this.rawData.bytesItems.items,
      key
    );
  }

  getBytesArrayItem(key: string): Array<Bytes> | null {
    return getItemByKey<
      Array<Bytes>,
      EventLog1EventDataBytesItemsArrayItemsStruct
    >(this.rawData.bytesItems.arrayItems, key);
  }

  getBytes32Item(key: string): Bytes | null {
    return getItemByKey<Bytes, EventLog1EventDataBytes32ItemsItemsStruct>(
      this.rawData.bytes32Items.items as Array<EventLog1EventDataBytes32ItemsItemsStruct>,
      key
    );
  }

  getBytes32ArrayItem(key: string): Array<Bytes> | null {
    return getItemByKey<
      Array<Bytes>,
      EventLog1EventDataBytesItemsArrayItemsStruct
    >(this.rawData.bytes32Items.arrayItems, key);
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
}

class EventDataItem<T> extends ethereum.Tuple {
  get key(): string {
    return this[0].toString();
  }

  get value(): T {
    return this[1] as T;
  }
}

function getItemByKey<T, TItem extends EventDataItem<T>>(
  items: Array<TItem>,
  key: string
): T | null {
  for (let i = 0; i < items.length; i++) {
    if (items[i].key == key) {
      return items[i].value;
    }
  }

  return null;
}
