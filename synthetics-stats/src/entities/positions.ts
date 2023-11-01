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

  if (transaction.blockNumber <= 42258999) return;
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

function getTestValueFromContract(): void {}

export function getMarketPoolValueFromContract(
  marketAddress: string
): BigInt | null {
  log.warning("before bind", []);
  let contract = Reader.bind(
    Address.fromString("0xab747a7bb64B74D78C6527C1F148808a19120475")
  );
  log.warning("after bind", []);
  let dataStoreAddress = Address.fromString(
    "0xbA2314b0f71ebC705aeEBeA672cc3bcEc510D03b"
  );
  log.warning("dataStoreAddress created", []);
  let marketArg = new Reader__getMarketTokenPriceInputMarketStruct(4);
  log.warning("marketParams created", []);
  marketArg[0] = chainEthereum.Value.fromAddress(
    Address.fromString("0x1529876A9348D61C6c4a3EEe1fe6CbF1117Ca315")
  );
  marketArg[1] = chainEthereum.Value.fromAddress(
    Address.fromString("0xe39ab88f8a4777030a534146a9ca3b52bd5d43a3")
  );
  marketArg[2] = chainEthereum.Value.fromAddress(
    Address.fromString("0xe39ab88f8a4777030a534146a9ca3b52bd5d43a3")
  );
  marketArg[3] = chainEthereum.Value.fromAddress(
    Address.fromString("0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5")
  );

  log.warning("marketParams assigned", []);

  // indexToken
  let indexTokenPrice = loadTokenPrice(
    "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3"
  )!;
  let indexTokenPriceArg = createPriceForContractCall<
    Reader__getMarketTokenPriceInputIndexTokenPriceStruct
  >(indexTokenPrice.minPrice, indexTokenPrice.maxPrice);

  // longToken
  let longTokenPrice = loadTokenPrice(
    "0xe39ab88f8a4777030a534146a9ca3b52bd5d43a3"
  )!;
  let longTokenPriceArg = createPriceForContractCall<
    Reader__getMarketTokenPriceInputLongTokenPriceStruct
  >(longTokenPrice.minPrice, longTokenPrice.maxPrice);

  // shortToken
  let shortTokenPrice = loadTokenPrice(
    "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5"
  )!;
  let shortTokenPriceArg = createPriceForContractCall<
    Reader__getMarketTokenPriceInputShortTokenPriceStruct
  >(shortTokenPrice.minPrice, shortTokenPrice.maxPrice);

  log.warning("prices created", []);

  let bytes = Bytes.fromHexString(
    "0xab15365d3aa743e766355e2557c230d8f943e195dc84d9b2b05928a07b635ee1"
  ) as Bytes;

  log.warning("before call", []);
  /*
 WARN args dataStoreAddress=0xba2314b0f71ebc705aeebea672cc3bcec510d03b
 marketArg.marketToken=0x1529876a9348d61c6c4a3eee1fe6cbf1117ca315
 marketArg.indexToken=0xe39ab88f8a4777030a534146a9ca3b52bd5d43a3
 marketArg.longToken=0xe39ab88f8a4777030a534146a9ca3b52bd5d43a3
 marketArg.shortToken=0x04fc936a15352a1b15b3b9c56ea002051e3db3e5
 indexTokenPriceArg.min=100
 indexTokenPriceArg.max=200
 longTokenPriceArg.min=100
 longTokenPriceArg.max=200 
 shortTokenPriceArg.min=100
 shortTokenPriceArg.max=200
 bytes=0xab15365d3aa743e766355e2557c230d8f943e195dc84d9b2b05928a07b635ee1
 data_source: EventEmitter
 sgd: 387
 subgraph_id: QmYkBPv8s3Ptog2pGQxavgpjMimb7UgFnBpLDDxHhBpruK, component: SubgraphInstanceManager > UserMapping

 (address,(address,address,address,address),(uint256,uint256),(uint256,uint256),(uint256,uint256),bytes32,bool):(int256,(int256,int256,int256,int256,uint256,uint256,uint256,uint256,uint256,uint256,uint256))
  */
  // log.warning(
  //   "args dataStoreAddress={}, marketArg.marketToken={}, marketArg.indexToken={},  marketArg.longToken={}, marketArg.shortToken={}, indexTokenPriceArg.min={}, indexTokenPriceArg.max={}, longTokenPriceArg.min={}, longTokenPriceArg.max={}, shortTokenPriceArg.min={}, shortTokenPriceArg.max={}, bytes={}",
  //   [
  //     dataStoreAddress.toHexString(),
  //     marketArg.marketToken.toHexString(),
  //     marketArg.indexToken.toHexString(),
  //     marketArg.longToken.toHexString(),
  //     marketArg.shortToken.toHexString(),
  //     indexTokenPriceArg.min.toString(),
  //     indexTokenPriceArg.max.toString(),
  //     longTokenPriceArg.min.toString(),
  //     longTokenPriceArg.max.toString(),
  //     shortTokenPriceArg.min.toString(),
  //     shortTokenPriceArg.max.toString(),
  //     bytes.toHexString(),
  //   ]
  // );

  let res = contract.getMarketTokenPrice(
    dataStoreAddress,
    marketArg,
    indexTokenPriceArg,
    longTokenPriceArg,
    shortTokenPriceArg,
    bytes,
    true
  );
  // let res = contract.getMarketTokenPrice(
  //   dataStoreAddress,
  //   [
  //     chainEthereum.Value.fromAddress(marketArg.marketToken),
  //     chainEthereum.Value.fromAddress(marketArg.indexToken),
  //     chainEthereum.Value.fromAddress(marketArg.longToken),
  //     chainEthereum.Value.fromAddress(marketArg.shortToken),
  //   ] as Reader__getMarketTokenPriceInputMarketStruct,
  //   [
  //     chainEthereum.Value.fromUnsignedBigInt(indexTokenPriceArg.min),
  //     chainEthereum.Value.fromUnsignedBigInt(indexTokenPriceArg.max),
  //   ] as Reader__getMarketTokenPriceInputIndexTokenPriceStruct,
  //   [
  //     chainEthereum.Value.fromUnsignedBigInt(longTokenPriceArg.min),
  //     chainEthereum.Value.fromUnsignedBigInt(longTokenPriceArg.max),
  //   ] as Reader__getMarketTokenPriceInputLongTokenPriceStruct,
  //   [
  //     chainEthereum.Value.fromUnsignedBigInt(shortTokenPriceArg.min),
  //     chainEthereum.Value.fromUnsignedBigInt(shortTokenPriceArg.max),
  //   ] as Reader__getMarketTokenPriceInputShortTokenPriceStruct,
  //   bytes,
  //   true
  // );

  log.warning("after call {} [{}]", [
    res.value0.toString(),
    res.value1.toString(),
  ]);
  let poolValue = res.value1.poolValue;
  return poolValue;
}

function createPriceForContractCall<T>(minPrice: BigInt, maxPrice: BigInt): T {
  let price = new Reader__getMarketTokenPriceInputIndexTokenPriceStruct(2) as T;
  price[0] = chainEthereum.Value.fromUnsignedBigInt(minPrice);
  price[1] = chainEthereum.Value.fromUnsignedBigInt(maxPrice);

  return price as T;
}

function loadTokenPrice(tokenAddress: string): TokenPrice {
  let tokenPrice = TokenPrice.load(tokenAddress);

  if (!tokenPrice) {
    tokenPrice = new TokenPrice(tokenAddress);
    tokenPrice.minPrice = BigInt.fromI32(100);
    tokenPrice.maxPrice = BigInt.fromI32(200);
    tokenPrice.save();
    // log.warning("TokenPrice not found {}", [tokenAddress]);
    // throw new Error("TokenPrice not found");
  }

  return tokenPrice!;
}
