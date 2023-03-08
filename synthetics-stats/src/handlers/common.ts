import { ethereum } from "@graphprotocol/graph-ts";
import { Transaction } from "../../generated/schema";

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
