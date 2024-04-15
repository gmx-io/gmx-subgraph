import { Address, BigInt } from "@graphprotocol/graph-ts"
import { DailyGeneratedVolume } from "../../generated/schema"
import { zero_address } from "../solidly/utils"
import { SendQuote } from "../../generated/SymmDataSource/v3"

export function updateVolume(
  user: Address,
  day: BigInt,
  amount: BigInt,
  timestamp: BigInt,
): void {
  const userVolumeId =
    user.toHex() +
    "-" +
    day.toString() +
    "-" +
    "0x0000000000000000000000000000000000000000"

  let acc = DailyGeneratedVolume.load(userVolumeId)

  if (acc == null) {
    const acc = new DailyGeneratedVolume(userVolumeId)
    acc.user = user
    acc.day = day
    acc.amountAsUser = amount
    acc.amountAsReferrer = amount
    acc.amountAsGrandparent = amount
    acc.lastUpdate = timestamp
    acc.pair = zero_address
    acc.save()
    return
  }

  acc.amountAsUser = acc.amountAsUser.plus(amount)
  acc.amountAsReferrer = acc.amountAsReferrer.plus(amount)
  acc.amountAsGrandparent = acc.amountAsGrandparent.plus(amount)
  acc.lastUpdate = timestamp
  acc.save()
}
