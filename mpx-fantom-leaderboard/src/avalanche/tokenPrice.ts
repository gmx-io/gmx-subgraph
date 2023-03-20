import { PriceUpdate } from '../../generated/FastPriceFeed/FastPriceEvents'
import { AddLiquidity, RemoveLiquidity } from "../../generated/GlpManager/GlpManager"
import { Sync } from '../../generated/GmxPrice/TraderJoePool'
import { BI_18_PRECISION, getTokenUsdAmount, TokenDecimals, _storeDefaultPricefeed, _storeGlpAddLiqPricefeed, _storeGlpRemoveLiqPricefeed } from "../helpers"
import { GLP, GMX, WAVAX } from './constant'


export function handleFastPriceEvent(event: PriceUpdate): void {
  const price = event.params.price
  const token = event.params.token.toHex()
  _storeDefaultPricefeed(token, event, price)
}

export function handleAddLiquidity(event: AddLiquidity): void {
  _storeGlpAddLiqPricefeed(GLP, event)
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
  _storeGlpRemoveLiqPricefeed(GLP, event)
}

export function handleTraderJoeGmxAvaxSwap(event: Sync): void {
  const avaxPerGmx = event.params.reserve0.times(BI_18_PRECISION).div(event.params.reserve1).abs()
  const price = getTokenUsdAmount(avaxPerGmx, WAVAX, TokenDecimals.AVAX)

  _storeDefaultPricefeed(GMX, event, price)
}
