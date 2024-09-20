import { BigInt } from "@graphprotocol/graph-ts"
import { Pair } from "../../generated/schema"
import { Swap, Sync } from "../../generated/templates/PairReader/Pair"

import { SwapHandler } from "./SolidlySwapHandler"
import { updatePath } from "./pairs"

export function handleSwap(event: Swap): void {
  const handler = new SwapHandler(event)
  handler.handle()
}

export function handleSync(event: Sync): void {
  const pair = Pair.load(event.address.toHex())!
  const oldReserve0 = pair.reserve0
  const oldReserve1 = pair.reserve1
  const reserve0 = event.params.reserve0
  const reserve1 = event.params.reserve1

  const percentageThreshold = BigInt.fromI32(10)

  const reserve0Diff = oldReserve0.minus(pair.reserve0).abs()
  const reserve1Diff = oldReserve1.minus(pair.reserve1).abs()

  if (
    oldReserve0.equals(BigInt.fromI32(0)) ||
    oldReserve1.equals(BigInt.fromI32(0))
  ) {
    pair.reserve0 = reserve0
    pair.reserve1 = reserve1
    pair.save()

    updatePath()
    return
  }

  const reserve0DiffPercent = reserve0Diff
    .times(BigInt.fromI32(100))
    .div(oldReserve0)
  const reserve1DiffPercent = reserve1Diff
    .times(BigInt.fromI32(100))
    .div(oldReserve1)

  if (
    reserve0DiffPercent.gt(percentageThreshold) ||
    reserve1DiffPercent.gt(percentageThreshold)
  ) {
    pair.reserve0 = reserve0
    pair.reserve1 = reserve1
    pair.save()

    updatePath()
  }
}
