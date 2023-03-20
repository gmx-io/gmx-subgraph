import * as erc20 from "../../generated/transferGmx/ERC20"
import * as rewardTracker from "../../generated/FeeGmxTrackerClaim/RewardTracker"
import { getTokenUsdAmount, _storeERC20Transfer, TokenDecimals, getIdFromEvent } from "../helpers"
import { EsMPX, MLP, MPX, WFTM } from "./constant"
import { Claim } from "../../generated/schema"

export function handleGmxTransfer(event: erc20.Transfer): void {
  const amountUsd = getTokenUsdAmount(event.params.value, MPX, TokenDecimals.MPX)
  _storeERC20Transfer(MPX, event, amountUsd)
}

export function handleEsGmxTransfer(event: erc20.Transfer): void {
  const amountUsd = getTokenUsdAmount(event.params.value, MPX, TokenDecimals.MPX)
  _storeERC20Transfer(EsMPX, event, amountUsd)
}

export function handleGlpTransfer(event: erc20.Transfer): void {
  const amountUsd = getTokenUsdAmount(event.params.value, MLP, TokenDecimals.MLP)
  _storeERC20Transfer(MLP, event, amountUsd)
}

export function handleClaimFees(event: rewardTracker.Claim): void {
  const amountUsd = getTokenUsdAmount(event.params.amount, WFTM, TokenDecimals.WFTM)
  const entity = new Claim(getIdFromEvent(event))

  entity.receiver = event.params.receiver.toHex()
  entity.amount = event.params.amount
  entity.amountUsd = amountUsd

  entity.save()
}
