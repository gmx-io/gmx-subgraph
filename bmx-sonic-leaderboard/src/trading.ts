import { ethereum, store, log, Address } from "@graphprotocol/graph-ts"
import * as contract from "../generated/gmxVault/gmxVault"
import * as positionRouter from "../generated/positionRouter/positionRouter"
import * as referralStorage from "../generated/gmxVault/ReferralStorage"

import {
  ClosePosition,
  DecreasePosition,
  IncreasePosition, LiquidatePosition, UpdatePosition, Trade, PriceLatest, ReferralAdjustment
} from "../generated/schema"
import { ReferralStorage } from "./arbitrum/constant"

import { ADDRESS_ZERO, calculatePositionDelta, calculatePositionDeltaPercentage, negate, ZERO_BI, ZERO_BYTES32 } from "./helpers"


const getReferralEventId = (account: string, ev: ethereum.Event): string => 'PositionReferral:' + account + ':' + ev.transaction.hash.toHex()
const namedEventId = (name: string, ev: ethereum.Event): string => name + ':' + ev.logIndex.toString() + ':' + ev.transaction.hash.toHex()
const namedKeyEventId = (name: string, key: string): string => name + ':' + key


export function handleIncreasePositionReferral(event: positionRouter.IncreasePositionReferral): void {
  const entity = new ReferralAdjustment(getReferralEventId(event.params.account.toHex(), event))
  const timestamp = event.block.timestamp.toI32()

  entity.timestamp = timestamp
  entity.account = event.params.account.toHex()
  entity.marginFeeBasisPoints = event.params.marginFeeBasisPoints
  entity.referralCode = event.params.referralCode.toHex()
  entity.referrer = event.params.referrer.toHex()
  entity.sizeDelta = event.params.sizeDelta

  entity.save()
}

export function handleDecreasePositionReferral(event: positionRouter.DecreasePositionReferral): void {
  const entity = new ReferralAdjustment(getReferralEventId(event.params.account.toHex(), event))
  const timestamp = event.block.timestamp.toI32()

  entity.timestamp = timestamp
  entity.account = event.params.account.toHex()
  entity.marginFeeBasisPoints = event.params.marginFeeBasisPoints
  entity.referralCode = event.params.referralCode.toHex()
  entity.referrer = event.params.referrer.toHex()
  entity.sizeDelta = negate(event.params.sizeDelta)

  entity.save()
}

export function handleIncreasePosition(event: contract.IncreasePosition): void {
  const timestamp = event.block.timestamp.toI32()
  const entity = new IncreasePosition(namedEventId('IncreasePosition', event)) // we prevent 

  const activeTradeKey = event.params.key.toHex()

  entity.timestamp = timestamp

  entity.account = event.params.account.toHex()
  entity.collateralToken = event.params.collateralToken.toHex()
  entity.indexToken = event.params.indexToken.toHex()
  entity.isLong = event.params.isLong
  entity.key = activeTradeKey

  entity.collateralDelta = event.params.collateralDelta
  entity.sizeDelta = event.params.sizeDelta
  entity.price = event.params.price
  entity.fee = event.params.fee

  entity.save()

  const activeAggTradeKey = namedKeyEventId('Trade', activeTradeKey)
  let aggTrade = Trade.load(activeAggTradeKey)


  const referralStorageInstance = referralStorage.ReferralStorage.bind(Address.fromString(ReferralStorage))
  const refInfo = referralStorageInstance.try_getTraderReferralInfo(event.params.account)

  const referralCode = refInfo.reverted ? ZERO_BYTES32 : refInfo.value.value0.toHex()
  const referrer = refInfo.reverted ? ADDRESS_ZERO : refInfo.value.value1.toHex()

  if (aggTrade === null) {
    aggTrade = new Trade(activeAggTradeKey)

    aggTrade.timestamp = entity.timestamp

    aggTrade.account = entity.account
    aggTrade.collateralToken = entity.collateralToken
    aggTrade.indexToken = entity.indexToken
    aggTrade.key = entity.key
    aggTrade.isLong = entity.isLong

    aggTrade.status = "open"

    aggTrade.increaseList = []
    aggTrade.decreaseList = []
    aggTrade.updateList = []

    aggTrade.entryReferralCode = referralCode
    aggTrade.entryReferrer = referrer
    aggTrade.entryFundingRate = ZERO_BI
    aggTrade.sizeDelta = ZERO_BI
    aggTrade.collateralDelta = ZERO_BI
    aggTrade.fee = ZERO_BI

    aggTrade.size = ZERO_BI
    aggTrade.collateral = ZERO_BI
    aggTrade.averagePrice = ZERO_BI

    aggTrade.realisedPnl = ZERO_BI
    aggTrade.realisedPnlPercentage = ZERO_BI
  }


  const increaseList = aggTrade.increaseList
  increaseList.push(entity.id)
  aggTrade.increaseList = increaseList

  if (referrer !== aggTrade.entryReferrer) {
    aggTrade.entryReferralCode = ZERO_BYTES32
    aggTrade.entryReferrer = ADDRESS_ZERO
  }

  aggTrade.collateralDelta = aggTrade.collateralDelta.plus(entity.collateralDelta)
  aggTrade.sizeDelta = aggTrade.sizeDelta.plus(entity.sizeDelta)

  aggTrade.save()
}

export function handleDecreasePosition(event: contract.DecreasePosition): void {
  const timestamp = event.block.timestamp.toI32()
  const activeTradeKey = event.params.key.toHex()
  const tradeId = namedEventId('DecreasePosition', event)
  const entity = new DecreasePosition(tradeId)

  entity.timestamp = timestamp

  entity.account = event.params.account.toHex()
  entity.collateralToken = event.params.collateralToken.toHex()
  entity.indexToken = event.params.indexToken.toHex()
  entity.isLong = event.params.isLong
  entity.key = event.params.key.toHex()

  entity.collateralDelta = event.params.collateralDelta
  entity.sizeDelta = event.params.sizeDelta
  entity.price = event.params.price
  entity.fee = event.params.fee

  entity.save()

  const activeAggTradeKey = namedKeyEventId('Trade', activeTradeKey)
  const aggTrade = Trade.load(activeAggTradeKey)

  if (aggTrade) {
    const referralStorageInstance = referralStorage.ReferralStorage.bind(Address.fromString(ReferralStorage))
    const refInfo = referralStorageInstance.try_getTraderReferralInfo(event.params.account)


    if (!refInfo.reverted) {
      const referrer = refInfo.value.value1.toHex()

      if (refInfo.value.value1.notEqual(Address.fromString(aggTrade.entryReferrer))) {
        log.warning('referrer :' + referrer + ' entry: ' + aggTrade.entryReferrer, [])
        aggTrade.entryReferralCode = ZERO_BYTES32
        aggTrade.entryReferrer = ADDRESS_ZERO
      }
    }

    const decreaseList = aggTrade.decreaseList
    decreaseList.push(entity.id)

    aggTrade.decreaseList = decreaseList
    aggTrade.fee = aggTrade.fee.plus(entity.fee)

    aggTrade.save()
  } else {
    log.error('unable to attach entity to account aggregation: aggregatedId: #{}', [entity.id])
  }

}

export function handleUpdatePosition(event: contract.UpdatePosition): void {
  const timestamp = event.block.timestamp.toI32()
  const activeTradeKey = event.params.key.toHex()
  const tradeId = namedEventId('UpdatePosition', event)
  const entity = new UpdatePosition(tradeId)

  entity.timestamp = timestamp
  entity.key = activeTradeKey

  entity.size = event.params.size
  entity.collateral = event.params.collateral
  entity.reserveAmount = event.params.reserveAmount
  entity.realisedPnl = event.params.realisedPnl
  entity.averagePrice = event.params.averagePrice
  entity.entryFundingRate = event.params.entryFundingRate

  const activeAggTradeKey = namedKeyEventId('Trade', activeTradeKey)
  const aggTrade = Trade.load(activeAggTradeKey)

  if (aggTrade) {

    // !IMPORTANT there is a slight difference between chains regarding UpdatePosition.markPrice
    // comment the lines per chain before deploying

    // Arbitrum
    // entity.markPrice = PriceLatest.load(aggTrade.indexToken)!.value

    // avalanche
    entity.markPrice = event.params.markPrice

    const updates = aggTrade.updateList

    updates.push(entity.id)

    aggTrade.updateList = updates
    aggTrade.size = entity.size
    aggTrade.averagePrice = entity.averagePrice
    aggTrade.realisedPnl = entity.realisedPnl
    aggTrade.realisedPnlPercentage = calculatePositionDeltaPercentage(entity.realisedPnl, aggTrade.collateral)
    aggTrade.entryFundingRate = event.params.entryFundingRate

    aggTrade.collateral = entity.collateral

    aggTrade.save()

  } else {
    log.error('unable to attach entity to account aggregation: aggregatedId #{}', [entity.id])
  }

  entity.save()

}

export function handleClosePosition(event: contract.ClosePosition): void {
  const timestamp = event.block.timestamp.toI32()
  const activeTradeKey = event.params.key.toHex()
  const tradeId = namedEventId('ClosePosition', event)
  const entity = new ClosePosition(tradeId)

  entity.timestamp = timestamp
  entity.key = activeTradeKey

  entity.size = event.params.size
  entity.collateral = event.params.collateral
  entity.reserveAmount = event.params.reserveAmount
  entity.realisedPnl = event.params.realisedPnl
  entity.averagePrice = event.params.averagePrice
  entity.entryFundingRate = event.params.entryFundingRate

  entity.save()

  const activeAggTradeKey = namedKeyEventId('Trade', activeTradeKey)
  const aggTrade = Trade.load(activeAggTradeKey)

  if (aggTrade) {
    const aggTradeSettledId = namedEventId('Trade', event)
    const settledAggTrade = new Trade(aggTradeSettledId)
    settledAggTrade.merge([aggTrade])

    const deltaPercentage = calculatePositionDeltaPercentage(entity.realisedPnl, aggTrade.collateral)

    settledAggTrade.id = aggTradeSettledId
    settledAggTrade.status = 'closed'
    settledAggTrade.settledTimestamp = entity.timestamp
    settledAggTrade.realisedPnl = entity.realisedPnl
    settledAggTrade.realisedPnlPercentage = deltaPercentage
    settledAggTrade.closedPosition = entity.id

    settledAggTrade.save()

    store.remove('Trade', aggTrade.id)
  }
}

export function handleLiquidatePosition(event: contract.LiquidatePosition): void {
  const timestamp = event.block.timestamp.toI32()
  const activeTradeKey = event.params.key.toHex()
  const tradeId = namedEventId('LiquidatePosition', event)
  const entity = new LiquidatePosition(tradeId)

  entity.timestamp = timestamp
  entity.key = activeTradeKey
  entity.account = event.params.account.toHex()
  entity.collateralToken = event.params.collateralToken.toHex()
  entity.indexToken = event.params.indexToken.toHex()

  entity.isLong = event.params.isLong

  entity.size = event.params.size
  entity.collateral = event.params.collateral
  entity.reserveAmount = event.params.reserveAmount
  entity.realisedPnl = event.params.realisedPnl
  entity.markPrice = event.params.markPrice

  entity.save()

  const activeAggTradeKey = namedKeyEventId('Trade', activeTradeKey)
  const aggTrade = Trade.load(activeAggTradeKey)

  if (aggTrade) {
    const aggTradeSettledId = namedEventId('Trade', event)
    const settledAggTrade = new Trade(aggTradeSettledId)
    settledAggTrade.merge([aggTrade])

    settledAggTrade.id = aggTradeSettledId
    settledAggTrade.status = 'liquidated'
    settledAggTrade.settledTimestamp = entity.timestamp
    settledAggTrade.realisedPnl = entity.realisedPnl.plus(calculatePositionDelta(entity.markPrice, entity.isLong, entity.size, aggTrade.averagePrice))
    settledAggTrade.realisedPnlPercentage = calculatePositionDeltaPercentage(settledAggTrade.realisedPnl, entity.collateral)
    settledAggTrade.liquidatedPosition = entity.id

    settledAggTrade.save()

    store.remove('Trade', aggTrade.id)
  }
}

