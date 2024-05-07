import { Address, BigInt } from "@graphprotocol/graph-ts"
import { DailyGeneratedVolume, WeeklyGeneratedVolume, UserTotalVolume } from "../../generated/schema"

export function updateVolume(
  user: Address,
  day: BigInt,
  week: BigInt,
  amount: BigInt,
  timestamp: BigInt,
): void {
  // user daily
  const userDailyId = user.toHex() + "-" + day.toString()
  let userDaily = DailyGeneratedVolume.load(userDailyId)
  if (userDaily == null) {
    const userDaily = new DailyGeneratedVolume(userDailyId)
    userDaily.user = user
    userDaily.day = day
    userDaily.amountAsUser = amount
    userDaily.lastUpdate = timestamp
    userDaily.save()
  } else {
    userDaily.amountAsUser = userDaily.amountAsUser.plus(amount)
    userDaily.lastUpdate = timestamp
    userDaily.save()
  }

  // user weekly
  const userWeeklyId = user.toHex() + "-" + week.toString()
  let userWeekly = WeeklyGeneratedVolume.load(userWeeklyId)
  if (userWeekly == null) {
    const userWeekly = new WeeklyGeneratedVolume(userWeeklyId)
    userWeekly.user = user
    userWeekly.epoch = week
    userWeekly.amountAsUser = amount
    userWeekly.lastUpdate = timestamp
    userWeekly.save()
  } else {
    userWeekly.amountAsUser = userWeekly.amountAsUser.plus(amount)
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
