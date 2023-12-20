import { describe, it, expect } from "@jest/globals";
import axios from "axios";

const url = "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-referrals/api";

async function requestSubgraph(query: string) {
  const res = await axios.post(url, {
    query
  });

  if (res.data.errors) {
    throw new Error(JSON.stringify(res.data.errors));
  }

  return res.data.data as any;
}

describe("Referrals subgraph", () => {
  it("total", async () => {
    const { affiliateStats } = await requestSubgraph(`{
      affiliateStats(
        block:{
          number: 110824197
        }
        where:{
          period: total,
          affiliate: "0x99655ca16c742b46a4a05afaf0f7798c336fd279"
          referralCode: "0x74616e6f00000000000000000000000000000000000000000000000000000000"
        }
      ) {
        id
        referralCode
        timestamp
        volume
        volumeCumulative
        totalRebateUsd
        trades
        tradesCumulative
        registeredReferralsCount
        registeredReferralsCountCumulative
        tradedReferralsCount
        tradedReferralsCountCumulative
      }
    }`);

    expect(affiliateStats[0]).toMatchObject({
      id:
        "total:0:0x74616e6f00000000000000000000000000000000000000000000000000000000:0x99655ca16c742b46a4a05afaf0f7798c336fd279",
      referralCode: "0x74616e6f00000000000000000000000000000000000000000000000000000000",
      timestamp: "0",
      volume: "957338533955601097983351221600666685544",
      volumeCumulative: "957338533955601097983351221600666685544",
      totalRebateUsd: "235887342134373405540272544146125327",
      trades: "6538",
      tradesCumulative: "6538",
      registeredReferralsCount: "147",
      registeredReferralsCountCumulative: "147",
      tradedReferralsCount: "128",
      tradedReferralsCountCumulative: "128"
    });
  });

  it("daily 1", async () => {
    const { affiliateStats } = await requestSubgraph(`{
      affiliateStats(
        block:{
          number:110824197
        }
        where:{
          affiliate:"0x99655ca16c742b46a4a05afaf0f7798c336fd279"
          referralCode:"0x74616e6f00000000000000000000000000000000000000000000000000000000"
          period:"daily"
          tradedReferralsCountCumulative:0
        }
        orderBy:timestamp
        orderDirection:desc
        first:1000
      ) {
        referralCode
        timestamp
        volume
        volumeCumulative
        totalRebateUsd
        trades
        tradesCumulative
        registeredReferralsCount
        registeredReferralsCountCumulative
        tradedReferralsCount
        tradedReferralsCountCumulative
      }
    }`);

    expect(affiliateStats).toHaveLength(1);

    expect(affiliateStats[0]).toMatchObject({
      referralCode: "0x74616e6f00000000000000000000000000000000000000000000000000000000",
      timestamp: "1651017600",
      volume: "0",
      volumeCumulative: "0",
      totalRebateUsd: "0",
      trades: "0",
      tradesCumulative: "0",
      registeredReferralsCount: "0",
      registeredReferralsCountCumulative: "0",
      tradedReferralsCount: "0",
      tradedReferralsCountCumulative: "0"
    });
  });

  it("daily 2", async () => {
    const { affiliateStats } = await requestSubgraph(`{
      affiliateStats(
        block:{
          number:110824197
        }
        where:{
          affiliate:"0x99655ca16c742b46a4a05afaf0f7798c336fd279"
          referralCode:"0x74616e6f00000000000000000000000000000000000000000000000000000000"
          period:"daily"
        }
        orderBy:timestamp
        orderDirection:desc
        first:3
      ) {
        referralCode
        timestamp
        volume
        volumeCumulative
        totalRebateUsd
        trades
        tradesCumulative
        registeredReferralsCount
        registeredReferralsCountCumulative
        tradedReferralsCount
        tradedReferralsCountCumulative
      }
    }`);

    expect(affiliateStats).toHaveLength(3);

    expect(affiliateStats).toMatchObject([
      {
        referralCode: "0x74616e6f00000000000000000000000000000000000000000000000000000000",
        timestamp: "1689120000",
        volume: "1137744509173911780055985184488000000",
        volumeCumulative: "957338533955601097983351221600666685544",
        totalRebateUsd: "284436127293477945013996296122000",
        trades: "21",
        tradesCumulative: "6538",
        registeredReferralsCount: "0",
        registeredReferralsCountCumulative: "147",
        tradedReferralsCount: "3",
        tradedReferralsCountCumulative: "128"
      },
      {
        referralCode: "0x74616e6f00000000000000000000000000000000000000000000000000000000",
        timestamp: "1689033600",
        volume: "1060243217115181869223744400000000000",
        volumeCumulative: "956200789446427186203295236416178685544",
        totalRebateUsd: "265060804278795467305936100000000",
        trades: "4",
        tradesCumulative: "6517",
        registeredReferralsCount: "0",
        registeredReferralsCountCumulative: "147",
        tradedReferralsCount: "3",
        tradedReferralsCountCumulative: "128"
      },
      {
        referralCode: "0x74616e6f00000000000000000000000000000000000000000000000000000000",
        timestamp: "1688947200",
        volume: "472016840946404878936056213271406000",
        volumeCumulative: "955140546229312004334071492016178685544",
        totalRebateUsd: "118004210236601219734014053317850",
        trades: "11",
        tradesCumulative: "6513",
        registeredReferralsCount: "0",
        registeredReferralsCountCumulative: "147",
        tradedReferralsCount: "2",
        tradedReferralsCountCumulative: "128"
      }
    ]);
  });
});
