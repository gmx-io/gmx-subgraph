import { ethereum, BigInt } from "@graphprotocol/graph-ts";
import { DebugEvent, PoolValue, Transaction } from "../../generated/schema";

export function getIdFromEvent(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + ":" + event.logIndex.toString();
}

export function getOrCreateTransaction(event: ethereum.Event): Transaction {
  let id = event.transaction.hash.toHexString();
  let entity = Transaction.load(id);

  if (entity == null) {
    entity = new Transaction(id);
    entity.hash = event.transaction.hash.toHexString();
    entity.timestamp = event.block.timestamp.toI32();
    entity.blockNumber = event.block.number.toI32();
    entity.transactionIndex = event.transaction.index.toI32();
    entity.from = event.transaction.from.toHexString();
    if (event.transaction.to == null) {
      entity.to = "";
    } else {
      entity.to = event.transaction.to.toHexString();
    }
    entity.save();
  }

  return entity as Transaction;
}

export function getOrCreatePoolValue(marketAddress: string): PoolValue {
  let id = marketAddress;
  let ref = PoolValue.load(id);

  if (!ref) {
    ref = new PoolValue(id);
    ref.poolValue = BigInt.fromI32(0);
    ref.marketTokensSupply = BigInt.fromI32(0);
    ref.pendingFeeUsds = new Array<BigInt>(0);
    ref.pendingCollectedMarketFeesInfoIds = new Array<string>(0);
  }

  return ref!;
}

export function createDebugEvent(account: string, key: string, message: string): void {
  let entity = new DebugEvent(key);

  entity.message = message;
  entity.account = account;

  entity.save();
}