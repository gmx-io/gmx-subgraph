import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";

export const convertAddress = (key: string, value: string): ethereum.Tuple => {
  return changetype<ethereum.Tuple>([
    ethereum.Value.fromString(key),
    ethereum.Value.fromAddress(Address.fromString(value)),
  ]);
};

export const convertUint = (key: string, value: string): ethereum.Tuple => {
  return changetype<ethereum.Tuple>([
    ethereum.Value.fromString(key),
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(value)),
  ]);
};

export const convertInt = (key: string, value: string): ethereum.Tuple => {
  return changetype<ethereum.Tuple>([
    ethereum.Value.fromString(key),
    ethereum.Value.fromSignedBigInt(BigInt.fromString(value)),
  ]);
};

export const convertBool = (key: string, value: boolean): ethereum.Tuple => {
  return changetype<ethereum.Tuple>([
    ethereum.Value.fromString(key),
    ethereum.Value.fromBoolean(value),
  ]);
};

export const convertBytes32 = (key: string, value: string): ethereum.Tuple => {
  return changetype<ethereum.Tuple>([
    ethereum.Value.fromString(key),
    ethereum.Value.fromBytes(Bytes.fromHexString(value)),
  ]);
};
