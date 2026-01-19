import { Address, log } from "@graphprotocol/graph-ts";

class ReaderContractConfig {
  public readerContractAddress: Address;
  public dataStoreAddress: Address;
  constructor(readerContractAddress: string, dataStoreAddress: string, public blockNumber: i32) {
    this.readerContractAddress = Address.fromString(readerContractAddress);
    this.dataStoreAddress = Address.fromString(dataStoreAddress);
  }
}

let readerContractByNetwork = new Map<string, ReaderContractConfig>();

readerContractByNetwork.set(
  "arbitrum",
  new ReaderContractConfig(
    "0x38d91ED96283d62182Fc6d990C24097A918a4d9b",
    "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8",
    112723063 + 1
  )
);
readerContractByNetwork.set(
  "goerli",
  new ReaderContractConfig(
    "0xab747a7bb64B74D78C6527C1F148808a19120475",
    "0xbA2314b0f71ebC705aeEBeA672cc3bcEc510D03b",
    42258999 + 1
  )
);

readerContractByNetwork.set(
  "fuji",
  new ReaderContractConfig(
    "0xA7FF75f85E4fB219ede2FA08Fe4dE1635261de31",
    "0xEA1BFb4Ea9A412dCCd63454AbC127431eBB0F0d4",
    25777963 + 1
  )
);

readerContractByNetwork.set(
  "avalanche",
  new ReaderContractConfig(
    "0xd868eF2fa279b510F64F44C66F08a0AEeBcBdB6b",
    "0x2F0b22339414ADeD7D5F06f9D604c7fF5b2fe3f6",
    32500437 + 1
  )
);

readerContractByNetwork.set(
  "botanix",
  new ReaderContractConfig(
    "0x858922fe3F9871bFA80AEc47D4B1F87D39F9d9d0",
    "0xA23B81a89Ab9D7D89fF8fc1b5d8508fB75Cc094d",
    118205 + 1
  )
);

readerContractByNetwork.set(
  "megaeth",
  new ReaderContractConfig(
    "0x0f038EB4a38B08cd3c937a3256b51aa01904a684",
    "0xE43C7B694f6b652a9F4A0f275C008d18758Dce35",
    5661553 + 1
  )
);

export function getReaderContractConfigByNetwork(network: string): ReaderContractConfig {
  let contract = readerContractByNetwork.get(network);
  if (!contract) {
    log.warning("Contract address not found for network {}", [network]);
    throw new Error("Contract address not found for network");
  }

  return contract;
}
