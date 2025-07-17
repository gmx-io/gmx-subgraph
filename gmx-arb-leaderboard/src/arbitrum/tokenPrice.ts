import { AnswerUpdated } from '../../generated/ChainlinkAggregatorETH/ChainlinkAggregator'
import { PriceUpdate } from '../../generated/FastPriceFeed/FastPriceEvents'
import { AddLiquidity, RemoveLiquidity } from "../../generated/GlpManager/GlpManager"
import { Swap } from '../../generated/GmxPrice/UniswapPoolV3'
import { getTokenUsdAmount, BI_22_PRECISION, TokenDecimals, _storeDefaultPricefeed, BI_18_PRECISION, _storeGlpAddLiqPricefeed, _storeGlpRemoveLiqPricefeed } from "../helpers"
import { GLP, GMX, LINK, UNI, WBTC, WETH } from './constant'


export function handleFastPriceEvent(event: PriceUpdate): void {
  const price = event.params.price
  const token = event.params.token.toHex()
  _storeDefaultPricefeed(token, event, price)
}


export function handleAnswerUpdatedETH(event: AnswerUpdated): void {
  const price = event.params.current.times(BI_22_PRECISION)
  _storeDefaultPricefeed(WETH, event, price)
}

export function handleAnswerUpdatedBTC(event: AnswerUpdated): void {
  const price = event.params.current.times(BI_22_PRECISION)
  _storeDefaultPricefeed(WBTC, event, price)
}

export function handleAnswerUpdatedLINK(event: AnswerUpdated): void {
  const price = event.params.current.times(BI_22_PRECISION)
  _storeDefaultPricefeed(LINK, event, price)
}
export function handleAnswerUpdatedUNI(event: AnswerUpdated): void {
  const price = event.params.current.times(BI_22_PRECISION)
  _storeDefaultPricefeed(UNI, event, price)
}

export function handleUniswapGmxEthSwap(event: Swap): void {
  const ethPerGmx = event.params.amount0.times(BI_18_PRECISION).div(event.params.amount1).abs()
  const price = getTokenUsdAmount(ethPerGmx, WETH, TokenDecimals.WETH)

  _storeDefaultPricefeed(GMX, event, price)
}


export function handleAddLiquidity(event: AddLiquidity): void {
  _storeGlpAddLiqPricefeed(GLP, event)
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
  _storeGlpRemoveLiqPricefeed(GLP, event)
}