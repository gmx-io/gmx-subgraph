import { AnswerUpdated } from '../../generated/ChainlinkAggregatorETH/ChainlinkAggregator'
import { PriceUpdate } from '../../generated/FastPriceFeed/FastPriceEvents'
import { AddLiquidity, RemoveLiquidity } from "../../generated/GlpManager/GlpManager"
import { Sync } from '../../generated/GmxPrice/UniswapPoolV3'
import { getTokenUsdAmount, BI_22_PRECISION, TokenDecimals, _storeDefaultPricefeed, BI_18_PRECISION, _storeGlpAddLiqPricefeed, _storeGlpRemoveLiqPricefeed } from "../helpers"
import { BLT, BMX, WBTC, WETH, cbETH, YFI, AERO, MOG, EURC } from './constant'
import { BigInt } from "@graphprotocol/graph-ts"

export function handleFastPriceEvent(event: PriceUpdate): void {
  const price = event.params.price
  const token = event.params.token.toHex()
  _storeDefaultPricefeed(token, event, price)
}

export function handleAnswerUpdatedETH(event: AnswerUpdated): void {
  const price = event.params.current.times(BI_22_PRECISION)
  _storeDefaultPricefeed(WETH, event, price)
}

export function handleAnswerUpdatedcbETH(event: AnswerUpdated): void {
  const price = event.params.current.times(BI_22_PRECISION)
  _storeDefaultPricefeed(cbETH, event, price)
}

export function handleAnswerUpdatedYFI(event: AnswerUpdated): void {
  const price = event.params.current.times(BI_22_PRECISION)
  _storeDefaultPricefeed(YFI, event, price)
}

export function handleAnswerUpdatedAERO(event: AnswerUpdated): void {
  const price = event.params.current.times(BI_22_PRECISION)
  _storeDefaultPricefeed(AERO, event, price)
}

export function handleAnswerUpdatedMOG(event: AnswerUpdated): void {
  const price = event.params.current.times(BI_22_PRECISION)
  _storeDefaultPricefeed(MOG, event, price.div(BigInt.fromI32(10).pow(10)))
}

export function handleAnswerUpdatedEURC(event: AnswerUpdated): void {
  const price = event.params.current.times(BI_22_PRECISION)
  _storeDefaultPricefeed(EURC, event, price)
}

export function handleAnswerUpdatedBTC(event: AnswerUpdated): void {
  const price = event.params.current.times(BI_22_PRECISION)
  _storeDefaultPricefeed(WBTC, event, price)
}

export function handleEqualizerMpxFtmSwap(event: Sync): void {
  const bnbPerMpx = event.params.reserve0.times(BI_18_PRECISION).div(event.params.reserve1).abs()
  const price = getTokenUsdAmount(bnbPerMpx, WETH, TokenDecimals.WETH)

  _storeDefaultPricefeed(BMX, event, price)
}

export function handleAddLiquidity(event: AddLiquidity): void {
  _storeGlpAddLiqPricefeed(BLT, event)
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
  _storeGlpRemoveLiqPricefeed(BLT, event)
}


