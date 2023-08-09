import { BigInt, log } from "@graphprotocol/graph-ts";
import { HourlyVolumeByToken, VolumeInfo } from "../../generated/schema";
import { timestampToPeriodStart } from "../utils/time";

export function saveVolumeInfo(type: string, timestamp: i32, volume: BigInt): void {
  let hourlyVolumeInfo = getOrCreateVolumeInfo(timestamp, "1h");
  let dailyVolumeInfo = getOrCreateVolumeInfo(timestamp, "1d");
  let totalVolumeInfo = getOrCreateVolumeInfo(timestamp, "total");

  hourlyVolumeInfo.volumeUsd = hourlyVolumeInfo.volumeUsd.plus(volume);
  dailyVolumeInfo.volumeUsd = dailyVolumeInfo.volumeUsd.plus(volume);
  totalVolumeInfo.volumeUsd = totalVolumeInfo.volumeUsd.plus(volume);

  if (type == "swap") {
    hourlyVolumeInfo.swapVolumeUsd = hourlyVolumeInfo.swapVolumeUsd.plus(volume);
    dailyVolumeInfo.swapVolumeUsd = dailyVolumeInfo.swapVolumeUsd.plus(volume);
    totalVolumeInfo.swapVolumeUsd = totalVolumeInfo.swapVolumeUsd.plus(volume);
  } else if (type == "margin") {
    hourlyVolumeInfo.marginVolumeUsd = hourlyVolumeInfo.marginVolumeUsd.plus(volume);
    dailyVolumeInfo.marginVolumeUsd = dailyVolumeInfo.marginVolumeUsd.plus(volume);
    totalVolumeInfo.marginVolumeUsd = totalVolumeInfo.marginVolumeUsd.plus(volume);
  }

  hourlyVolumeInfo.save();
  dailyVolumeInfo.save();
  totalVolumeInfo.save();
}

function getOrCreateVolumeInfo(timestamp: i32, period: string): VolumeInfo {
  let timestampGroup = timestampToPeriodStart(timestamp, period);
  let volumeId = period === "total" ? "total" : timestampGroup.toString();
  let volumeInfo = VolumeInfo.load(volumeId);
  
  if (volumeInfo === null) {
    volumeInfo = new VolumeInfo(volumeId);
    volumeInfo.period = period;
    volumeInfo.volumeUsd = BigInt.fromI32(0);
    volumeInfo.swapVolumeUsd = BigInt.fromI32(0);
    volumeInfo.marginVolumeUsd = BigInt.fromI32(0);
  }
  return volumeInfo as VolumeInfo;
}


export function saveHourlyVolumeByToken(type: string, timestamp: i32, volume: BigInt, tokenA: string, tokenB: string): void {
  let hourlyVolumeInfo = getOrCreateHourlyVolumeByToken(timestamp, tokenA, tokenB);

  hourlyVolumeInfo.volumeUsd = hourlyVolumeInfo.volumeUsd.plus(volume);
  if (type === "swap") {
    hourlyVolumeInfo.swapVolumeUsd = hourlyVolumeInfo.swapVolumeUsd.plus(volume);
  } else if (type === "margin") {
    hourlyVolumeInfo.marginVolumeUsd = hourlyVolumeInfo.marginVolumeUsd.plus(volume);
  }

  hourlyVolumeInfo.save();
}


function getOrCreateHourlyVolumeByToken(timestamp: i32, tokenA: string, tokenB: string): HourlyVolumeByToken {
  let timestampGroup = timestampToPeriodStart(timestamp, "1h");
  let volumeId =   getVolumeInfoByTokenId(tokenA, tokenB) + ":" + timestampGroup.toString();

  let hourlyVolumeByToken = HourlyVolumeByToken.load(volumeId);

  if (hourlyVolumeByToken === null) {
    hourlyVolumeByToken = new HourlyVolumeByToken(volumeId);
    hourlyVolumeByToken.tokenA = tokenA;
    hourlyVolumeByToken.tokenB = tokenB;
    hourlyVolumeByToken.timestamp = timestampGroup;
    hourlyVolumeByToken.volumeUsd = BigInt.fromI32(0);
    hourlyVolumeByToken.swapVolumeUsd = BigInt.fromI32(0);
    hourlyVolumeByToken.marginVolumeUsd = BigInt.fromI32(0);
  }
  return hourlyVolumeByToken as HourlyVolumeByToken;
}

function getVolumeInfoByTokenId(tokenA: string, tokenB: string): string {
  return tokenA + ":" + tokenB;
}
