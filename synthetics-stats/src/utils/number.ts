import { BigInt } from "@graphprotocol/graph-ts";

export let ZERO = BigInt.fromI32(0);
export let ONE = BigInt.fromI32(1);

export function expandDecimals(n: BigInt, decimals: u8): BigInt {
  return n.times(BigInt.fromI32(10).pow(decimals));
}
