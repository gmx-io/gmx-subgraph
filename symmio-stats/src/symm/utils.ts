import { Address, BigInt } from "@graphprotocol/graph-ts"
import { DailyGeneratedVolume, WeeklyGeneratedVolume, UserTotalVolume } from "../../generated/schema"
import { zero_address } from "../solidly/utils"
import { SendQuote } from "../../generated/SymmDataSource/v3"

export function updateVolume(
  user: Address,
  day: BigInt,
  week: BigInt,
  amount: BigInt,
  timestamp: BigInt,
): void {
  // user daily
  const userDailyId = user.toHex() + "-" + day.toString() + "-" + "0x0000000000000000000000000000000000000000"
  let userDaily = DailyGeneratedVolume.load(userDailyId)
  if (userDaily == null) {
    const userDaily = new DailyGeneratedVolume(userDailyId)
    userDaily.user = user
    userDaily.day = day
    userDaily.amountAsUser = amount
    userDaily.amountAsReferrer = amount
    userDaily.amountAsGrandparent = amount
    userDaily.lastUpdate = timestamp
    userDaily.pair = zero_address
    userDaily.save()
  } else {
    userDaily.amountAsUser = userDaily.amountAsUser.plus(amount)
    userDaily.amountAsReferrer = userDaily.amountAsReferrer.plus(amount)
    userDaily.amountAsGrandparent = userDaily.amountAsGrandparent.plus(amount)
    userDaily.lastUpdate = timestamp
    userDaily.save()
  }

  // user weekly
  const userWeeklyId = user.toHex() + "-" + week.toString() + "-" + "0x0000000000000000000000000000000000000000"
  let userWeekly = WeeklyGeneratedVolume.load(userWeeklyId)
  if (userWeekly == null) {
    const userWeekly = new WeeklyGeneratedVolume(userWeeklyId)
    userWeekly.user = user
    userWeekly.epoch = week
    userWeekly.amountAsUser = amount
    userWeekly.amountAsReferrer = amount
    userWeekly.amountAsGrandparent = amount
    userWeekly.lastUpdate = timestamp
    userWeekly.pair = zero_address
    userWeekly.save()
  } else {
    userWeekly.amountAsUser = userWeekly.amountAsUser.plus(amount)
    userWeekly.amountAsReferrer = userWeekly.amountAsReferrer.plus(amount)
    userWeekly.amountAsGrandparent = userWeekly.amountAsGrandparent.plus(amount)
    userWeekly.lastUpdate = timestamp
    userWeekly.save()
  }

  // user total
  let userTotal = UserTotalVolume.load(user.toHex())
  if (userTotal == null) {
    const userTotal = new UserTotalVolume(user.toHex())
    userTotal.user = user
    userTotal.volume = amount
    userTotal.lastUpdate = timestamp
    userTotal.save()
  } else {
    userTotal.volume = userTotal.volume.plus(amount)
    userTotal.lastUpdate = timestamp
    userTotal.save()
  }
}
