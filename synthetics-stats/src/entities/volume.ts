import { BigInt, log } from "@graphprotocol/graph-ts";
import { MarketInfo, PositionVolumeInfo, SwapVolumeInfo, VolumeInfo } from "../../generated/schema";
import { timestampToPeriodStart } from "../utils/time";
import { getMarketInfo } from "./markets";

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
  }

  if (type == "deposit") {
    hourlyVolumeInfo.depositVolumeUsd = hourlyVolumeInfo.depositVolumeUsd.plus(volume);
    dailyVolumeInfo.depositVolumeUsd = dailyVolumeInfo.depositVolumeUsd.plus(volume);
    totalVolumeInfo.depositVolumeUsd = totalVolumeInfo.depositVolumeUsd.plus(volume);
  }

  if (type == "withdrawal") {
    hourlyVolumeInfo.withdrawalVolumeUsd = hourlyVolumeInfo.withdrawalVolumeUsd.plus(volume);
    dailyVolumeInfo.withdrawalVolumeUsd = dailyVolumeInfo.withdrawalVolumeUsd.plus(volume);
    totalVolumeInfo.withdrawalVolumeUsd = totalVolumeInfo.withdrawalVolumeUsd.plus(volume);
  }

  if (type == "margin") {
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
  let volumeId = period;
  if (period != "total") {
    volumeId = volumeId + ":" + timestampGroup.toString();
  }
  let volumeInfo = VolumeInfo.load(volumeId);

  if (volumeInfo === null) {
    volumeInfo = new VolumeInfo(volumeId);
    volumeInfo.period = period;
    volumeInfo.volumeUsd = BigInt.fromI32(0);
    volumeInfo.swapVolumeUsd = BigInt.fromI32(0);
    volumeInfo.marginVolumeUsd = BigInt.fromI32(0);
    volumeInfo.depositVolumeUsd = BigInt.fromI32(0);
    volumeInfo.withdrawalVolumeUsd = BigInt.fromI32(0);
    volumeInfo.timestamp = timestampGroup;
  }
  return volumeInfo as VolumeInfo;
}

export function saveSwapVolumeInfo(timestamp: i32, tokenIn: string, tokenOut: string, volumeUsd: BigInt): void {
  let hourlyVolumeInfo = getOrCreateSwapVolumeInfo(timestamp, tokenIn, tokenOut, "1h");
  let dailyVolumeInfo = getOrCreateSwapVolumeInfo(timestamp, tokenIn, tokenOut, "1d");
  let totalVolumeInfo = getOrCreateSwapVolumeInfo(timestamp, tokenIn, tokenOut, "total");

  hourlyVolumeInfo.volumeUsd = hourlyVolumeInfo.volumeUsd.plus(volumeUsd);
  dailyVolumeInfo.volumeUsd = dailyVolumeInfo.volumeUsd.plus(volumeUsd);
  totalVolumeInfo.volumeUsd = totalVolumeInfo.volumeUsd.plus(volumeUsd);

  hourlyVolumeInfo.save();
  dailyVolumeInfo.save();
  totalVolumeInfo.save();
}

function getOrCreateSwapVolumeInfo(timestamp: i32, tokenIn: string, tokenOut: string, period: string): SwapVolumeInfo {
  let timestampGroup = timestampToPeriodStart(timestamp, period);

  let id = getVolumeInfoId(tokenIn, tokenOut) + ":" + period;
  if (period != "total") {
    id = id + ":" + timestampGroup.toString();
  }
  let volumeInfo = SwapVolumeInfo.load(id);

  if (volumeInfo === null) {
    volumeInfo = new SwapVolumeInfo(id);
    volumeInfo.tokenIn = tokenIn;
    volumeInfo.tokenOut = tokenOut;
    volumeInfo.timestamp = timestampGroup;
    volumeInfo.period = period;
    volumeInfo.volumeUsd = BigInt.fromI32(0);
  }
  return volumeInfo as SwapVolumeInfo;
}

export function savePositionVolumeInfo(
  timestamp: i32,
  collateralToken: string,
  marketToken: string,
  sizeInUsd: BigInt
): void {
  let marketInfo = getMarketInfo(marketToken);
  let hourlyVolumeInfo = getOrCreatePositionVolumeInfo(timestamp, collateralToken, marketInfo.indexToken, "1h");
  let dailyVolumeInfo = getOrCreatePositionVolumeInfo(timestamp, collateralToken, marketInfo.indexToken, "1d");
  let totalVolumeInfo = getOrCreatePositionVolumeInfo(timestamp, collateralToken, marketInfo.indexToken, "total");

  hourlyVolumeInfo.volumeUsd = hourlyVolumeInfo.volumeUsd.plus(sizeInUsd);
  dailyVolumeInfo.volumeUsd = dailyVolumeInfo.volumeUsd.plus(sizeInUsd);
  totalVolumeInfo.volumeUsd = totalVolumeInfo.volumeUsd.plus(sizeInUsd);

  hourlyVolumeInfo.save();
  dailyVolumeInfo.save();
  totalVolumeInfo.save();
}

function getOrCreatePositionVolumeInfo(
  timestamp: i32,
  collateralToken: string,
  indexToken: string,
  period: string
): PositionVolumeInfo {
  let timestampGroup = timestampToPeriodStart(timestamp, period);
  let id = getVolumeInfoId(collateralToken, indexToken) + ":" + period;
  if (period != "total") {
    id = id + ":" + timestampGroup.toString();
  }
  let volumeInfo = PositionVolumeInfo.load(id);

  if (volumeInfo === null) {
    volumeInfo = new PositionVolumeInfo(id);
    volumeInfo.collateralToken = collateralToken;
    volumeInfo.indexToken = indexToken;
    volumeInfo.timestamp = timestampGroup;
    volumeInfo.period = period;
    volumeInfo.volumeUsd = BigInt.fromI32(0);
  }
  return volumeInfo as PositionVolumeInfo;
}

function getVolumeInfoId(tokenA: string, tokenB: string): string {
  return tokenA + ":" + tokenB;
}
