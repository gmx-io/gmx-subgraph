import { BigInt } from "@graphprotocol/graph-ts"

export function timestampToPeriod(timestamp: BigInt, period: String): BigInt {
  if (period === "total") {
    return BigInt.fromI32(0)
  }
  let delimeter: BigInt
  if (period === "daily") delimeter = BigInt.fromI32(86400)
  else if (period === "weekly") delimeter = BigInt.fromI32(86400 * 7)
  else if (period === "hourly") delimeter = BigInt.fromI32(3600)
  return timestamp / delimeter * delimeter
}