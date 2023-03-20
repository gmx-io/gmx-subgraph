import * as erc20 from "../../generated/transferGmx/ERC20"
import * as rewardTracker from "../../generated/FeeGmxTrackerClaim/RewardTracker"
import { getTokenUsdAmount, _storeERC20Transfer, TokenDecimals, getIdFromEvent } from "../helpers"
import { EsGMX, GLP, GMX, WAVAX } from "./constant"
import { Claim } from "../../generated/schema"


export function handleGmxTransfer(event: erc20.Transfer): void {
  const amountUsd = getTokenUsdAmount(event.params.value, GMX, TokenDecimals.GMX)
  _storeERC20Transfer(GMX, event, amountUsd)
}

export function handleEsGmxTransfer(event: erc20.Transfer): void {
  const amountUsd = getTokenUsdAmount(event.params.value, GMX, TokenDecimals.GMX)
  _storeERC20Transfer(EsGMX, event, amountUsd)
}

export function handleGlpTransfer(event: erc20.Transfer): void {
  const amountUsd = getTokenUsdAmount(event.params.value, GLP, TokenDecimals.GLP)
  _storeERC20Transfer(GLP, event, amountUsd)
}


export function handleClaimFees(event: rewardTracker.Claim): void {
  const amountUsd = getTokenUsdAmount(event.params.amount, WAVAX, TokenDecimals.AVAX)
  const entity = new Claim(getIdFromEvent(event))

  entity.receiver = event.params.receiver.toHex()
  entity.amount = event.params.amount
  entity.amountUsd = amountUsd

  entity.save()
}
