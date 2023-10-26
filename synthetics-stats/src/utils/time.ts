export type Period = string;

export function timestampToPeriodStart(timestamp: i32, period: Period): i32 {
  if (period == "total") {
    return timestamp;
  }

  let seconds = periodToSeconds(period);
  let start = (timestamp / seconds) * seconds;
  
  if (period == "1w") {
    // in case of 1w start is Thursday
    // shift it by 1 day to Wednesday
    start -= 86400; 
  }
  
  return start;
}

export function periodToSeconds(period: Period): i32 {
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
