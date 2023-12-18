import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import { ethereum as chainEthereum } from "@graphprotocol/graph-ts/chain/ethereum";
import {
  Reader,
  Reader__getMarketTokenPriceInputIndexTokenPriceStruct,
  Reader__getMarketTokenPriceInputLongTokenPriceStruct,
  Reader__getMarketTokenPriceInputMarketStruct,
  Reader__getMarketTokenPriceInputShortTokenPriceStruct
} from "./Reader";
import { MarketInfo, TokenPrice, Transaction } from "../../generated/schema";
import { getReaderContractConfigByNetwork } from "./readerConfigs";
import { getMarketInfo } from "../entities/markets";

let ZERO = BigInt.fromI32(0);
let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
let MAX_PNL_FACTOR_FOR_TRADERS = Bytes.fromHexString(
  "0xab15365d3aa743e766355e2557c230d8f943e195dc84d9b2b05928a07b635ee1"
) as Bytes;

export function getMarketPoolValueFromContract(
  marketAddress: string,
  network: string,
  transaction: Transaction
): BigInt {
  let contractConfig = getReaderContractConfigByNetwork(network);

  if (transaction.blockNumber < contractConfig.blockNumber) {
    return ZERO;
  }

  let contract = Reader.bind(contractConfig.readerContractAddress);
  let marketInfo = getMarketInfo(marketAddress);

  let marketArg = new Reader__getMarketTokenPriceInputMarketStruct(4);
  marketArg[0] = chainEthereum.Value.fromAddress(Address.fromString(marketInfo.marketToken));
  marketArg[1] = chainEthereum.Value.fromAddress(Address.fromString(marketInfo.indexToken));
  marketArg[2] = chainEthereum.Value.fromAddress(Address.fromString(marketInfo.longToken));
  marketArg[3] = chainEthereum.Value.fromAddress(Address.fromString(marketInfo.shortToken));

  let indexTokenPriceArg = createPriceForContractCall<Reader__getMarketTokenPriceInputIndexTokenPriceStruct>(
    marketInfo.indexToken
  );
  let longTokenPriceArg = createPriceForContractCall<Reader__getMarketTokenPriceInputLongTokenPriceStruct>(
    marketInfo.longToken
  );
  let shortTokenPriceArg = createPriceForContractCall<Reader__getMarketTokenPriceInputShortTokenPriceStruct>(
    marketInfo.shortToken
  );

  /*
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
      MAX_PNL_FACTOR_FOR_TRADERS.toHexString()
    ]
  );
  */

  let res = contract.getMarketTokenPrice(
    contractConfig.dataStoreAddress,
    marketArg,
    indexTokenPriceArg,
    longTokenPriceArg,
    shortTokenPriceArg,
    MAX_PNL_FACTOR_FOR_TRADERS,
    true
  );

  return res.value1.poolValue;
}

function createPriceForContractCall<T>(tokenAddress: string): T {
  let minPrice: BigInt = ZERO;
  let maxPrice: BigInt = ZERO;
  let tokenPrice = TokenPrice.load(tokenAddress);

  if (tokenPrice) {
    minPrice = tokenPrice.minPrice;
    maxPrice = tokenPrice.maxPrice;
  } else if (tokenAddress != ZERO_ADDRESS) {
    log.error("TokenPrice not found {}", [tokenAddress]);
    throw new Error("tokenAddress is not zero address");
  }

  let price = new Reader__getMarketTokenPriceInputIndexTokenPriceStruct(2) as T;
  price[0] = chainEthereum.Value.fromUnsignedBigInt(minPrice);
  price[1] = chainEthereum.Value.fromUnsignedBigInt(maxPrice);

  return price as T;
}
