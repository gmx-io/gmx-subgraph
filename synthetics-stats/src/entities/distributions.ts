import { BigInt } from "@graphprotocol/graph-ts";
import { Distribution } from "../../generated/schema";
import { getTokenPrice } from "./prices";

export function saveDistribution(
  receiver: string,
  token: string,
  amount: BigInt,
  typeId: i32,
  txHash: string,
  blockNumber: i32,
  timestamp: i32
): void {
  let id = receiver + ":" + txHash + ":" + typeId.toString();
  let entity = Distribution.load(id);

  if (entity == null) {
    entity = new Distribution(id);
    entity.tokens = new Array<string>(0);
    entity.amounts = new Array<BigInt>(0);
    entity.amountsInUsd = new Array<BigInt>(0);
  }

  let tokens = entity.tokens;
  tokens.push(token);
  entity.tokens = tokens;

  let amounts = entity.amounts;
  amounts.push(amount);
  entity.amounts = amounts;

  let amountsInUsd = entity.amountsInUsd;
  amountsInUsd.push(_getAmountInUsd(token, amount));
  entity.amountsInUsd = amountsInUsd;

  entity.typeId = typeId;
  entity.receiver = receiver;

  entity.blockNumber = blockNumber;
  entity.transactionHash = txHash;
  entity.timestamp = timestamp;

  entity.save();
}

function _getAmountInUsd(token: string, amount: BigInt): BigInt {
  let tokenPrice = getTokenPrice(token);
  return tokenPrice.times(amount);
}
