import {
  BigInt,
  Address,
  // TypedMap,
  // ethereum,
  // store,
  // log
} from "@graphprotocol/graph-ts"
import {
  CreateIncreaseOrder,
  CreateDecreaseOrder,
  CreateSwapOrder,
  CancelIncreaseOrder,
  CancelDecreaseOrder,
  CancelSwapOrder,
  ExecuteIncreaseOrder,
  ExecuteDecreaseOrder,
  ExecuteSwapOrder
} from "../generated/OrderBook/OrderBook"

import {
  Order,
  OrderStat
} from "../generated/schema"

function _getId(account: Address, type: string, index: BigInt): string {
  let id = account.toHexString() + "-" + type + "-" + index.toString()
  return id
}

function _storeStats(incrementProp: string, decrementProp: string | null): void {
  let entity = OrderStat.load("total")
  if (entity == null) {
    entity = new OrderStat("total")
    entity.openSwap = 0
    entity.openIncrease = 0
    entity.openDecrease = 0
    entity.cancelledSwap = 0
    entity.cancelledIncrease = 0
    entity.cancelledDecrease = 0
    entity.executedSwap = 0
    entity.executedIncrease = 0
    entity.executedDecrease = 0
    entity.period = "total"
  }

  entity.setI32(incrementProp, entity.getI32(incrementProp) + 1)
  if (decrementProp != null) {
    entity.setI32(decrementProp, entity.getI32(decrementProp) - 1)
  }

  entity.save()
}

function _handleCreateOrder(account: Address, type: string, index: BigInt, timestamp: BigInt): void {
  let id = _getId(account, type, index)
  let order = new Order(id)

  order.account = account.toHexString()
  order.createdTimestamp = timestamp.toI32()
  order.index = index
  order.type = "swap"
  order.status = "open"

  order.save()
}

function _handleCancelOrder(account: Address, type: string, index: BigInt, timestamp: BigInt): void {
  let id = account.toHexString() + "-" + type + "-" + index.toString()
  let order = Order.load(id)

  order.status = "cancelled"
  order.cancelledTimestamp = timestamp.toI32()

  order.save()
}

function _handleExecuteOrder(account: Address, type: string, index: BigInt, timestamp: BigInt): void {
  let id = account.toHexString() + "-" + type + "-" + index.toString()
  let order = Order.load(id)

  order.status = "executed"
  order.executedTimestamp = timestamp.toI32()

  order.save()
}

export function handleCreateIncreaseOrder(event: CreateIncreaseOrder): void {
  _handleCreateOrder(event.params.account, "increase", event.params.orderIndex, event.block.timestamp);
  _storeStats("openIncrease", null)
}

export function handleCancelIncreaseOrder(event: CancelIncreaseOrder): void {
  _handleCancelOrder(event.params.account, "increase", event.params.orderIndex, event.block.timestamp);
  _storeStats("cancelledIncrease", "openIncrease")
}

export function handleExecuteIncreaseOrder(event: ExecuteIncreaseOrder): void {
  _handleExecuteOrder(event.params.account, "increase", event.params.orderIndex, event.block.timestamp);
  _storeStats("executeIncrease", "openIncrease")
}

export function handleCreateDecreaseOrder(event: CreateDecreaseOrder): void {
  _handleCreateOrder(event.params.account, "decrease", event.params.orderIndex, event.block.timestamp);
  _storeStats("openDecrease", null)
}

export function handleCancelDecreaseOrder(event: CancelDecreaseOrder): void {
  _handleCancelOrder(event.params.account, "decrease", event.params.orderIndex, event.block.timestamp);
  _storeStats("cancelledDecrease", "openDecrease")
}

export function handleExecuteDecreaseOrder(event: ExecuteDecreaseOrder): void {
  _handleExecuteOrder(event.params.account, "decrease", event.params.orderIndex, event.block.timestamp);
  _storeStats("executedDecrease", "openDecrease")
}

export function handleCreateSwapOrder(event: CreateSwapOrder): void {
  _handleCreateOrder(event.params.account, "swap", event.params.orderIndex, event.block.timestamp);
  _storeStats("openSwap", null)
}

export function handleCancelSwapOrder(event: CancelSwapOrder): void {
  _handleCancelOrder(event.params.account, "swap", event.params.orderIndex, event.block.timestamp);
  _storeStats("cancelledSwap", "openSwap")
}

export function handleExecuteSwapOrder(event: ExecuteSwapOrder): void {
  _handleExecuteOrder(event.params.account, "swap", event.params.orderIndex, event.block.timestamp);
  _storeStats("executedSwap", "openSwap")
}
