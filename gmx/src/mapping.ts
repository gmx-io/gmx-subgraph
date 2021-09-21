import { BigInt, Address, TypedMap, ethereum, store, log } from "@graphprotocol/graph-ts"
import {
  GlpManager,
  AddLiquidity as AddLiquidityEvent,
  RemoveLiquidity as RemoveLiquidityEvent
} from "../generated/GlpManager/GlpManager"

import {
  Vault,
  Swap as SwapEvent,
  IncreasePosition as IncreasePositionEvent,
  DecreasePosition as DecreasePositionEvent,
  LiquidatePosition as LiquidatePositionEvent,
  BuyUSDG as BuyUSDGEvent,
  SellUSDG as SellUSDGEvent,
} from "../generated/Vault/Vault"

import {
  AddLiquidity,
  RemoveLiquidity,
  Swap,
  HourlyFee,
  HourlyVolume,
  Transaction,
  HourlyGlpStat,
  HourlyVolumeBySource,
  HourlyVolumeByToken
} from "../generated/schema"

let BASIS_POINTS_DIVISOR = BigInt.fromString("10000")
let PRECISION = BigInt.fromString("10").pow(30)

// let tokenDecimals = new Map<String, i32>()
// tokenDecimals.set(WETH, 18)
// tokenDecimals.set(BTC, 8)
// tokenDecimals.set(LINK, 18)
// tokenDecimals.set(UNI, 18)

export function handleIncreasePosition(event: IncreasePositionEvent): void {
  _storeVolume("margin", event.block.timestamp, event.params.sizeDelta)
  _storeVolumeBySource("margin", event.block.timestamp, event.transaction.to, event.params.sizeDelta)
  _storeVolumeByToken("margin", event.block.timestamp, event.params.collateralToken, event.params.indexToken, event.params.sizeDelta)
  _storeFees("margin", event.block.timestamp, event.params.fee)
}

export function handleDecreasePosition(event: DecreasePositionEvent): void {
  _storeVolume("margin", event.block.timestamp, event.params.sizeDelta)
  _storeVolumeBySource("margin", event.block.timestamp, event.transaction.to, event.params.sizeDelta)
  _storeVolumeByToken("margin", event.block.timestamp, event.params.collateralToken, event.params.indexToken, event.params.sizeDelta)
  _storeFees("margin", event.block.timestamp, event.params.fee)
}

export function handleLiquidatePosition(event: LiquidatePositionEvent):void {
  _storeVolume("liquidation", event.block.timestamp, event.params.size)
  _storeVolumeBySource("liquidation", event.block.timestamp, event.transaction.to, event.params.size)

  // not very accurate way of calculating fees
  // because in case collateral is not enough to cover liquidation expenses
  // we charge whole collateral as fee
  let fee = event.params.size / BigInt.fromI32(1000) // 0.1%
  _storeFees("liquidation", event.block.timestamp, fee)
}

export function handleBuyUSDG(event: BuyUSDGEvent): void {
  let volume = event.params.usdgAmount * BigInt.fromString("1000000000000")
  _storeVolume("mint", event.block.timestamp, volume)
  _storeVolumeBySource("mint", event.block.timestamp, event.transaction.to, volume)

  let fee = volume * event.params.feeBasisPoints / BASIS_POINTS_DIVISOR
  _storeFees("mint", event.block.timestamp, fee)
}

export function handleSellUSDG(event: SellUSDGEvent): void {
  let volume = event.params.usdgAmount * BigInt.fromString("1000000000000")
  _storeVolumeBySource("burn", event.block.timestamp, event.transaction.to, volume)
  _storeVolume("burn", event.block.timestamp, volume)

  let fee = volume * event.params.feeBasisPoints / BASIS_POINTS_DIVISOR
  _storeFees("burn", event.block.timestamp, fee)
}

export function handleSwap(event: SwapEvent): void {
  let txId = event.transaction.hash.toHexString()
  let transaction = Transaction.load(txId)
  if (transaction == null) {
    transaction = new Transaction(event.transaction.hash.toHexString())
    transaction.from = event.transaction.from.toHexString()
    transaction.to = event.transaction.to.toHexString()
    transaction.save()
  }

  let id = _getIdFromEvent(event)
  let entity = new Swap(id)

  entity.tokenIn = event.params.tokenIn.toHexString()
  entity.tokenOut = event.params.tokenOut.toHexString()
  entity.account = event.params.account.toHexString()

  entity.amountIn = event.params.amountIn
  entity.amountOut = event.params.amountOut
  entity.amountOutAfterFees = event.params.amountOutAfterFees
  entity.feeBasisPoints = event.params.feeBasisPoints

  entity.transaction = txId

  // let contract = Vault.bind(event.address)
  // let tokenInPrice = contract.getMinPrice(Address.fromString(entity.tokenIn))
  // entity.tokenInPrice = prices.get(entity.tokenIn) as BigInt
  // prices.get(event.params.tokenIn)


  entity.tokenInPrice = _getTokenPrice(entity.tokenIn)

  entity.timestamp = event.block.timestamp.toI32()

  entity.save()

  // let decimals = contract.tokenDecimals(Address.fromString(entity.tokenIn))
  // let decimals = tokenDecimals.get(entity.tokenIn)
  // let denominator = BigInt.fromString("10").pow(decimals as u8)
  // let volume = entity.amountIn * entity.tokenInPrice / denominator
  // _storeVolume("swap", event.block.timestamp, volume)
  // _storeVolumeBySource("swap", event.block.timestamp, event.transaction.to, volume)
  // _storeVolumeByToken("swap", event.block.timestamp, event.params.tokenIn, event.params.tokenOut, volume)

  // let fee = volume * entity.feeBasisPoints / BASIS_POINTS_DIVISOR
  // _storeFees("swap", event.block.timestamp, fee)
}

function _getTokenPrice(tokenIn: String): BigInt {
  let WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1"
  let BTC = "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f"
  let LINK = "0xf97f4df75117a78c1a5a0dbb814af92458539fb4"
  let UNI = "0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0"
  let USDT = "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
  let USDC = "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8"

  let prices = new TypedMap<String, BigInt>()
  prices.set(WETH, BigInt.fromString("3350") * PRECISION)
  prices.set(BTC, BigInt.fromString("45000") * PRECISION)
  prices.set(LINK, BigInt.fromString("25") * PRECISION)
  prices.set(UNI, BigInt.fromString("23") * PRECISION)
  prices.set(USDC, PRECISION)
  prices.set(USDT, PRECISION)

  return prices.get(tokenIn) as BigInt
}

export function handleAddLiquidity(event: AddLiquidityEvent): void {
  let id = _getIdFromEvent(event)
  let entity = new AddLiquidity(id)

  entity.account = event.params.account.toHexString()
  entity.token = event.params.token.toHexString()
  entity.amount = event.params.amount
  entity.aumInUsdg = event.params.aumInUsdg
  entity.glpSupply = event.params.glpSupply
  entity.usdgAmount = event.params.usdgAmount
  entity.mintAmount = event.params.mintAmount
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()

  _storeGlpStat(event.block.timestamp, event.params.glpSupply, event.params.aumInUsdg)
}

export function handleRemoveLiquidity(event: RemoveLiquidityEvent): void {
  let id = _getIdFromEvent(event)
  let entity = new RemoveLiquidity(id)

  entity.account = event.params.account.toHexString()
  entity.token = event.params.token.toHexString()
  entity.glpAmount = event.params.glpAmount
  entity.aumInUsdg = event.params.aumInUsdg
  entity.glpSupply = event.params.glpSupply
  entity.usdgAmount = event.params.usdgAmount
  entity.amountOut = event.params.amountOut
  entity.timestamp = event.block.timestamp.toI32()

  entity.save() 

  _storeGlpStat(event.block.timestamp, event.params.glpSupply, event.params.aumInUsdg)
}

let TRADE_TYPES = new Array<string>(5)
TRADE_TYPES[0] = "margin"
TRADE_TYPES[1] = "swap"
TRADE_TYPES[2] = "mint"
TRADE_TYPES[3] = "burn"
TRADE_TYPES[4] = "liquidation"

function _storeFees(type: string, timestamp: BigInt, fees: BigInt): void {
  let id = _getHourId(timestamp)
  let entity = HourlyFee.load(id)

  if (entity == null) {
    entity = new HourlyFee(id)
    for (let i = 0; i < TRADE_TYPES.length; i++) {
      let _type = TRADE_TYPES[i]
      entity.setBigInt(_type, BigInt.fromI32(0)) 
    }
  }

  entity.setBigInt(type, entity.getBigInt(type) + fees)
  entity.save()
}

function _storeVolume(type: string, timestamp: BigInt, volume: BigInt): void {
  let id = _getHourId(timestamp)
  let entity = HourlyVolume.load(id)

  if (entity == null) {
    entity = new HourlyVolume(id)
    for (let i = 0; i < TRADE_TYPES.length; i++) {
      let _type = TRADE_TYPES[i]
      entity.setBigInt(_type, BigInt.fromI32(0)) 
    }
  }

  entity.setBigInt(type, entity.getBigInt(type) + volume)
  entity.save()
}

function _storeVolumeBySource(type: string, timestamp: BigInt, source: Address | null, volume: BigInt): void {
  let id = _getHourId(timestamp) + ":" + source.toHexString()
  let entity = HourlyVolumeBySource.load(id)

  if (entity == null) {
    entity = new HourlyVolumeBySource(id)
    if (source == null) {
      entity.source = Address.fromString("")
    } else {
      entity.source = Address.fromString(source.toHexString())
    }
    entity.timestamp = timestamp.toI32()
    for (let i = 0; i < TRADE_TYPES.length; i++) {
      let _type = TRADE_TYPES[i]
      entity.setBigInt(_type, BigInt.fromI32(0)) 
    }
  }

  entity.setBigInt(type, entity.getBigInt(type) + volume)
  entity.save()
}

function _storeVolumeByToken(type: string, timestamp: BigInt, tokenA: Address, tokenB: Address, volume: BigInt): void {
  let id = _getHourId(timestamp) + ":" + tokenA.toHexString() + ":" + tokenB.toHexString()
  let entity = HourlyVolumeByToken.load(id)

  if (entity == null) {
    entity = new HourlyVolumeByToken(id)
    entity.tokenA = tokenA
    entity.tokenB = tokenB
    entity.timestamp = timestamp.toI32()
    for (let i = 0; i < TRADE_TYPES.length; i++) {
      let _type = TRADE_TYPES[i]
      entity.setBigInt(_type, BigInt.fromI32(0)) 
    }
  }

  entity.setBigInt(type, entity.getBigInt(type) + volume)
  entity.save()
}

function _storeGlpStat(timestamp: BigInt, glpSupply: BigInt, aumInUsdg: BigInt): void {
  let id = _getHourId(timestamp)
  let entity = HourlyGlpStat.load(id)

  if (entity == null) {
    entity = new HourlyGlpStat(id)
    entity.glpSupply = BigInt.fromI32(0)
    entity.aumInUsdg = BigInt.fromI32(0)
  }

  entity.aumInUsdg = aumInUsdg
  entity.glpSupply = glpSupply

  entity.save()
}

function _getIdFromEvent(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
}

function _getHourId(timestamp: BigInt): string {
  let hourTimestamp = timestamp.toI32() / 3600 * 3600
  return hourTimestamp.toString()
}
