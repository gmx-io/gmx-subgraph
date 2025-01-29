import * as erc20 from "../../generated/transferGmx/ERC20"
import { getTokenUsdAmount, _storeERC20Transfer, TokenDecimals, getIdFromEvent } from "../helpers"
import { BMX, MLT } from "./constant"
import {BigInt} from "@graphprotocol/graph-ts";

export const ZERO_BI = BigInt.fromI32(0)

export function handleGmxTransfer(event: erc20.Transfer): void {
  // const amountUsd = getTokenUsdAmount(event.params.value, BMX, TokenDecimals.BMX)
  const amountUsd = ZERO_BI
  _storeERC20Transfer(BMX, event, amountUsd)
}

export function handleGlpTransfer(event: erc20.Transfer): void {
  // const amountUsd = getTokenUsdAmount(event.params.value, MLT, TokenDecimals.MLT)
  const amountUsd = ZERO_BI
  _storeERC20Transfer(MLT, event, amountUsd)
}
// WETH, WBTC, weETH, MODE,
// export function handleWETHTransfer(event: erc20.Transfer): void {
//   const amountUsd = getTokenUsdAmount(event.params.value, WETH, TokenDecimals.WETH)
//   _storeERC20Transfer(WETH, event, amountUsd)
// }
//
// export function handleWBTCTransfer(event: erc20.Transfer): void {
//   const amountUsd = getTokenUsdAmount(event.params.value, WBTC, TokenDecimals.WBTC)
//   _storeERC20Transfer(WBTC, event, amountUsd)
// }
//
// export function handleweETHTransfer(event: erc20.Transfer): void {
//   const amountUsd = getTokenUsdAmount(event.params.value, weETH, TokenDecimals.weETH)
//   _storeERC20Transfer(weETH, event, amountUsd)
// }
//
// export function handleweMODETransfer(event: erc20.Transfer): void {
//   const amountUsd = getTokenUsdAmount(event.params.value, MODE, TokenDecimals.MODE)
//   _storeERC20Transfer(MODE, event, amountUsd)
// }
