import { Address, BigInt } from "@graphprotocol/graph-ts"
import { OpenPosition } from "../../generated/SymmDataSource/v3"

import { zero_address } from "../solidly/utils"
import { Quote } from "../../generated/schema"
import { Handler } from "./Handler"
import { updateVolume } from "./utils"

export class OpenPositionHandler extends Handler {
  event: OpenPosition
  user: Address

  constructor(_event: OpenPosition) {
    super(_event)
    this.user = super.getOwner(_event.params.partyA)
    this.event = _event
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
    quote.quantity = this.event.params.filledAmount
    quote.save()
  }

  public getVolume(): BigInt {
    return this.event.params.filledAmount
      .times(this.event.params.openedPrice)
      .div(BigInt.fromString("10").pow(18))
  }
}
