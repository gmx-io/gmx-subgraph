import { User, UserStat } from "../../generated/schema";
import { timestampToPeriodStart } from "../utils/time";

export function saveUserStat(type: string, account: string, timestamp: i32): void {
  let totalUserStats = getOrCreateUserStat(timestamp, "total");
  let dailyUserStats = getOrCreateUserStat(timestamp, "1d");

  let userData = User.load(account);

  if (userData === null) {
    userData = new User(account);
    userData.totalSwapCount = 0;
    userData.totalPositionCount = 0;
    userData.totalDepositCount = 0;
    userData.totalWithdrawalCount = 0;
    userData.account = account;

    if (account) {
      totalUserStats.uniqueUsers += 1;
      dailyUserStats.uniqueUsers += 1;
    }
  }

  if (type === "swap") {
    totalUserStats.totalSwapCount += 1;
    dailyUserStats.totalSwapCount += 1;
    userData.totalSwapCount += 1;
  }

  if (type === "margin") {
    totalUserStats.totalPositionCount += 1;
    dailyUserStats.totalPositionCount += 1;
    userData.totalPositionCount += 1;
  }

  if (type === "deposit") {
    totalUserStats.totalDepositCount += 1;
    dailyUserStats.totalDepositCount += 1;
    userData.totalDepositCount += 1;
  }

  if (type === "withdrawal") {
    totalUserStats.totalWithdrawalCount += 1;
    dailyUserStats.totalWithdrawalCount += 1;
    userData.totalWithdrawalCount += 1;
  }

  totalUserStats.save();
  dailyUserStats.save();
  userData.save();
}

function getOrCreateUserStat(timestamp: i32, period: string): UserStat {
  let timestampGroup = timestampToPeriodStart(timestamp, period);
  let userId = period === "total" ? "total" : timestampGroup.toString();
  let user = UserStat.load(userId);

  if (user === null) {
    user = new UserStat(userId);
    user.period = period;
    user.totalPositionCount = 0;
    user.totalSwapCount = 0;
    user.totalDepositCount = 0;
    user.totalWithdrawalCount = 0;
    user.uniqueUsers = 0;
    user.timestamp = timestampGroup;
  }
  return user as UserStat;
}
