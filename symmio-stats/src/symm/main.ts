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
import { Quote } from "../../generated/schema"
import { CloseRequestHandler } from "./SymmCloseRequestHandler"
import { LiquidatePositionsHandler } from "./SymmLiquidatePositionsHandler"
import { OpenPositionHandler } from "./SymmOpenPositionHandler"

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
