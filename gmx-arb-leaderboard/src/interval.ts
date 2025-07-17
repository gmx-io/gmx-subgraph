import { ethereum } from "@graphprotocol/graph-ts"
import { intervalUnixTime } from "./helpers"


export function getIntervalIdentifier(event: ethereum.Event, name: string, interval: intervalUnixTime): string {
  const intervalID = getIntervalId(interval, event)
  return name + ":" + interval.toString() + ':' + intervalID.toString()
}

// @ts-ignore
export function getIntervalId(interval: intervalUnixTime, event: ethereum.Event): i32 {
  return event.block.timestamp.toI32() / interval
}

// @ts-ignore
export function getHourlyId(event: ethereum.Event): i32 {
  return getIntervalId(3600, event)
}

// @ts-ignore
export function getDailyId(event: ethereum.Event): i32 {
  return getIntervalId(86400, event)
}

// @ts-ignore
export function getWeeklyId(event: ethereum.Event): i32 {
  return getIntervalId(604800, event)
}

// export function getDailyRewardClaim(event: rewardTracker.Claim): DailyClaimedReward {
//   const dayID = getDailyId(event)
//   const receiver = event.params.receiver.toHexString()
//   const tickDayDataID = receiver + '-' + dayID.toString()

//   let tickDayData = DailyClaimedReward.load(tickDayDataID)

//   if (tickDayData === null) {
//     tickDayData = new DailyClaimedReward(tickDayDataID)
//     tickDayData.timestamp = dayID * 86400
//     tickDayData.receiver = receiver
//     tickDayData.feeGlp = ZERO_BI
//     tickDayData.feeGmx = ZERO_BI
//     tickDayData.stakeGlp = ZERO_BI
//     tickDayData.stakeGmx = ZERO_BI
//     tickDayData.totalUsd = ZERO_BI
//   }


//   return tickDayData as DailyClaimedReward
// }