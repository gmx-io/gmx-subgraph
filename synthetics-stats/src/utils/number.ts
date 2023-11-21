import { BigInt } from "@graphprotocol/graph-ts";

export let ZERO = BigInt.fromI32(0);
export let ONE = BigInt.fromI32(1);

export function expandDecimals(n: BigInt, decimals: u8): BigInt {
  return n.times(BigInt.fromI32(10).pow(decimals));
}

export function formatUsd(value: BigInt, decimals: u8 = 30): string {
  let int = value.div(expandDecimals(BigInt.fromI32(1), decimals));
  let frac = value.div(expandDecimals(BigInt.fromI32(1), decimals - 2)).toString();
  let decimalsStr = "00";

  if (frac.length >= 2) {
    decimalsStr = frac.slice(-2);
  } else if (frac.length == 1) {
    decimalsStr = "0" + frac;
  }

  return int.toString() + "." + decimalsStr + " USD";
}
