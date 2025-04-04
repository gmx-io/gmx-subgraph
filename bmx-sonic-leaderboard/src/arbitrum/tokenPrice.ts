import { AnswerUpdated } from '../../generated/ChainlinkAggregatorETH/AggregatorInterface'
import { PriceUpdate } from '../../generated/FastPriceFeed/FastPriceEvents'
import { AddLiquidity, RemoveLiquidity } from "../../generated/GlpManager/GlpManager"
import { BI_22_PRECISION, _storeDefaultPricefeed, _storeGlpAddLiqPricefeed, _storeGlpRemoveLiqPricefeed } from "../helpers"
import { S, ETH, USDC, SLT } from './constant'

export function handleFastPriceEvent(event: PriceUpdate): void {
  const price = event.params.price
  const token = event.params.token.toHex()
  _storeDefaultPricefeed(token, event, price)
}

export function handleAnswerUpdatedS(event: AnswerUpdated): void {
  const price = event.params.current.times(BI_22_PRECISION)
  _storeDefaultPricefeed(S, event, price)
}

export function handleAnswerUpdatedETH(event: AnswerUpdated): void {
  const price = event.params.current.times(BI_22_PRECISION)
  _storeDefaultPricefeed(ETH, event, price)
}

export function handleAnswerUpdatedUSDC(event: AnswerUpdated): void {
  const price = event.params.current.times(BI_22_PRECISION)
  _storeDefaultPricefeed(USDC, event, price)
}

// export function handleEqualizerMpxFtmSwap(event: Sync): void {
//   const bnbPerMpx = event.params.reserve0.times(BI_18_PRECISION).div(event.params.reserve1).abs()
//   const price = getTokenUsdAmount(bnbPerMpx, WETH, TokenDecimals.WETH)

//   _storeDefaultPricefeed(BMX, event, price)
// }

export function handleAddLiquidity(event: AddLiquidity): void {
  _storeGlpAddLiqPricefeed(SLT, event)
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
  _storeGlpRemoveLiqPricefeed(SLT, event)
}


