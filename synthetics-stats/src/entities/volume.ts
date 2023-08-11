import { BigInt, log } from "@graphprotocol/graph-ts";
import { MarketInfo, PositionVolumeInfo, SwapVolumeInfo, Transaction, VolumeInfo } from "../../generated/schema";
import { timestampToPeriodStart } from "../utils/time";
import { EventData } from "../utils/eventData";

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

export function saveSwapVolumeInfo(eventData: EventData, transaction: Transaction): void {
  let timestamp = transaction.timestamp;
  let tokenIn = eventData.getAddressItemString("tokenIn")!;
  let tokenOut = eventData.getAddressItemString("tokenOut")!;
  let amountIn = eventData.getUintItem("amountIn")!;
  let tokenInPrice = eventData.getUintItem("tokenInPrice")!;
  let volumeUsd = amountIn.times(tokenInPrice);

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
  let id = period === "total" ? "total" : getVolumeInfoByTokenId(tokenIn, tokenOut) + ":" + timestampGroup.toString();
  let volumeInfo = SwapVolumeInfo.load(id);

  if (volumeInfo === null) {
    volumeInfo = new SwapVolumeInfo(id);
    volumeInfo.tokenIn = tokenIn;
    volumeInfo.tokenOut = tokenOut;
    volumeInfo.timestamp =timestampGroup;
    volumeInfo.period = period;
    volumeInfo.volumeUsd = BigInt.fromI32(0);
  }
  return volumeInfo as SwapVolumeInfo;
}

export function savePositionVolumeInfo(eventData: EventData, transaction: Transaction): void {
  let timestamp = transaction.timestamp;
  let collateralToken = eventData.getAddressItemString("collateralToken")!;
  let marketToken = eventData.getAddressItemString("market")!;
  let marketInfo = MarketInfo.load(marketToken)!;
  let sizeInUsd = eventData.getUintItem("sizeInUsd")!;

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

function getOrCreatePositionVolumeInfo(timestamp: i32, collateralToken: string, indexToken: string, period: string): PositionVolumeInfo {
  let timestampGroup = timestampToPeriodStart(timestamp, period);
  let id = period === "total" ? "total" : getVolumeInfoByTokenId(collateralToken, indexToken) + ":" + timestampGroup.toString();
  let volumeInfo = PositionVolumeInfo.load(id);

  if (volumeInfo === null) {
    volumeInfo = new PositionVolumeInfo(id);
    volumeInfo.collateralToken = collateralToken;
    volumeInfo.indexToken = indexToken;
    volumeInfo.timestamp =timestampGroup;
    volumeInfo.period = period;
    volumeInfo.volumeUsd = BigInt.fromI32(0);
  }
  return volumeInfo as PositionVolumeInfo;
}

function getVolumeInfoByTokenId(tokenA: string, tokenB: string): string {
  return tokenA + ":" + tokenB;
}
