import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import * as vault from "../generated/Vault/Vault"
import * as glpManager from "../generated/GlpManager/GlpManager"
import * as rewardRouter from "../generated/RewardRouterV2/RewardRouterV2"
import {
  CollectMarginFee,
  CollectSwapFee,
  AddLiquidity,
  RemoveLiquidity,
  IncreasePosition,
  DecreasePosition,
  LiquidatePosition,
  ClosePosition,
  Transaction,
  Swap,
  StakeGmx,
  UnstakeGmx,
  StakeGlp,
  UnstakeGlp
} from "../generated/schema"

function _createTransactionIfNotExist(event: ethereum.Event): string {
  let id = _generateIdFromEvent(event)
  let entity = Transaction.load(id)

  if (entity == null) {
    entity = new Transaction(id)
    entity.timestamp = event.block.timestamp.toI32()
    entity.blockNumber = event.block.number.toI32()
    entity.logIndex = event.logIndex.toI32()
    entity.from = event.transaction.from.toHexString()
    if (event.transaction.to == null) {
      entity.to = ""
    } else {
      entity.to = event.transaction.to.toHexString()
    }
    entity.save()
  }

  return id
}

function _generateIdFromEvent(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + ":" + event.logIndex.toString()
}

export function handleLiquidatePosition(event: vault.LiquidatePosition): void {
  let id = _generateIdFromEvent(event)
  let entity = new LiquidatePosition(id)

  entity.key = event.params.key.toHexString()
  entity.account = event.params.account.toHexString()
  entity.collateralToken = event.params.collateralToken.toHexString()
  entity.indexToken = event.params.indexToken.toHexString()
  entity.isLong = event.params.isLong
  entity.size = event.params.size
  entity.collateral = event.params.collateral
  entity.reserveAmount = event.params.reserveAmount
  entity.realisedPnl = event.params.realisedPnl
  entity.markPrice = event.params.markPrice

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}

export function handleClosePosition(event: vault.ClosePosition): void {
  let id = _generateIdFromEvent(event)
  let entity = new ClosePosition(id)

  entity.key = event.params.key.toHexString()
  entity.size = event.params.size
  entity.collateral = event.params.collateral
  entity.averagePrice = event.params.averagePrice
  entity.entryFundingRate = event.params.entryFundingRate
  entity.reserveAmount = event.params.reserveAmount
  entity.realisedPnl = event.params.realisedPnl

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}

export function handleIncreasePosition(event: vault.IncreasePosition): void {
  let id = _generateIdFromEvent(event)
  let entity = new IncreasePosition(id)

  entity.key = event.params.key.toHexString()
  entity.account = event.params.account.toHexString()
  entity.collateralToken = event.params.collateralToken.toHexString()
  entity.indexToken = event.params.indexToken.toHexString()
  entity.collateralDelta = event.params.collateralDelta
  entity.sizeDelta = event.params.sizeDelta
  entity.isLong = event.params.isLong
  entity.price = event.params.price
  entity.fee = event.params.fee

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}

export function handleDecreasePosition(event: vault.DecreasePosition): void {
  let id = _generateIdFromEvent(event)
  let entity = new DecreasePosition(id)

  entity.key = event.params.key.toHexString()
  entity.account = event.params.account.toHexString()
  entity.collateralToken = event.params.collateralToken.toHexString()
  entity.indexToken = event.params.indexToken.toHexString()
  entity.collateralDelta = event.params.collateralDelta
  entity.sizeDelta = event.params.sizeDelta
  entity.isLong = event.params.isLong
  entity.price = event.params.price
  entity.fee = event.params.fee

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}

export function handleCollectMarginFees(event: vault.CollectMarginFees): void {
  let entity = new CollectMarginFee(event.transaction.hash.toHexString())

  entity.token = event.params.token
  entity.feeTokens = event.params.feeTokens
  entity.feeUsd = event.params.feeUsd

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}

export function handleCollectSwapFees(event: vault.CollectSwapFees): void {
  let entity = new CollectSwapFee(event.transaction.hash.toHexString())

  entity.token = event.params.token
  entity.feeTokens = event.params.feeUsd
  entity.feeUsd = event.params.feeTokens

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()
  
  entity.save()
}

export function handleSwap(event: vault.Swap): void {
  let entity = new Swap(event.transaction.hash.toHexString())

  entity.account = event.params.account.toHexString()
  entity.tokenIn = event.params.tokenIn.toHexString()
  entity.tokenOut = event.params.tokenOut.toHexString()
  entity.amountIn = event.params.amountIn
  entity.amountOut = event.params.amountOut
  entity.amountOutAfterFees = event.params.amountOutAfterFees
  entity.feeBasisPoints = event.params.feeBasisPoints

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}

export function handleAddLiquidity(event: glpManager.AddLiquidity): void {
  let entity = new AddLiquidity(event.transaction.hash.toHexString())

  entity.account = event.params.account.toHexString()
  entity.token = event.params.token.toHexString()
  entity.amount = event.params.amount
  entity.aumInUsdg = event.params.aumInUsdg
  entity.glpSupply = event.params.glpSupply
  entity.usdgAmount = event.params.usdgAmount
  entity.mintAmount = event.params.mintAmount

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}

export function handleRemoveLiquidity(event: glpManager.RemoveLiquidity): void {
  let entity = new RemoveLiquidity(event.transaction.hash.toHexString())

  entity.account = event.params.account.toHexString()
  entity.token = event.params.token.toHexString()
  entity.glpAmount = event.params.glpAmount
  entity.aumInUsdg = event.params.aumInUsdg
  entity.glpSupply = event.params.glpSupply
  entity.usdgAmount = event.params.usdgAmount
  entity.amountOut = event.params.amountOut

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save() 
}

export function handleStakeGmx(event: rewardRouter.StakeGmx): void {
  let entity = new StakeGmx(event.transaction.hash.toHexString())

  entity.account = event.params.account.toHexString()
  entity.token = event.params.token.toHexString()
  entity.amount = event.params.amount

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}

export function handleUnstakeGmx(event: rewardRouter.UnstakeGmx): void {
  let entity = new UnstakeGmx(event.transaction.hash.toHexString())

  entity.account = event.params.account.toHexString()
  entity.token = event.params.token.toHexString()
  entity.amount = event.params.amount

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}

export function handleStakeGlp(event: rewardRouter.StakeGlp): void {
  let entity = new StakeGlp(event.transaction.hash.toHexString())

  entity.account = event.params.account.toHexString()
  entity.amount = event.params.amount

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}

export function handleUnstakeGlp(event: rewardRouter.UnstakeGlp): void {
  let entity = new UnstakeGlp(event.transaction.hash.toHexString())

  entity.account = event.params.account.toHexString()
  entity.amount = event.params.amount

  entity.transaction = _createTransactionIfNotExist(event)
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()
}
