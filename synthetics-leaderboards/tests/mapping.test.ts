import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index";
import { Address, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { handleEventLog1 } from "../src/mapping";
import { createEventLog1Event } from "./mapping-utils";
import {
  convertAddress,
  convertUint,
  convertInt,
  convertBool,
  convertBytes32
} from "./eventData-utils";

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    // Log 12 EventLog1: PositionIncrease
    //   Topic 0: 0x137a44067c8961cd7e1d876f4754a5a3a75989b4552f1843fc69c3b372def160
    //   Topic 1: 0xf94196ccb31f81a3e67df18f2a62cbfb50009c80a7d3c728a3f542e3abc5cb63
    //   Topic 2: 0x000000000000000000000000d0fa2ebeac5e1b5876ce2754100e9009fc0bd4fc
    //   Data:
    //     ...
    //     account: 0xD0FA2ebEAc5E1b5876CE2754100E9009Fc0Bd4FC (address)
    //     market: 0xbDf740564Ba0Caa5D74C30C530D63f9F3DFDcc86 (address)
    //     collateralToken: 0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62 (address)
    //     sizeInUsd: 82544216667300000000000000000000 (uint)
    //     sizeInTokens: 4856299644956244482 (uint)
    //     collateralAmount: 99866 (uint)
    //     borrowingFactor: 0 (uint)
    //     fundingFeeAmountPerSize: 0 (uint)
    //     longTokenClaimableFundingAmountPerSize: 0 (uint)
    //     shortTokenClaimableFundingAmountPerSize: 0 (uint)
    //     executionPrice: 16997348331466 (uint)
    //     indexTokenPrice.max: 16997208000000 (uint)
    //     indexTokenPrice.min: 16993794000000 (uint)
    //     collateralTokenPrice.max: 306165100000000000000000000 (uint)
    //     collateralTokenPrice.min: 306165100000000000000000000 (uint)
    //     sizeDeltaUsd: 82544216667300000000000000000000 (uint)
    //     sizeDeltaInTokens: 4856299644956244482 (uint)
    //     orderType: 2 (uint)
    //     collateralDeltaAmount: 99866 (int)
    //     priceImpactUsd: -681354770521816701081500000 (int)
    //     priceImpactAmount: -40094329172275 (int)
    //     isLong: true (bool)
    //     orderKey: 0x6fe7443da7c615b589f9fbf98f6e67bbe7831684fdcc155255db1856158ed2ac (bytes32)
    //     positionKey: 0xbcfe7ddc6001123c012b9a3502470eb2cddbdb30b8c4a33205f86022034ea7e9 (bytes32)
    let msgSender = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    );
    let eventName = "PositionIncrease";
    let eventNameHash = "Example string value";
    let eventData = [
      ethereum.Value.fromTuple(changetype<ethereum.Tuple>([
        ethereum.Value.fromTupleArray([
          convertAddress("account", "0xD0FA2ebEAc5E1b5876CE2754100E9009Fc0Bd4FC"),
          convertAddress("market", "0xbDf740564Ba0Caa5D74C30C530D63f9F3DFDcc86"),
          convertAddress("collateralToken", "0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62"),
        ]),
        ethereum.Value.fromTupleArray([]),
      ])),
      ethereum.Value.fromTuple(changetype<ethereum.Tuple>([
        ethereum.Value.fromTupleArray([
          convertUint("sizeInUsd", "82544216667300000000000000000000"),
          convertUint("sizeInTokens", "4856299644956244482"),
          convertUint("collateralAmount", "99866"),
          convertUint("borrowingFactor", "0"),
          convertUint("fundingFeeAmountPerSize", "0"),
          convertUint("longTokenClaimableFundingAmountPerSize", "0"),
          convertUint("shortTokenClaimableFundingAmountPerSize", "0"),
          convertUint("executionPrice", "16997348331466"),
          convertUint("indexTokenPrice.max", "16997208000000"),
          convertUint("indexTokenPrice.min", "16993794000000"),
          convertUint("collateralTokenPrice.max", "306165100000000000000000000"),
          convertUint("collateralTokenPrice.min", "306165100000000000000000000"),
          convertUint("sizeDeltaUsd", "82544216667300000000000000000000"),
          convertUint("sizeDeltaInTokens", "4856299644956244482"),
          convertUint("orderType", "2"),
        ]),
        ethereum.Value.fromTupleArray([]),
      ])),
      ethereum.Value.fromTuple(changetype<ethereum.Tuple>([
        ethereum.Value.fromTupleArray([
          convertInt("collateralDeltaAmount", "99866"),
          convertInt("priceImpactUsd", "-681354770521816701081500000"),
          convertInt("priceImpactAmount", "-40094329172275"),
        ]),
        ethereum.Value.fromTupleArray([]),
      ])),
      ethereum.Value.fromTuple(changetype<ethereum.Tuple>([
        ethereum.Value.fromTupleArray([
          convertBool("isLong", true),
        ]),
        ethereum.Value.fromTupleArray([]),
      ])),
      ethereum.Value.fromTuple(changetype<ethereum.Tuple>([
        ethereum.Value.fromTupleArray([
          convertBytes32(
            "orderKey",
            "0x6fe7443da7c615b589f9fbf98f6e67bbe7831684fdcc155255db1856158ed2ac"
          ),
          convertBytes32(
            "positionKey",
            "0xbcfe7ddc6001123c012b9a3502470eb2cddbdb30b8c4a33205f86022034ea7e9"
          ),
        ]),
        ethereum.Value.fromTupleArray([]),
      ])),
    ];

    let newEventLogEvent = createEventLog1Event(
      msgSender,
      eventName,
      eventNameHash,
      Bytes.fromHexString("0xf94196ccb31f81a3e67df18f2a62cbfb50009c80a7d3c728a3f542e3abc5cb63"),
      changetype<ethereum.Tuple>(eventData),
    );

    handleEventLog1(newEventLogEvent);
  });

  afterAll(() => {
    clearStore();
  });

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("AccountOpenPosition created and stored", () => {
    assert.entityCount("AccountOpenPosition", 1);

    assert.fieldEquals(
      "AccountOpenPosition",
      "0xbcfe7ddc6001123c012b9a3502470eb2cddbdb30b8c4a33205f86022034ea7e9",
      "account",
      "0xD0FA2ebEAc5E1b5876CE2754100E9009Fc0Bd4FC".toLowerCase(),
    );
    assert.fieldEquals(
      "AccountOpenPosition",
      "0xbcfe7ddc6001123c012b9a3502470eb2cddbdb30b8c4a33205f86022034ea7e9",
      "market",
      "0xbDf740564Ba0Caa5D74C30C530D63f9F3DFDcc86".toLowerCase(),
    );
    assert.fieldEquals(
      "AccountOpenPosition",
      "0xbcfe7ddc6001123c012b9a3502470eb2cddbdb30b8c4a33205f86022034ea7e9",
      "collateralToken",
      "0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62".toLowerCase(),
    );
    assert.fieldEquals(
      "AccountOpenPosition",
      "0xbcfe7ddc6001123c012b9a3502470eb2cddbdb30b8c4a33205f86022034ea7e9",
      "isLong",
      "true",
    );
    assert.fieldEquals(
      "AccountOpenPosition",
      "0xbcfe7ddc6001123c012b9a3502470eb2cddbdb30b8c4a33205f86022034ea7e9",
      "size",
      "4856299644956244482"
    );
    assert.fieldEquals(
      "AccountOpenPosition",
      "0xbcfe7ddc6001123c012b9a3502470eb2cddbdb30b8c4a33205f86022034ea7e9",
      "realizedPnl",
      "0"
    );
  });
});
