import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import {
  MarketInfo,
  PositionDecrease,
  PositionFeesInfo,
  PositionIncrease,
  TokenPrice,
  Transaction,
} from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { PositionImpactPoolDistributedEventData } from "../utils/events/PositionImpactPoolDistributedEventData";
import { ethereum as chainEthereum } from "@graphprotocol/graph-ts/chain/ethereum";
import {
  Reader,
  Reader__getMarketTokenPriceInputIndexTokenPriceStruct,
  Reader__getMarketTokenPriceInputLongTokenPriceStruct,
  Reader__getMarketTokenPriceInputMarketStruct,
  Reader__getMarketTokenPriceInputShortTokenPriceStruct,
} from "../contracts/Reader";
import { markets } from "../config/markets";

export function savePositionIncrease(
  eventData: EventData,
  transaction: Transaction
): PositionIncrease {
  let orderKey = eventData.getBytes32Item("orderKey")!.toHexString();
  let entity = new PositionIncrease(orderKey);

  entity.orderKey = orderKey;
  entity.positionKey = eventData.getBytes32Item("positionKey")!.toHexString();

  entity.account = eventData.getAddressItemString("account")!;
  entity.marketAddress = eventData.getAddressItemString("market")!;
  entity.collateralTokenAddress = eventData.getAddressItemString(
    "collateralToken"
  )!;

  entity.collateralTokenPriceMin = eventData.getUintItem(
    "collateralTokenPrice.min"
  )!;

  entity.collateralTokenPriceMax = eventData.getUintItem(
    "collateralTokenPrice.max"
  )!;

  entity.sizeInUsd = eventData.getUintItem("sizeInUsd")!;
  entity.sizeInTokens = eventData.getUintItem("sizeInTokens")!;
  entity.collateralAmount = eventData.getUintItem("collateralAmount")!;

  entity.sizeDeltaUsd = eventData.getUintItem("sizeDeltaUsd")!;
  entity.sizeDeltaInTokens = eventData.getUintItem("sizeDeltaInTokens")!;
  entity.collateralDeltaAmount = eventData.getIntItem("collateralDeltaAmount")!;
  entity.borrowingFactor = eventData.getUintItem("borrowingFactor")!;
  entity.priceImpactDiffUsd = eventData.getUintItem("priceImpactDiffUsd")!;

  entity.executionPrice = eventData.getUintItem("executionPrice")!;

  entity.longTokenFundingAmountPerSize = eventData.getIntItem(
    "longTokenFundingAmountPerSize"
  )!;
  entity.shortTokenFundingAmountPerSize = eventData.getIntItem(
    "shortTokenFundingAmountPerSize"
  )!;
  entity.priceImpactAmount = eventData.getIntItem("priceImpactAmount")!;
  entity.pnlUsd = eventData.getIntItem("pnlUsd")!;

  entity.orderType = eventData.getUintItem("orderType")!;
  entity.isLong = eventData.getBoolItem("isLong");

  entity.transaction = transaction.id;

  entity.save();

  return entity;
}

export function savePositionDecrease(
  eventData: EventData,
  transaction: Transaction
): PositionDecrease {
  let orderKey = eventData.getBytes32Item("orderKey")!.toHexString();

  let entity = new PositionDecrease(orderKey);

  entity.orderKey = orderKey;
  entity.positionKey = eventData.getBytes32Item("positionKey")!.toHexString();

  entity.account = eventData.getAddressItemString("account")!;
  entity.marketAddress = eventData.getAddressItemString("market")!;
  entity.collateralTokenAddress = eventData.getAddressItemString(
    "collateralToken"
  )!;

  entity.collateralTokenPriceMin = eventData.getUintItem(
    "collateralTokenPrice.min"
  )!;

  entity.collateralTokenPriceMax = eventData.getUintItem(
    "collateralTokenPrice.max"
  )!;

  entity.sizeInUsd = eventData.getUintItem("sizeInUsd")!;
  entity.sizeInTokens = eventData.getUintItem("sizeInTokens")!;
  entity.collateralAmount = eventData.getUintItem("collateralAmount")!;

  entity.sizeDeltaUsd = eventData.getUintItem("sizeDeltaUsd")!;
  entity.sizeDeltaInTokens = eventData.getUintItem("sizeDeltaInTokens")!;
  entity.collateralDeltaAmount = eventData.getUintItem(
    "collateralDeltaAmount"
  )!;
  entity.borrowingFactor = eventData.getUintItem("borrowingFactor")!;
  entity.priceImpactDiffUsd = eventData.getUintItem("priceImpactDiffUsd")!;

  entity.executionPrice = eventData.getUintItem("executionPrice")!;

  entity.longTokenFundingAmountPerSize = eventData.getIntItem(
    "longTokenFundingAmountPerSize"
  )!;
  entity.shortTokenFundingAmountPerSize = eventData.getIntItem(
    "shortTokenFundingAmountPerSize"
  )!;
  entity.priceImpactAmount = eventData.getIntItem("priceImpactAmount")!;
  entity.pnlUsd = eventData.getIntItem("pnlUsd")!;

  entity.orderType = eventData.getUintItem("orderType")!;
  entity.isLong = eventData.getBoolItem("isLong");

  entity.transaction = transaction.id;

  entity.save();

  return entity;
}

export function handlePositionImpactPoolDistributed(
  eventData: EventData,
  transaction: Transaction
): void {
  let event = new PositionImpactPoolDistributedEventData(eventData);
  let poolValue: BigInt | null = null;

  // if (transaction.blockNumber <= 42258999) return;

  poolValue = getMarketPoolValueFromContract(event.market);

  if (poolValue) {
    log.warning("poolValue {}", [poolValue.toString()]);
  } else {
    log.warning("getMarketPoolValueFromContract failed, blockNumber={}", [
      `${transaction.blockNumber}`,
    ]);
    log.warning("poolValue null", []);
  }
}

function getMarketPoolValueFromContract(marketAddress: string): BigInt | null {
  let marketInfo = markets.get(marketAddress);

  if (!marketInfo) {
    log.warning("MarketInfo not found {}", [marketAddress]);
    throw new Error("MarketInfo not found");
  }

  log.warning("before bind", []);
  let contract = Reader.bind(
    Address.fromString("0xab747a7bb64B74D78C6527C1F148808a19120475")
  );
  log.warning("after bind", []);
  let dataStoreAddress = Address.fromString(
    "0xbA2314b0f71ebC705aeEBeA672cc3bcEc510D03b"
  );
  log.warning("dataStoreAddress created", []);
  let market = new Reader__getMarketTokenPriceInputMarketStruct(4);
  log.warning("marketParams created", []);
  market[0] = chainEthereum.Value.fromAddress(
    Address.fromString(marketAddress)
  );
  market[1] = chainEthereum.Value.fromAddress(
    Address.fromString(marketInfo.indexToken)
  );
  market[2] = chainEthereum.Value.fromAddress(
    Address.fromString(marketInfo.longToken)
  );
  market[3] = chainEthereum.Value.fromAddress(
    Address.fromString(marketInfo.shortToken)
  );

  log.warning("marketParams assigned", []);

  // indexToken
  let indexTokenPrice = TokenPrice.load(marketInfo.indexToken)!;
  let indexTokenPriceArg = createPriceForContractCall<
    Reader__getMarketTokenPriceInputIndexTokenPriceStruct
  >(indexTokenPrice.minPrice, indexTokenPrice.maxPrice);

  // longToken
  let longTokenPrice = TokenPrice.load(marketInfo.longToken)!;
  let longTokenPriceArg = createPriceForContractCall<
    Reader__getMarketTokenPriceInputLongTokenPriceStruct
  >(longTokenPrice.minPrice, longTokenPrice.maxPrice);

  // shortToken
  let shortTokenPrice = TokenPrice.load(marketInfo.shortToken)!;
  let shortTokenPriceArg = createPriceForContractCall<
    Reader__getMarketTokenPriceInputShortTokenPriceStruct
  >(shortTokenPrice.minPrice, shortTokenPrice.maxPrice);

  log.warning("prices created", []);

  let bytes = Bytes.fromHexString(
    "0xab15365d3aa743e766355e2557c230d8f943e195dc84d9b2b05928a07b635ee1"
  ) as Bytes;

  log.warning("before call", []);

  let res = contract.getMarketTokenPrice(
    dataStoreAddress,
    market,
    indexTokenPriceArg,
    longTokenPriceArg,
    shortTokenPriceArg,
    bytes,
    true
  );

  log.warning("after call", []);
  let poolValue = res.value1.poolValue;
  return poolValue;
}

function createPriceForContractCall<T>(minPrice: BigInt, maxPrice: BigInt): T {
  let price = new Reader__getMarketTokenPriceInputIndexTokenPriceStruct(3) as T;
  price[0] = chainEthereum.Value.fromUnsignedBigInt(minPrice);
  price[1] = chainEthereum.Value.fromUnsignedBigInt(maxPrice);

  return price as T;
}
