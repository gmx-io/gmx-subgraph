import { BigInt } from "@graphprotocol/graph-ts";

export function timestampToPeriodStart(timestamp: i32, period: string): i32 {
  let seconds = periodToSeconds(period);

  return (timestamp / seconds) * seconds;
}

export function periodToSeconds(period: string): i32 {
  let seconds: i32;

  if (period == "5m") {
    seconds = 5 * 60;
  } else if (period == "15m") {
    seconds = 15 * 60;
  } else if (period == "1h") {
    seconds = 60 * 60;
  } else if (period == "4h") {
    seconds = 4 * 60 * 60;
  } else if (period == "1d") {
    seconds = 24 * 60 * 60;
  } else {
    throw new Error("Invalid period");
  }

  return seconds;
}
