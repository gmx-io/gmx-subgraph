import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import { ethereum as chainEthereum } from "@graphprotocol/graph-ts/chain/ethereum";
import {
  Reader,
  Reader__getMarketTokenPriceInputIndexTokenPriceStruct,
  Reader__getMarketTokenPriceInputLongTokenPriceStruct,
  Reader__getMarketTokenPriceInputMarketStruct,
  Reader__getMarketTokenPriceInputShortTokenPriceStruct,
} from "./Reader";
import { MarketInfo, TokenPrice, Transaction } from "../../generated/schema";
import { getReaderContractConfigByNetwork } from "./readerConfigs";

let ZERO = BigInt.fromI32(0);

export function getMarketPoolValueFromContract(
  marketAddress: string,
  network: string,
  transaction: Transaction
): BigInt {
  let contractConfig = getReaderContractConfigByNetwork(network);

  if (transaction.blockNumber < contractConfig.blockNumber) {
    log.warning("blockNumber too low blockNumber={}, expected={}", [
      BigInt.fromI32(transaction.blockNumber).toString(),
      BigInt.fromI32(contractConfig.blockNumber).toString(),
    ]);
    return ZERO;
  }

  log.warning("before bind", []);
  let contract = Reader.bind(contractConfig.readerContractAddress);
  log.warning("after bind", []);
  let marketInfo = MarketInfo.load(marketAddress);

  if (!marketInfo) {
    log.warning("MarketInfo not found {}", [marketAddress]);
    return ZERO;
  }

  let marketArg = new Reader__getMarketTokenPriceInputMarketStruct(4);
  log.warning("marketParams created", []);
  marketArg[0] = chainEthereum.Value.fromAddress(
    Address.fromString(marketInfo.marketToken)
  );
  marketArg[1] = chainEthereum.Value.fromAddress(
    Address.fromString(marketInfo.indexToken)
  );
  marketArg[2] = chainEthereum.Value.fromAddress(
    Address.fromString(marketInfo.longToken)
  );
  marketArg[3] = chainEthereum.Value.fromAddress(
    Address.fromString(marketInfo.shortToken)
  );

  log.warning("marketParams assigned", []);

  // indexToken
  let indexTokenPrice = loadTokenPrice(marketInfo.indexToken)!;
  let indexTokenPriceArg = createPriceForContractCall<
    Reader__getMarketTokenPriceInputIndexTokenPriceStruct
  >(indexTokenPrice.minPrice, indexTokenPrice.maxPrice);

  // longToken
  let longTokenPrice = loadTokenPrice(marketInfo.longToken)!;
  let longTokenPriceArg = createPriceForContractCall<
    Reader__getMarketTokenPriceInputLongTokenPriceStruct
  >(longTokenPrice.minPrice, longTokenPrice.maxPrice);

  // shortToken
  let shortTokenPrice = loadTokenPrice(marketInfo.shortToken)!;
  let shortTokenPriceArg = createPriceForContractCall<
    Reader__getMarketTokenPriceInputShortTokenPriceStruct
  >(shortTokenPrice.minPrice, shortTokenPrice.maxPrice);

  log.warning("prices created", []);

  let bytes = Bytes.fromHexString(
    "0xab15365d3aa743e766355e2557c230d8f943e195dc84d9b2b05928a07b635ee1"
  ) as Bytes;

  log.warning("before call", []);

  log.warning(
    "args dataStoreAddress={}, marketArg.marketToken={}, marketArg.indexToken={},  marketArg.longToken={}, marketArg.shortToken={}, indexTokenPriceArg.min={}, indexTokenPriceArg.max={}, longTokenPriceArg.min={}, longTokenPriceArg.max={}, shortTokenPriceArg.min={}, shortTokenPriceArg.max={}, bytes={}",
    [
      contractConfig.dataStoreAddress.toHexString(),
      marketArg.marketToken.toHexString(),
      marketArg.indexToken.toHexString(),
      marketArg.longToken.toHexString(),
      marketArg.shortToken.toHexString(),
      indexTokenPriceArg.min.toString(),
      indexTokenPriceArg.max.toString(),
      longTokenPriceArg.min.toString(),
      longTokenPriceArg.max.toString(),
      shortTokenPriceArg.min.toString(),
      shortTokenPriceArg.max.toString(),
      bytes.toHexString(),
    ]
  );

  let res = contract.getMarketTokenPrice(
    contractConfig.dataStoreAddress,
    marketArg,
    indexTokenPriceArg,
    longTokenPriceArg,
    shortTokenPriceArg,
    bytes,
    true
  );

  let poolValue = res.value1.poolValue;
  log.warning("after call poolValue={} ", [poolValue.toString()]);

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
    log.warning("TokenPrice not found {}", [tokenAddress]);
    throw new Error("TokenPrice not found");
  }

  return tokenPrice!;
}
