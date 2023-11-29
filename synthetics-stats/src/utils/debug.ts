import { BigInt } from "@graphprotocol/graph-ts";
import { expandDecimals } from "./number";

export let ZERO = BigInt.fromI32(0);
export let ONE = BigInt.fromI32(1);

export function formatUsd(value: BigInt): string {
  let decimals: u8 = 30;
  let int = value.div(expandDecimals(ONE, decimals));
  let frac = value.div(expandDecimals(ONE, decimals - 2)).toString();
  let decimalsStr = "00";

  if (frac.length >= 2) {
    decimalsStr = frac.slice(-2);
  } else if (frac.length == 1) {
    decimalsStr = "0" + frac;
  }

  return int.toString() + "." + decimalsStr + " USD";
}

export function formatGm(value: BigInt): string {
  let decimals: u8 = 18;
  let int = value.div(expandDecimals(ONE, decimals));
  let frac = value.div(expandDecimals(ONE, decimals - 2)).toString();
  let decimalsStr = "00";

  if (frac.length >= 2) {
    decimalsStr = frac.slice(-2);
  } else if (frac.length == 1) {
    decimalsStr = "0" + frac;
  }

  return int.toString() + "." + decimalsStr + " GM";
}
