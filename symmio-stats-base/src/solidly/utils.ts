import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
  Referral,
  GeneratedVolume,
  WeeklyGeneratedVolume,
  DailyGeneratedVolume
} from "../../generated/schema"

import { EPOCH_START_TIMESTAMP } from "../../config/config"

const epochStartTimeStamp = BigInt.fromI32(EPOCH_START_TIMESTAMP)

export const zero_address = Address.fromHexString(
  "0x0000000000000000000000000000000000000000"
)

export function getDay(timestamp: BigInt): BigInt {
  return timestamp.minus(epochStartTimeStamp).div(BigInt.fromI32(86400))
}

export enum VolumeType {
  USER,
  PARENT,
  GRANDPARENT
}

export function getOrCreateGeneratedVolume(
  user: Address,
  pair: Address
): GeneratedVolume {
  let id = user.toHex() + "-" + pair.toHex()
  let generatedVolume = GeneratedVolume.load(id)
  if (generatedVolume == null) {
    generatedVolume = new GeneratedVolume(id)
    generatedVolume.user = user
    generatedVolume.amountAsUser = BigInt.fromI32(0)
    generatedVolume.amountAsReferrer = BigInt.fromI32(0)
    generatedVolume.amountAsGrandparent = BigInt.fromI32(0)
    generatedVolume.pair = pair
  }
  return generatedVolume as GeneratedVolume
}

export function getOrCreateEpochGeneratedVolume(
  user: Address,
  epoch: BigInt,
  pair: Address
): WeeklyGeneratedVolume {
  let id = user.toHex() + "-" + epoch.toString() + "-" + pair.toHex()
  let weeklyGeneratedVolume = WeeklyGeneratedVolume.load(id)
  if (weeklyGeneratedVolume == null) {
    weeklyGeneratedVolume = new WeeklyGeneratedVolume(id)
    weeklyGeneratedVolume.user = user
    weeklyGeneratedVolume.amountAsUser = BigInt.fromI32(0)
    weeklyGeneratedVolume.amountAsReferrer = BigInt.fromI32(0)
    weeklyGeneratedVolume.amountAsGrandparent = BigInt.fromI32(0)
    weeklyGeneratedVolume.pair = pair
    weeklyGeneratedVolume.epoch = epoch
  }
  return weeklyGeneratedVolume
}

export function getOrCreateDailyGeneratedVolume(
  user: Address,
  day: BigInt,
  pair: Address
): DailyGeneratedVolume {
  let id = user.toHex() + "-" + day.toString() + "-" + pair.toHex()
  let dailyGeneratedVolume = DailyGeneratedVolume.load(id)
  if (dailyGeneratedVolume == null) {
    dailyGeneratedVolume = new DailyGeneratedVolume(id)
    dailyGeneratedVolume.user = user
    dailyGeneratedVolume.amountAsUser = BigInt.fromI32(0)
    dailyGeneratedVolume.amountAsReferrer = BigInt.fromI32(0)
    dailyGeneratedVolume.amountAsGrandparent = BigInt.fromI32(0)
    dailyGeneratedVolume.pair = pair
    dailyGeneratedVolume.day = day
  }
  return dailyGeneratedVolume
}

export function createReferral(referrer: Address, user: Address): void {
  let id = user.toHex() + "-" + referrer.toHex()
  let referral = Referral.load(id)
  if (referral == null) {
    referral = new Referral(id)
    referral.user = user
    referral.referrer = referrer
    referral.save()
  }
}
