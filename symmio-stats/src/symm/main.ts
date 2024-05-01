import { BigInt } from "@graphprotocol/graph-ts"
import {
  EmergencyClosePosition,
  FillCloseRequest,
  ForceClosePosition,
  LiquidatePositionsPartyA,
  LiquidatePositionsPartyB,
  OpenPosition,
  SendQuote,
} from "../../generated/SymmDataSource/v3"
import { Claim } from "../../generated/DibsRewarder/DibsRewarder"
import { Quote, UserDailyClaim, UserTotalClaim } from "../../generated/schema"
import { CloseRequestHandler } from "./SymmCloseRequestHandler"
import { LiquidatePositionsHandler } from "./SymmLiquidatePositionsHandler"
import { OpenPositionHandler } from "./SymmOpenPositionHandler"

export function handleClaim(event: Claim): void {
  const user = event.params.user
  const day = event.params.day
  const amount = event.params.amount

  const daily_key = user.toHex()+"-"+day.toString()
  let daily = UserDailyClaim.load(daily_key)
  if (daily == null) {
    daily = new UserDailyClaim(daily_key)
    daily.user = user
    daily.day = day
    daily.amount = amount
    daily.save()
  } else {
    daily.amount = daily.amount.plus(amount)
    daily.save()
  }

  const total_key = user.toHex()
  let total = UserTotalClaim.load(total_key)
  if (total == null) {
    total = new UserTotalClaim(total_key)
    total.user = user
    total.amount = amount
    total.save()
  } else {
    total.amount = total.amount.plus(amount)
    total.save()
  }
}

export function handleOpenPosition(event: OpenPosition): void {
  const handler = new OpenPositionHandler(event)
  handler.handle()
}

export function handleSendQuote(event: SendQuote): void {
  const quote = new Quote(
    event.address.toHexString() + event.params.quoteId.toString(),
  )
  quote.transaction = event.transaction.hash
  quote.quantity = event.params.quantity
  quote.account = event.params.partyA
  quote.closedAmount = BigInt.fromString("0")
  quote.avgClosedPrice = BigInt.fromString("0")
  quote.save()
}

export function handleFillCloseRequest(event: FillCloseRequest): void {
  const handler = new CloseRequestHandler(event)
  handler.handle()
}

export function handleEmergencyCloseRequest(
  event: EmergencyClosePosition,
): void {
  const handler = new CloseRequestHandler(event)
  handler.handle()
}

export function handleForceCloseRequest(event: ForceClosePosition): void {
  const handler = new CloseRequestHandler(event)
  handler.handle()
}

export function handleLiquidatePositionsPartyA(
  event: LiquidatePositionsPartyA,
): void {
  const handler = new LiquidatePositionsHandler(event)
  handler.handle()
}

export function handleLiquidatePositionsPartyB(
  event: LiquidatePositionsPartyB,
): void {
  const handler = new LiquidatePositionsHandler(event)
  handler.handle()
}
