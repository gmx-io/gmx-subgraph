import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { FillCloseRequest } from "../../generated/SymmDataSource/v3"

import { Quote } from "../../generated/schema"
import { zero_address } from "../solidly/utils"
import { Handler } from "./Handler"
import { updateVolume } from "./utils"

export class CloseRequestHandler extends Handler {
  event: FillCloseRequest
  user: Address

  constructor(_event: ethereum.Event) {
    super(_event)
    const event = changetype<FillCloseRequest>(_event) // FillClose, ForceClose, EmergencyClose all have the same event signature
    this.user = super.getOwner(event.params.partyA)
    this.event = event
  }

  public handle(): void {
    if (!this.isValid) return

    this._handle()
  }

  private _handle(): void {
    if (this.user == zero_address) return
    const volumeInDollars = this.getVolume()
    updateVolume(this.user, this.day, volumeInDollars, this.timestamp) // user volume tracker
    updateVolume(
      Address.fromBytes(zero_address),
      this.day,
      volumeInDollars,
      this.timestamp,
    ) // total volume tracker

    const quote = Quote.load(this.getQuoteObjectId(this.event.params.quoteId))
    if (quote == null) return // FIXME: should not happen !
    quote.avgClosedPrice = quote.avgClosedPrice
      .times(quote.closedAmount)
      .plus(this.event.params.filledAmount.times(this.event.params.closedPrice))
      .div(quote.closedAmount.plus(this.event.params.filledAmount))
    quote.closedAmount = quote.closedAmount.plus(this.event.params.filledAmount)
    quote.save()
  }

  public getVolume(): BigInt {
    return this.event.params.filledAmount
      .times(this.event.params.closedPrice)
      .div(BigInt.fromString("10").pow(18))
  }
}
