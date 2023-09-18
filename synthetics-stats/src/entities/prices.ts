import { Address, BigInt } from "@graphprotocol/graph-ts";
import { TokenPrice } from "../../generated/schema";

export function saveTokenPrice(
  tokenAddress: Address,
  min: BigInt,
  max: BigInt
): TokenPrice | null {
  let id = tokenAddress.toHexString();
  let entity = TokenPrice.load(id);
  if (entity == null) {
    entity = new TokenPrice(id);
  }
  entity.min = min;
  entity.max = max;
  entity.save();

  return entity;
}
