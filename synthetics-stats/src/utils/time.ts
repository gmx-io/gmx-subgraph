export function timestampToPeriodStart(timestamp: i32, period: string): i32 {
  let seconds = periodToSeconds(period);

  // in case of "1w" period it will be rounded to start on Thursday
  // in GMX weekly distributions start on Wendesdays
  // so timestamp needs to be shifted before rounding and then shifted back after:
  // period start = (timestamp + 86400) / seconds * seconds - 86400

  if (period == "1w") {
    timestamp += 86400;
  }
  let start = (timestamp / seconds) * seconds;

  if (period == "1w") {
    start -= 86400; 
  }

  return start;
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
  } else if (period == "1w") {
    seconds = 7 * 24 * 60 * 60;
  } else if (period == "total") {
    seconds = 1;
  }

  return seconds;
}
