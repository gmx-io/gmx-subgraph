import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
  EPOCH_START_TIMESTAMP,
  MULTI_ACCOUNT_ADDRESS
} from "../../config/config"
import { MultiAccount } from "../../generated/SymmDataSource/MultiAccount"

export class Handler {
  private _event: ethereum.Event
  isValid: boolean
  timestamp: BigInt
  day: BigInt
  week: BigInt

  constructor(event: ethereum.Event) {
    this.timestamp = event.block.timestamp
    this._event = event
    const delta = event.block.timestamp.minus(
      BigInt.fromI32(EPOCH_START_TIMESTAMP),
    )

    this.isValid = delta.ge(BigInt.fromI32(0))
    this.day = delta.div(BigInt.fromI32(86400))
    this.week = delta.div(BigInt.fromI32(604800))
  }

  public handle(): void {
    if (!this.isValid) return

    throw new Error("Not implemented")
  }

  public getQuoteObjectId(quoteId: BigInt): string {
    return this._event.address.toHexString() + quoteId.toString()
  }

  public getOwner(account: Address): Address {
    const multiAccount = MultiAccount.bind(
      Address.fromString(MULTI_ACCOUNT_ADDRESS),
    )
    return multiAccount.owners(account)
  }
}
