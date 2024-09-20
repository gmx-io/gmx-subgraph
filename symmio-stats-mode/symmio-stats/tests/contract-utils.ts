import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Address, Bytes } from "@graphprotocol/graph-ts"
import {
  ActiveEmergencyMode,
  AddSymbol,
  DeactiveEmergencyMode,
  DeregisterPartyB,
  PauseAccounting,
  PauseGlobal,
  PauseLiquidation,
  PausePartyAActions,
  PausePartyBActions,
  RegisterPartyB,
  RoleGranted,
  RoleRevoked,
  SetBalanceLimitPerUser,
  SetCollateral,
  SetDeallocateCooldown,
  SetFeeCollector,
  SetForceCancelCloseCooldown,
  SetForceCancelCooldown,
  SetForceCloseCooldown,
  SetForceCloseGapRatio,
  SetLiquidationTimeout,
  SetLiquidatorShare,
  SetMuonConfig,
  SetMuonIds,
  SetPartyBEmergencyStatus,
  SetPendingQuotesValidLength,
  SetSuspendedAddress,
  SetSymbolAcceptableValues,
  SetSymbolFundingState,
  SetSymbolMaxLeverage,
  SetSymbolMaxSlippage,
  SetSymbolTradingFee,
  SetSymbolValidationState,
  UnpauseAccounting,
  UnpauseGlobal,
  UnpauseLiquidation,
  UnpausePartyAActions,
  UnpausePartyBActions,
  DisputeForLiquidation,
  FullyLiquidatedPartyB,
  LiquidatePartyA,
  LiquidatePartyA1,
  LiquidatePartyB,
  LiquidatePartyB1,
  LiquidatePendingPositionsPartyA,
  LiquidatePositionsPartyA,
  LiquidatePositionsPartyB,
  LiquidationDisputed,
  SetSymbolsPrices,
  SettlePartyALiquidation,
  ExpireQuote,
  ForceCancelCloseRequest,
  ForceCancelQuote,
  ForceClosePosition,
  RequestToCancelCloseRequest,
  RequestToCancelQuote,
  RequestToClosePosition,
  SendQuote,
  DiamondCut,
  AllocateForPartyB,
  AllocatePartyA,
  DeallocateForPartyB,
  DeallocatePartyA,
  Deposit,
  TransferAllocation,
  Withdraw,
  AcceptCancelCloseRequest,
  AcceptCancelRequest,
  AllocatePartyB,
  ChargeFundingRate,
  EmergencyClosePosition,
  FillCloseRequest,
  LockQuote,
  OpenPosition,
  UnlockQuote
} from "../generated/Contract/Contract"

export function createActiveEmergencyModeEvent(): ActiveEmergencyMode {
  let activeEmergencyModeEvent = changetype<ActiveEmergencyMode>(newMockEvent())

  activeEmergencyModeEvent.parameters = new Array()

  return activeEmergencyModeEvent
}

export function createAddSymbolEvent(
  id: BigInt,
  name: string,
  minAcceptableQuoteValue: BigInt,
  minAcceptablePortionLF: BigInt,
  tradingFee: BigInt,
  maxLeverage: BigInt,
  fundingRateEpochDuration: BigInt,
  fundingRateWindowTime: BigInt
): AddSymbol {
  let addSymbolEvent = changetype<AddSymbol>(newMockEvent())

  addSymbolEvent.parameters = new Array()

  addSymbolEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  )
  addSymbolEvent.parameters.push(
    new ethereum.EventParam("name", ethereum.Value.fromString(name))
  )
  addSymbolEvent.parameters.push(
    new ethereum.EventParam(
      "minAcceptableQuoteValue",
      ethereum.Value.fromUnsignedBigInt(minAcceptableQuoteValue)
    )
  )
  addSymbolEvent.parameters.push(
    new ethereum.EventParam(
      "minAcceptablePortionLF",
      ethereum.Value.fromUnsignedBigInt(minAcceptablePortionLF)
    )
  )
  addSymbolEvent.parameters.push(
    new ethereum.EventParam(
      "tradingFee",
      ethereum.Value.fromUnsignedBigInt(tradingFee)
    )
  )
  addSymbolEvent.parameters.push(
    new ethereum.EventParam(
      "maxLeverage",
      ethereum.Value.fromUnsignedBigInt(maxLeverage)
    )
  )
  addSymbolEvent.parameters.push(
    new ethereum.EventParam(
      "fundingRateEpochDuration",
      ethereum.Value.fromUnsignedBigInt(fundingRateEpochDuration)
    )
  )
  addSymbolEvent.parameters.push(
    new ethereum.EventParam(
      "fundingRateWindowTime",
      ethereum.Value.fromUnsignedBigInt(fundingRateWindowTime)
    )
  )

  return addSymbolEvent
}

export function createDeactiveEmergencyModeEvent(): DeactiveEmergencyMode {
  let deactiveEmergencyModeEvent = changetype<DeactiveEmergencyMode>(
    newMockEvent()
  )

  deactiveEmergencyModeEvent.parameters = new Array()

  return deactiveEmergencyModeEvent
}

export function createDeregisterPartyBEvent(
  partyB: Address,
  index: BigInt
): DeregisterPartyB {
  let deregisterPartyBEvent = changetype<DeregisterPartyB>(newMockEvent())

  deregisterPartyBEvent.parameters = new Array()

  deregisterPartyBEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  deregisterPartyBEvent.parameters.push(
    new ethereum.EventParam("index", ethereum.Value.fromUnsignedBigInt(index))
  )

  return deregisterPartyBEvent
}

export function createPauseAccountingEvent(): PauseAccounting {
  let pauseAccountingEvent = changetype<PauseAccounting>(newMockEvent())

  pauseAccountingEvent.parameters = new Array()

  return pauseAccountingEvent
}

export function createPauseGlobalEvent(): PauseGlobal {
  let pauseGlobalEvent = changetype<PauseGlobal>(newMockEvent())

  pauseGlobalEvent.parameters = new Array()

  return pauseGlobalEvent
}

export function createPauseLiquidationEvent(): PauseLiquidation {
  let pauseLiquidationEvent = changetype<PauseLiquidation>(newMockEvent())

  pauseLiquidationEvent.parameters = new Array()

  return pauseLiquidationEvent
}

export function createPausePartyAActionsEvent(): PausePartyAActions {
  let pausePartyAActionsEvent = changetype<PausePartyAActions>(newMockEvent())

  pausePartyAActionsEvent.parameters = new Array()

  return pausePartyAActionsEvent
}

export function createPausePartyBActionsEvent(): PausePartyBActions {
  let pausePartyBActionsEvent = changetype<PausePartyBActions>(newMockEvent())

  pausePartyBActionsEvent.parameters = new Array()

  return pausePartyBActionsEvent
}

export function createRegisterPartyBEvent(partyB: Address): RegisterPartyB {
  let registerPartyBEvent = changetype<RegisterPartyB>(newMockEvent())

  registerPartyBEvent.parameters = new Array()

  registerPartyBEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )

  return registerPartyBEvent
}

export function createRoleGrantedEvent(
  role: Bytes,
  user: Address
): RoleGranted {
  let roleGrantedEvent = changetype<RoleGranted>(newMockEvent())

  roleGrantedEvent.parameters = new Array()

  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )

  return roleGrantedEvent
}

export function createRoleRevokedEvent(
  role: Bytes,
  user: Address
): RoleRevoked {
  let roleRevokedEvent = changetype<RoleRevoked>(newMockEvent())

  roleRevokedEvent.parameters = new Array()

  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )

  return roleRevokedEvent
}

export function createSetBalanceLimitPerUserEvent(
  balanceLimitPerUser: BigInt
): SetBalanceLimitPerUser {
  let setBalanceLimitPerUserEvent = changetype<SetBalanceLimitPerUser>(
    newMockEvent()
  )

  setBalanceLimitPerUserEvent.parameters = new Array()

  setBalanceLimitPerUserEvent.parameters.push(
    new ethereum.EventParam(
      "balanceLimitPerUser",
      ethereum.Value.fromUnsignedBigInt(balanceLimitPerUser)
    )
  )

  return setBalanceLimitPerUserEvent
}

export function createSetCollateralEvent(collateral: Address): SetCollateral {
  let setCollateralEvent = changetype<SetCollateral>(newMockEvent())

  setCollateralEvent.parameters = new Array()

  setCollateralEvent.parameters.push(
    new ethereum.EventParam(
      "collateral",
      ethereum.Value.fromAddress(collateral)
    )
  )

  return setCollateralEvent
}

export function createSetDeallocateCooldownEvent(
  oldDeallocateCooldown: BigInt,
  newDeallocateCooldown: BigInt
): SetDeallocateCooldown {
  let setDeallocateCooldownEvent = changetype<SetDeallocateCooldown>(
    newMockEvent()
  )

  setDeallocateCooldownEvent.parameters = new Array()

  setDeallocateCooldownEvent.parameters.push(
    new ethereum.EventParam(
      "oldDeallocateCooldown",
      ethereum.Value.fromUnsignedBigInt(oldDeallocateCooldown)
    )
  )
  setDeallocateCooldownEvent.parameters.push(
    new ethereum.EventParam(
      "newDeallocateCooldown",
      ethereum.Value.fromUnsignedBigInt(newDeallocateCooldown)
    )
  )

  return setDeallocateCooldownEvent
}

export function createSetFeeCollectorEvent(
  oldFeeCollector: Address,
  newFeeCollector: Address
): SetFeeCollector {
  let setFeeCollectorEvent = changetype<SetFeeCollector>(newMockEvent())

  setFeeCollectorEvent.parameters = new Array()

  setFeeCollectorEvent.parameters.push(
    new ethereum.EventParam(
      "oldFeeCollector",
      ethereum.Value.fromAddress(oldFeeCollector)
    )
  )
  setFeeCollectorEvent.parameters.push(
    new ethereum.EventParam(
      "newFeeCollector",
      ethereum.Value.fromAddress(newFeeCollector)
    )
  )

  return setFeeCollectorEvent
}

export function createSetForceCancelCloseCooldownEvent(
  oldForceCancelCloseCooldown: BigInt,
  newForceCancelCloseCooldown: BigInt
): SetForceCancelCloseCooldown {
  let setForceCancelCloseCooldownEvent = changetype<
    SetForceCancelCloseCooldown
  >(newMockEvent())

  setForceCancelCloseCooldownEvent.parameters = new Array()

  setForceCancelCloseCooldownEvent.parameters.push(
    new ethereum.EventParam(
      "oldForceCancelCloseCooldown",
      ethereum.Value.fromUnsignedBigInt(oldForceCancelCloseCooldown)
    )
  )
  setForceCancelCloseCooldownEvent.parameters.push(
    new ethereum.EventParam(
      "newForceCancelCloseCooldown",
      ethereum.Value.fromUnsignedBigInt(newForceCancelCloseCooldown)
    )
  )

  return setForceCancelCloseCooldownEvent
}

export function createSetForceCancelCooldownEvent(
  oldForceCancelCooldown: BigInt,
  newForceCancelCooldown: BigInt
): SetForceCancelCooldown {
  let setForceCancelCooldownEvent = changetype<SetForceCancelCooldown>(
    newMockEvent()
  )

  setForceCancelCooldownEvent.parameters = new Array()

  setForceCancelCooldownEvent.parameters.push(
    new ethereum.EventParam(
      "oldForceCancelCooldown",
      ethereum.Value.fromUnsignedBigInt(oldForceCancelCooldown)
    )
  )
  setForceCancelCooldownEvent.parameters.push(
    new ethereum.EventParam(
      "newForceCancelCooldown",
      ethereum.Value.fromUnsignedBigInt(newForceCancelCooldown)
    )
  )

  return setForceCancelCooldownEvent
}

export function createSetForceCloseCooldownEvent(
  oldForceCloseCooldown: BigInt,
  newForceCloseCooldown: BigInt
): SetForceCloseCooldown {
  let setForceCloseCooldownEvent = changetype<SetForceCloseCooldown>(
    newMockEvent()
  )

  setForceCloseCooldownEvent.parameters = new Array()

  setForceCloseCooldownEvent.parameters.push(
    new ethereum.EventParam(
      "oldForceCloseCooldown",
      ethereum.Value.fromUnsignedBigInt(oldForceCloseCooldown)
    )
  )
  setForceCloseCooldownEvent.parameters.push(
    new ethereum.EventParam(
      "newForceCloseCooldown",
      ethereum.Value.fromUnsignedBigInt(newForceCloseCooldown)
    )
  )

  return setForceCloseCooldownEvent
}

export function createSetForceCloseGapRatioEvent(
  oldForceCloseGapRatio: BigInt,
  newForceCloseGapRatio: BigInt
): SetForceCloseGapRatio {
  let setForceCloseGapRatioEvent = changetype<SetForceCloseGapRatio>(
    newMockEvent()
  )

  setForceCloseGapRatioEvent.parameters = new Array()

  setForceCloseGapRatioEvent.parameters.push(
    new ethereum.EventParam(
      "oldForceCloseGapRatio",
      ethereum.Value.fromUnsignedBigInt(oldForceCloseGapRatio)
    )
  )
  setForceCloseGapRatioEvent.parameters.push(
    new ethereum.EventParam(
      "newForceCloseGapRatio",
      ethereum.Value.fromUnsignedBigInt(newForceCloseGapRatio)
    )
  )

  return setForceCloseGapRatioEvent
}

export function createSetLiquidationTimeoutEvent(
  oldLiquidationTimeout: BigInt,
  newLiquidationTimeout: BigInt
): SetLiquidationTimeout {
  let setLiquidationTimeoutEvent = changetype<SetLiquidationTimeout>(
    newMockEvent()
  )

  setLiquidationTimeoutEvent.parameters = new Array()

  setLiquidationTimeoutEvent.parameters.push(
    new ethereum.EventParam(
      "oldLiquidationTimeout",
      ethereum.Value.fromUnsignedBigInt(oldLiquidationTimeout)
    )
  )
  setLiquidationTimeoutEvent.parameters.push(
    new ethereum.EventParam(
      "newLiquidationTimeout",
      ethereum.Value.fromUnsignedBigInt(newLiquidationTimeout)
    )
  )

  return setLiquidationTimeoutEvent
}

export function createSetLiquidatorShareEvent(
  oldLiquidatorShare: BigInt,
  newLiquidatorShare: BigInt
): SetLiquidatorShare {
  let setLiquidatorShareEvent = changetype<SetLiquidatorShare>(newMockEvent())

  setLiquidatorShareEvent.parameters = new Array()

  setLiquidatorShareEvent.parameters.push(
    new ethereum.EventParam(
      "oldLiquidatorShare",
      ethereum.Value.fromUnsignedBigInt(oldLiquidatorShare)
    )
  )
  setLiquidatorShareEvent.parameters.push(
    new ethereum.EventParam(
      "newLiquidatorShare",
      ethereum.Value.fromUnsignedBigInt(newLiquidatorShare)
    )
  )

  return setLiquidatorShareEvent
}

export function createSetMuonConfigEvent(
  upnlValidTime: BigInt,
  priceValidTime: BigInt,
  priceQuantityValidTime: BigInt
): SetMuonConfig {
  let setMuonConfigEvent = changetype<SetMuonConfig>(newMockEvent())

  setMuonConfigEvent.parameters = new Array()

  setMuonConfigEvent.parameters.push(
    new ethereum.EventParam(
      "upnlValidTime",
      ethereum.Value.fromUnsignedBigInt(upnlValidTime)
    )
  )
  setMuonConfigEvent.parameters.push(
    new ethereum.EventParam(
      "priceValidTime",
      ethereum.Value.fromUnsignedBigInt(priceValidTime)
    )
  )
  setMuonConfigEvent.parameters.push(
    new ethereum.EventParam(
      "priceQuantityValidTime",
      ethereum.Value.fromUnsignedBigInt(priceQuantityValidTime)
    )
  )

  return setMuonConfigEvent
}

export function createSetMuonIdsEvent(
  muonAppId: BigInt,
  gateway: Address,
  x: BigInt,
  parity: i32
): SetMuonIds {
  let setMuonIdsEvent = changetype<SetMuonIds>(newMockEvent())

  setMuonIdsEvent.parameters = new Array()

  setMuonIdsEvent.parameters.push(
    new ethereum.EventParam(
      "muonAppId",
      ethereum.Value.fromUnsignedBigInt(muonAppId)
    )
  )
  setMuonIdsEvent.parameters.push(
    new ethereum.EventParam("gateway", ethereum.Value.fromAddress(gateway))
  )
  setMuonIdsEvent.parameters.push(
    new ethereum.EventParam("x", ethereum.Value.fromUnsignedBigInt(x))
  )
  setMuonIdsEvent.parameters.push(
    new ethereum.EventParam(
      "parity",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(parity))
    )
  )

  return setMuonIdsEvent
}

export function createSetPartyBEmergencyStatusEvent(
  partyB: Address,
  status: boolean
): SetPartyBEmergencyStatus {
  let setPartyBEmergencyStatusEvent = changetype<SetPartyBEmergencyStatus>(
    newMockEvent()
  )

  setPartyBEmergencyStatusEvent.parameters = new Array()

  setPartyBEmergencyStatusEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  setPartyBEmergencyStatusEvent.parameters.push(
    new ethereum.EventParam("status", ethereum.Value.fromBoolean(status))
  )

  return setPartyBEmergencyStatusEvent
}

export function createSetPendingQuotesValidLengthEvent(
  oldPendingQuotesValidLength: BigInt,
  newPendingQuotesValidLength: BigInt
): SetPendingQuotesValidLength {
  let setPendingQuotesValidLengthEvent = changetype<
    SetPendingQuotesValidLength
  >(newMockEvent())

  setPendingQuotesValidLengthEvent.parameters = new Array()

  setPendingQuotesValidLengthEvent.parameters.push(
    new ethereum.EventParam(
      "oldPendingQuotesValidLength",
      ethereum.Value.fromUnsignedBigInt(oldPendingQuotesValidLength)
    )
  )
  setPendingQuotesValidLengthEvent.parameters.push(
    new ethereum.EventParam(
      "newPendingQuotesValidLength",
      ethereum.Value.fromUnsignedBigInt(newPendingQuotesValidLength)
    )
  )

  return setPendingQuotesValidLengthEvent
}

export function createSetSuspendedAddressEvent(
  user: Address,
  isSuspended: boolean
): SetSuspendedAddress {
  let setSuspendedAddressEvent = changetype<SetSuspendedAddress>(newMockEvent())

  setSuspendedAddressEvent.parameters = new Array()

  setSuspendedAddressEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  setSuspendedAddressEvent.parameters.push(
    new ethereum.EventParam(
      "isSuspended",
      ethereum.Value.fromBoolean(isSuspended)
    )
  )

  return setSuspendedAddressEvent
}

export function createSetSymbolAcceptableValuesEvent(
  symbolId: BigInt,
  oldMinAcceptableQuoteValue: BigInt,
  oldMinAcceptablePortionLF: BigInt,
  minAcceptableQuoteValue: BigInt,
  minAcceptablePortionLF: BigInt
): SetSymbolAcceptableValues {
  let setSymbolAcceptableValuesEvent = changetype<SetSymbolAcceptableValues>(
    newMockEvent()
  )

  setSymbolAcceptableValuesEvent.parameters = new Array()

  setSymbolAcceptableValuesEvent.parameters.push(
    new ethereum.EventParam(
      "symbolId",
      ethereum.Value.fromUnsignedBigInt(symbolId)
    )
  )
  setSymbolAcceptableValuesEvent.parameters.push(
    new ethereum.EventParam(
      "oldMinAcceptableQuoteValue",
      ethereum.Value.fromUnsignedBigInt(oldMinAcceptableQuoteValue)
    )
  )
  setSymbolAcceptableValuesEvent.parameters.push(
    new ethereum.EventParam(
      "oldMinAcceptablePortionLF",
      ethereum.Value.fromUnsignedBigInt(oldMinAcceptablePortionLF)
    )
  )
  setSymbolAcceptableValuesEvent.parameters.push(
    new ethereum.EventParam(
      "minAcceptableQuoteValue",
      ethereum.Value.fromUnsignedBigInt(minAcceptableQuoteValue)
    )
  )
  setSymbolAcceptableValuesEvent.parameters.push(
    new ethereum.EventParam(
      "minAcceptablePortionLF",
      ethereum.Value.fromUnsignedBigInt(minAcceptablePortionLF)
    )
  )

  return setSymbolAcceptableValuesEvent
}

export function createSetSymbolFundingStateEvent(
  id: BigInt,
  fundingRateEpochDuration: BigInt,
  fundingRateWindowTime: BigInt
): SetSymbolFundingState {
  let setSymbolFundingStateEvent = changetype<SetSymbolFundingState>(
    newMockEvent()
  )

  setSymbolFundingStateEvent.parameters = new Array()

  setSymbolFundingStateEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  )
  setSymbolFundingStateEvent.parameters.push(
    new ethereum.EventParam(
      "fundingRateEpochDuration",
      ethereum.Value.fromUnsignedBigInt(fundingRateEpochDuration)
    )
  )
  setSymbolFundingStateEvent.parameters.push(
    new ethereum.EventParam(
      "fundingRateWindowTime",
      ethereum.Value.fromUnsignedBigInt(fundingRateWindowTime)
    )
  )

  return setSymbolFundingStateEvent
}

export function createSetSymbolMaxLeverageEvent(
  symbolId: BigInt,
  oldMaxLeverage: BigInt,
  maxLeverage: BigInt
): SetSymbolMaxLeverage {
  let setSymbolMaxLeverageEvent = changetype<SetSymbolMaxLeverage>(
    newMockEvent()
  )

  setSymbolMaxLeverageEvent.parameters = new Array()

  setSymbolMaxLeverageEvent.parameters.push(
    new ethereum.EventParam(
      "symbolId",
      ethereum.Value.fromUnsignedBigInt(symbolId)
    )
  )
  setSymbolMaxLeverageEvent.parameters.push(
    new ethereum.EventParam(
      "oldMaxLeverage",
      ethereum.Value.fromUnsignedBigInt(oldMaxLeverage)
    )
  )
  setSymbolMaxLeverageEvent.parameters.push(
    new ethereum.EventParam(
      "maxLeverage",
      ethereum.Value.fromUnsignedBigInt(maxLeverage)
    )
  )

  return setSymbolMaxLeverageEvent
}

export function createSetSymbolMaxSlippageEvent(
  symbolId: BigInt,
  oldMaxSlippage: BigInt,
  maxSlippage: BigInt
): SetSymbolMaxSlippage {
  let setSymbolMaxSlippageEvent = changetype<SetSymbolMaxSlippage>(
    newMockEvent()
  )

  setSymbolMaxSlippageEvent.parameters = new Array()

  setSymbolMaxSlippageEvent.parameters.push(
    new ethereum.EventParam(
      "symbolId",
      ethereum.Value.fromUnsignedBigInt(symbolId)
    )
  )
  setSymbolMaxSlippageEvent.parameters.push(
    new ethereum.EventParam(
      "oldMaxSlippage",
      ethereum.Value.fromUnsignedBigInt(oldMaxSlippage)
    )
  )
  setSymbolMaxSlippageEvent.parameters.push(
    new ethereum.EventParam(
      "maxSlippage",
      ethereum.Value.fromUnsignedBigInt(maxSlippage)
    )
  )

  return setSymbolMaxSlippageEvent
}

export function createSetSymbolTradingFeeEvent(
  symbolId: BigInt,
  oldTradingFee: BigInt,
  tradingFee: BigInt
): SetSymbolTradingFee {
  let setSymbolTradingFeeEvent = changetype<SetSymbolTradingFee>(newMockEvent())

  setSymbolTradingFeeEvent.parameters = new Array()

  setSymbolTradingFeeEvent.parameters.push(
    new ethereum.EventParam(
      "symbolId",
      ethereum.Value.fromUnsignedBigInt(symbolId)
    )
  )
  setSymbolTradingFeeEvent.parameters.push(
    new ethereum.EventParam(
      "oldTradingFee",
      ethereum.Value.fromUnsignedBigInt(oldTradingFee)
    )
  )
  setSymbolTradingFeeEvent.parameters.push(
    new ethereum.EventParam(
      "tradingFee",
      ethereum.Value.fromUnsignedBigInt(tradingFee)
    )
  )

  return setSymbolTradingFeeEvent
}

export function createSetSymbolValidationStateEvent(
  id: BigInt,
  oldState: boolean,
  isValid: boolean
): SetSymbolValidationState {
  let setSymbolValidationStateEvent = changetype<SetSymbolValidationState>(
    newMockEvent()
  )

  setSymbolValidationStateEvent.parameters = new Array()

  setSymbolValidationStateEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  )
  setSymbolValidationStateEvent.parameters.push(
    new ethereum.EventParam("oldState", ethereum.Value.fromBoolean(oldState))
  )
  setSymbolValidationStateEvent.parameters.push(
    new ethereum.EventParam("isValid", ethereum.Value.fromBoolean(isValid))
  )

  return setSymbolValidationStateEvent
}

export function createUnpauseAccountingEvent(): UnpauseAccounting {
  let unpauseAccountingEvent = changetype<UnpauseAccounting>(newMockEvent())

  unpauseAccountingEvent.parameters = new Array()

  return unpauseAccountingEvent
}

export function createUnpauseGlobalEvent(): UnpauseGlobal {
  let unpauseGlobalEvent = changetype<UnpauseGlobal>(newMockEvent())

  unpauseGlobalEvent.parameters = new Array()

  return unpauseGlobalEvent
}

export function createUnpauseLiquidationEvent(): UnpauseLiquidation {
  let unpauseLiquidationEvent = changetype<UnpauseLiquidation>(newMockEvent())

  unpauseLiquidationEvent.parameters = new Array()

  return unpauseLiquidationEvent
}

export function createUnpausePartyAActionsEvent(): UnpausePartyAActions {
  let unpausePartyAActionsEvent = changetype<UnpausePartyAActions>(
    newMockEvent()
  )

  unpausePartyAActionsEvent.parameters = new Array()

  return unpausePartyAActionsEvent
}

export function createUnpausePartyBActionsEvent(): UnpausePartyBActions {
  let unpausePartyBActionsEvent = changetype<UnpausePartyBActions>(
    newMockEvent()
  )

  unpausePartyBActionsEvent.parameters = new Array()

  return unpausePartyBActionsEvent
}

export function createDisputeForLiquidationEvent(
  liquidator: Address,
  partyA: Address
): DisputeForLiquidation {
  let disputeForLiquidationEvent = changetype<DisputeForLiquidation>(
    newMockEvent()
  )

  disputeForLiquidationEvent.parameters = new Array()

  disputeForLiquidationEvent.parameters.push(
    new ethereum.EventParam(
      "liquidator",
      ethereum.Value.fromAddress(liquidator)
    )
  )
  disputeForLiquidationEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )

  return disputeForLiquidationEvent
}

export function createFullyLiquidatedPartyBEvent(
  partyB: Address,
  partyA: Address
): FullyLiquidatedPartyB {
  let fullyLiquidatedPartyBEvent = changetype<FullyLiquidatedPartyB>(
    newMockEvent()
  )

  fullyLiquidatedPartyBEvent.parameters = new Array()

  fullyLiquidatedPartyBEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  fullyLiquidatedPartyBEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )

  return fullyLiquidatedPartyBEvent
}

export function createLiquidatePartyAEvent(
  liquidator: Address,
  partyA: Address,
  allocatedBalance: BigInt,
  upnl: BigInt,
  totalUnrealizedLoss: BigInt
): LiquidatePartyA {
  let liquidatePartyAEvent = changetype<LiquidatePartyA>(newMockEvent())

  liquidatePartyAEvent.parameters = new Array()

  liquidatePartyAEvent.parameters.push(
    new ethereum.EventParam(
      "liquidator",
      ethereum.Value.fromAddress(liquidator)
    )
  )
  liquidatePartyAEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  liquidatePartyAEvent.parameters.push(
    new ethereum.EventParam(
      "allocatedBalance",
      ethereum.Value.fromUnsignedBigInt(allocatedBalance)
    )
  )
  liquidatePartyAEvent.parameters.push(
    new ethereum.EventParam("upnl", ethereum.Value.fromSignedBigInt(upnl))
  )
  liquidatePartyAEvent.parameters.push(
    new ethereum.EventParam(
      "totalUnrealizedLoss",
      ethereum.Value.fromSignedBigInt(totalUnrealizedLoss)
    )
  )

  return liquidatePartyAEvent
}

export function createLiquidatePartyA1Event(
  liquidator: Address,
  partyA: Address
): LiquidatePartyA1 {
  let liquidatePartyA1Event = changetype<LiquidatePartyA1>(newMockEvent())

  liquidatePartyA1Event.parameters = new Array()

  liquidatePartyA1Event.parameters.push(
    new ethereum.EventParam(
      "liquidator",
      ethereum.Value.fromAddress(liquidator)
    )
  )
  liquidatePartyA1Event.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )

  return liquidatePartyA1Event
}

export function createLiquidatePartyBEvent(
  liquidator: Address,
  partyB: Address,
  partyA: Address,
  partyBAllocatedBalance: BigInt,
  upnl: BigInt
): LiquidatePartyB {
  let liquidatePartyBEvent = changetype<LiquidatePartyB>(newMockEvent())

  liquidatePartyBEvent.parameters = new Array()

  liquidatePartyBEvent.parameters.push(
    new ethereum.EventParam(
      "liquidator",
      ethereum.Value.fromAddress(liquidator)
    )
  )
  liquidatePartyBEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  liquidatePartyBEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  liquidatePartyBEvent.parameters.push(
    new ethereum.EventParam(
      "partyBAllocatedBalance",
      ethereum.Value.fromUnsignedBigInt(partyBAllocatedBalance)
    )
  )
  liquidatePartyBEvent.parameters.push(
    new ethereum.EventParam("upnl", ethereum.Value.fromSignedBigInt(upnl))
  )

  return liquidatePartyBEvent
}

export function createLiquidatePartyB1Event(
  liquidator: Address,
  partyB: Address,
  partyA: Address
): LiquidatePartyB1 {
  let liquidatePartyB1Event = changetype<LiquidatePartyB1>(newMockEvent())

  liquidatePartyB1Event.parameters = new Array()

  liquidatePartyB1Event.parameters.push(
    new ethereum.EventParam(
      "liquidator",
      ethereum.Value.fromAddress(liquidator)
    )
  )
  liquidatePartyB1Event.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  liquidatePartyB1Event.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )

  return liquidatePartyB1Event
}

export function createLiquidatePendingPositionsPartyAEvent(
  liquidator: Address,
  partyA: Address
): LiquidatePendingPositionsPartyA {
  let liquidatePendingPositionsPartyAEvent = changetype<
    LiquidatePendingPositionsPartyA
  >(newMockEvent())

  liquidatePendingPositionsPartyAEvent.parameters = new Array()

  liquidatePendingPositionsPartyAEvent.parameters.push(
    new ethereum.EventParam(
      "liquidator",
      ethereum.Value.fromAddress(liquidator)
    )
  )
  liquidatePendingPositionsPartyAEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )

  return liquidatePendingPositionsPartyAEvent
}

export function createLiquidatePositionsPartyAEvent(
  liquidator: Address,
  partyA: Address,
  quoteIds: Array<BigInt>
): LiquidatePositionsPartyA {
  let liquidatePositionsPartyAEvent = changetype<LiquidatePositionsPartyA>(
    newMockEvent()
  )

  liquidatePositionsPartyAEvent.parameters = new Array()

  liquidatePositionsPartyAEvent.parameters.push(
    new ethereum.EventParam(
      "liquidator",
      ethereum.Value.fromAddress(liquidator)
    )
  )
  liquidatePositionsPartyAEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  liquidatePositionsPartyAEvent.parameters.push(
    new ethereum.EventParam(
      "quoteIds",
      ethereum.Value.fromUnsignedBigIntArray(quoteIds)
    )
  )

  return liquidatePositionsPartyAEvent
}

export function createLiquidatePositionsPartyBEvent(
  liquidator: Address,
  partyB: Address,
  partyA: Address,
  quoteIds: Array<BigInt>
): LiquidatePositionsPartyB {
  let liquidatePositionsPartyBEvent = changetype<LiquidatePositionsPartyB>(
    newMockEvent()
  )

  liquidatePositionsPartyBEvent.parameters = new Array()

  liquidatePositionsPartyBEvent.parameters.push(
    new ethereum.EventParam(
      "liquidator",
      ethereum.Value.fromAddress(liquidator)
    )
  )
  liquidatePositionsPartyBEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  liquidatePositionsPartyBEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  liquidatePositionsPartyBEvent.parameters.push(
    new ethereum.EventParam(
      "quoteIds",
      ethereum.Value.fromUnsignedBigIntArray(quoteIds)
    )
  )

  return liquidatePositionsPartyBEvent
}

export function createLiquidationDisputedEvent(
  partyA: Address
): LiquidationDisputed {
  let liquidationDisputedEvent = changetype<LiquidationDisputed>(newMockEvent())

  liquidationDisputedEvent.parameters = new Array()

  liquidationDisputedEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )

  return liquidationDisputedEvent
}

export function createSetSymbolsPricesEvent(
  liquidator: Address,
  partyA: Address,
  symbolIds: Array<BigInt>,
  prices: Array<BigInt>
): SetSymbolsPrices {
  let setSymbolsPricesEvent = changetype<SetSymbolsPrices>(newMockEvent())

  setSymbolsPricesEvent.parameters = new Array()

  setSymbolsPricesEvent.parameters.push(
    new ethereum.EventParam(
      "liquidator",
      ethereum.Value.fromAddress(liquidator)
    )
  )
  setSymbolsPricesEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  setSymbolsPricesEvent.parameters.push(
    new ethereum.EventParam(
      "symbolIds",
      ethereum.Value.fromUnsignedBigIntArray(symbolIds)
    )
  )
  setSymbolsPricesEvent.parameters.push(
    new ethereum.EventParam(
      "prices",
      ethereum.Value.fromUnsignedBigIntArray(prices)
    )
  )

  return setSymbolsPricesEvent
}

export function createSettlePartyALiquidationEvent(
  partyA: Address,
  partyBs: Array<Address>
): SettlePartyALiquidation {
  let settlePartyALiquidationEvent = changetype<SettlePartyALiquidation>(
    newMockEvent()
  )

  settlePartyALiquidationEvent.parameters = new Array()

  settlePartyALiquidationEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  settlePartyALiquidationEvent.parameters.push(
    new ethereum.EventParam("partyBs", ethereum.Value.fromAddressArray(partyBs))
  )

  return settlePartyALiquidationEvent
}

export function createExpireQuoteEvent(
  quoteStatus: i32,
  quoteId: BigInt
): ExpireQuote {
  let expireQuoteEvent = changetype<ExpireQuote>(newMockEvent())

  expireQuoteEvent.parameters = new Array()

  expireQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "quoteStatus",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(quoteStatus))
    )
  )
  expireQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "quoteId",
      ethereum.Value.fromUnsignedBigInt(quoteId)
    )
  )

  return expireQuoteEvent
}

export function createForceCancelCloseRequestEvent(
  quoteId: BigInt,
  quoteStatus: i32
): ForceCancelCloseRequest {
  let forceCancelCloseRequestEvent = changetype<ForceCancelCloseRequest>(
    newMockEvent()
  )

  forceCancelCloseRequestEvent.parameters = new Array()

  forceCancelCloseRequestEvent.parameters.push(
    new ethereum.EventParam(
      "quoteId",
      ethereum.Value.fromUnsignedBigInt(quoteId)
    )
  )
  forceCancelCloseRequestEvent.parameters.push(
    new ethereum.EventParam(
      "quoteStatus",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(quoteStatus))
    )
  )

  return forceCancelCloseRequestEvent
}

export function createForceCancelQuoteEvent(
  quoteId: BigInt,
  quoteStatus: i32
): ForceCancelQuote {
  let forceCancelQuoteEvent = changetype<ForceCancelQuote>(newMockEvent())

  forceCancelQuoteEvent.parameters = new Array()

  forceCancelQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "quoteId",
      ethereum.Value.fromUnsignedBigInt(quoteId)
    )
  )
  forceCancelQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "quoteStatus",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(quoteStatus))
    )
  )

  return forceCancelQuoteEvent
}

export function createForceClosePositionEvent(
  quoteId: BigInt,
  partyA: Address,
  partyB: Address,
  filledAmount: BigInt,
  closedPrice: BigInt,
  quoteStatus: i32
): ForceClosePosition {
  let forceClosePositionEvent = changetype<ForceClosePosition>(newMockEvent())

  forceClosePositionEvent.parameters = new Array()

  forceClosePositionEvent.parameters.push(
    new ethereum.EventParam(
      "quoteId",
      ethereum.Value.fromUnsignedBigInt(quoteId)
    )
  )
  forceClosePositionEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  forceClosePositionEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  forceClosePositionEvent.parameters.push(
    new ethereum.EventParam(
      "filledAmount",
      ethereum.Value.fromUnsignedBigInt(filledAmount)
    )
  )
  forceClosePositionEvent.parameters.push(
    new ethereum.EventParam(
      "closedPrice",
      ethereum.Value.fromUnsignedBigInt(closedPrice)
    )
  )
  forceClosePositionEvent.parameters.push(
    new ethereum.EventParam(
      "quoteStatus",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(quoteStatus))
    )
  )

  return forceClosePositionEvent
}

export function createRequestToCancelCloseRequestEvent(
  partyA: Address,
  partyB: Address,
  quoteId: BigInt,
  quoteStatus: i32
): RequestToCancelCloseRequest {
  let requestToCancelCloseRequestEvent = changetype<
    RequestToCancelCloseRequest
  >(newMockEvent())

  requestToCancelCloseRequestEvent.parameters = new Array()

  requestToCancelCloseRequestEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  requestToCancelCloseRequestEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  requestToCancelCloseRequestEvent.parameters.push(
    new ethereum.EventParam(
      "quoteId",
      ethereum.Value.fromUnsignedBigInt(quoteId)
    )
  )
  requestToCancelCloseRequestEvent.parameters.push(
    new ethereum.EventParam(
      "quoteStatus",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(quoteStatus))
    )
  )

  return requestToCancelCloseRequestEvent
}

export function createRequestToCancelQuoteEvent(
  partyA: Address,
  partyB: Address,
  quoteStatus: i32,
  quoteId: BigInt
): RequestToCancelQuote {
  let requestToCancelQuoteEvent = changetype<RequestToCancelQuote>(
    newMockEvent()
  )

  requestToCancelQuoteEvent.parameters = new Array()

  requestToCancelQuoteEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  requestToCancelQuoteEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  requestToCancelQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "quoteStatus",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(quoteStatus))
    )
  )
  requestToCancelQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "quoteId",
      ethereum.Value.fromUnsignedBigInt(quoteId)
    )
  )

  return requestToCancelQuoteEvent
}

export function createRequestToClosePositionEvent(
  partyA: Address,
  partyB: Address,
  quoteId: BigInt,
  closePrice: BigInt,
  quantityToClose: BigInt,
  orderType: i32,
  deadline: BigInt,
  quoteStatus: i32
): RequestToClosePosition {
  let requestToClosePositionEvent = changetype<RequestToClosePosition>(
    newMockEvent()
  )

  requestToClosePositionEvent.parameters = new Array()

  requestToClosePositionEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  requestToClosePositionEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  requestToClosePositionEvent.parameters.push(
    new ethereum.EventParam(
      "quoteId",
      ethereum.Value.fromUnsignedBigInt(quoteId)
    )
  )
  requestToClosePositionEvent.parameters.push(
    new ethereum.EventParam(
      "closePrice",
      ethereum.Value.fromUnsignedBigInt(closePrice)
    )
  )
  requestToClosePositionEvent.parameters.push(
    new ethereum.EventParam(
      "quantityToClose",
      ethereum.Value.fromUnsignedBigInt(quantityToClose)
    )
  )
  requestToClosePositionEvent.parameters.push(
    new ethereum.EventParam(
      "orderType",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(orderType))
    )
  )
  requestToClosePositionEvent.parameters.push(
    new ethereum.EventParam(
      "deadline",
      ethereum.Value.fromUnsignedBigInt(deadline)
    )
  )
  requestToClosePositionEvent.parameters.push(
    new ethereum.EventParam(
      "quoteStatus",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(quoteStatus))
    )
  )

  return requestToClosePositionEvent
}

export function createSendQuoteEvent(
  partyA: Address,
  quoteId: BigInt,
  partyBsWhiteList: Array<Address>,
  symbolId: BigInt,
  positionType: i32,
  orderType: i32,
  price: BigInt,
  marketPrice: BigInt,
  quantity: BigInt,
  cva: BigInt,
  lf: BigInt,
  partyAmm: BigInt,
  partyBmm: BigInt,
  tradingFee: BigInt,
  deadline: BigInt
): SendQuote {
  let sendQuoteEvent = changetype<SendQuote>(newMockEvent())

  sendQuoteEvent.parameters = new Array()

  sendQuoteEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  sendQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "quoteId",
      ethereum.Value.fromUnsignedBigInt(quoteId)
    )
  )
  sendQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "partyBsWhiteList",
      ethereum.Value.fromAddressArray(partyBsWhiteList)
    )
  )
  sendQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "symbolId",
      ethereum.Value.fromUnsignedBigInt(symbolId)
    )
  )
  sendQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "positionType",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(positionType))
    )
  )
  sendQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "orderType",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(orderType))
    )
  )
  sendQuoteEvent.parameters.push(
    new ethereum.EventParam("price", ethereum.Value.fromUnsignedBigInt(price))
  )
  sendQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "marketPrice",
      ethereum.Value.fromUnsignedBigInt(marketPrice)
    )
  )
  sendQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "quantity",
      ethereum.Value.fromUnsignedBigInt(quantity)
    )
  )
  sendQuoteEvent.parameters.push(
    new ethereum.EventParam("cva", ethereum.Value.fromUnsignedBigInt(cva))
  )
  sendQuoteEvent.parameters.push(
    new ethereum.EventParam("lf", ethereum.Value.fromUnsignedBigInt(lf))
  )
  sendQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "partyAmm",
      ethereum.Value.fromUnsignedBigInt(partyAmm)
    )
  )
  sendQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "partyBmm",
      ethereum.Value.fromUnsignedBigInt(partyBmm)
    )
  )
  sendQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "tradingFee",
      ethereum.Value.fromUnsignedBigInt(tradingFee)
    )
  )
  sendQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "deadline",
      ethereum.Value.fromUnsignedBigInt(deadline)
    )
  )

  return sendQuoteEvent
}

export function createDiamondCutEvent(
  _diamondCut: Array<ethereum.Tuple>,
  _init: Address,
  _calldata: Bytes
): DiamondCut {
  let diamondCutEvent = changetype<DiamondCut>(newMockEvent())

  diamondCutEvent.parameters = new Array()

  diamondCutEvent.parameters.push(
    new ethereum.EventParam(
      "_diamondCut",
      ethereum.Value.fromTupleArray(_diamondCut)
    )
  )
  diamondCutEvent.parameters.push(
    new ethereum.EventParam("_init", ethereum.Value.fromAddress(_init))
  )
  diamondCutEvent.parameters.push(
    new ethereum.EventParam("_calldata", ethereum.Value.fromBytes(_calldata))
  )

  return diamondCutEvent
}

export function createAllocateForPartyBEvent(
  partyB: Address,
  partyA: Address,
  amount: BigInt
): AllocateForPartyB {
  let allocateForPartyBEvent = changetype<AllocateForPartyB>(newMockEvent())

  allocateForPartyBEvent.parameters = new Array()

  allocateForPartyBEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  allocateForPartyBEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  allocateForPartyBEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return allocateForPartyBEvent
}

export function createAllocatePartyAEvent(
  user: Address,
  amount: BigInt
): AllocatePartyA {
  let allocatePartyAEvent = changetype<AllocatePartyA>(newMockEvent())

  allocatePartyAEvent.parameters = new Array()

  allocatePartyAEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  allocatePartyAEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return allocatePartyAEvent
}

export function createDeallocateForPartyBEvent(
  partyB: Address,
  partyA: Address,
  amount: BigInt
): DeallocateForPartyB {
  let deallocateForPartyBEvent = changetype<DeallocateForPartyB>(newMockEvent())

  deallocateForPartyBEvent.parameters = new Array()

  deallocateForPartyBEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  deallocateForPartyBEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  deallocateForPartyBEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return deallocateForPartyBEvent
}

export function createDeallocatePartyAEvent(
  user: Address,
  amount: BigInt
): DeallocatePartyA {
  let deallocatePartyAEvent = changetype<DeallocatePartyA>(newMockEvent())

  deallocatePartyAEvent.parameters = new Array()

  deallocatePartyAEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  deallocatePartyAEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return deallocatePartyAEvent
}

export function createDepositEvent(
  sender: Address,
  user: Address,
  amount: BigInt
): Deposit {
  let depositEvent = changetype<Deposit>(newMockEvent())

  depositEvent.parameters = new Array()

  depositEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )
  depositEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  depositEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return depositEvent
}

export function createTransferAllocationEvent(
  amount: BigInt,
  origin: Address,
  recipient: Address
): TransferAllocation {
  let transferAllocationEvent = changetype<TransferAllocation>(newMockEvent())

  transferAllocationEvent.parameters = new Array()

  transferAllocationEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  transferAllocationEvent.parameters.push(
    new ethereum.EventParam("origin", ethereum.Value.fromAddress(origin))
  )
  transferAllocationEvent.parameters.push(
    new ethereum.EventParam("recipient", ethereum.Value.fromAddress(recipient))
  )

  return transferAllocationEvent
}

export function createWithdrawEvent(
  sender: Address,
  user: Address,
  amount: BigInt
): Withdraw {
  let withdrawEvent = changetype<Withdraw>(newMockEvent())

  withdrawEvent.parameters = new Array()

  withdrawEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )
  withdrawEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  withdrawEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return withdrawEvent
}

export function createAcceptCancelCloseRequestEvent(
  quoteId: BigInt,
  quoteStatus: i32
): AcceptCancelCloseRequest {
  let acceptCancelCloseRequestEvent = changetype<AcceptCancelCloseRequest>(
    newMockEvent()
  )

  acceptCancelCloseRequestEvent.parameters = new Array()

  acceptCancelCloseRequestEvent.parameters.push(
    new ethereum.EventParam(
      "quoteId",
      ethereum.Value.fromUnsignedBigInt(quoteId)
    )
  )
  acceptCancelCloseRequestEvent.parameters.push(
    new ethereum.EventParam(
      "quoteStatus",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(quoteStatus))
    )
  )

  return acceptCancelCloseRequestEvent
}

export function createAcceptCancelRequestEvent(
  quoteId: BigInt,
  quoteStatus: i32
): AcceptCancelRequest {
  let acceptCancelRequestEvent = changetype<AcceptCancelRequest>(newMockEvent())

  acceptCancelRequestEvent.parameters = new Array()

  acceptCancelRequestEvent.parameters.push(
    new ethereum.EventParam(
      "quoteId",
      ethereum.Value.fromUnsignedBigInt(quoteId)
    )
  )
  acceptCancelRequestEvent.parameters.push(
    new ethereum.EventParam(
      "quoteStatus",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(quoteStatus))
    )
  )

  return acceptCancelRequestEvent
}

export function createAllocatePartyBEvent(
  partyB: Address,
  partyA: Address,
  amount: BigInt
): AllocatePartyB {
  let allocatePartyBEvent = changetype<AllocatePartyB>(newMockEvent())

  allocatePartyBEvent.parameters = new Array()

  allocatePartyBEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  allocatePartyBEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  allocatePartyBEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return allocatePartyBEvent
}

export function createChargeFundingRateEvent(
  partyB: Address,
  partyA: Address,
  quoteIds: Array<BigInt>,
  rates: Array<BigInt>
): ChargeFundingRate {
  let chargeFundingRateEvent = changetype<ChargeFundingRate>(newMockEvent())

  chargeFundingRateEvent.parameters = new Array()

  chargeFundingRateEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  chargeFundingRateEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  chargeFundingRateEvent.parameters.push(
    new ethereum.EventParam(
      "quoteIds",
      ethereum.Value.fromUnsignedBigIntArray(quoteIds)
    )
  )
  chargeFundingRateEvent.parameters.push(
    new ethereum.EventParam(
      "rates",
      ethereum.Value.fromSignedBigIntArray(rates)
    )
  )

  return chargeFundingRateEvent
}

export function createEmergencyClosePositionEvent(
  quoteId: BigInt,
  partyA: Address,
  partyB: Address,
  filledAmount: BigInt,
  closedPrice: BigInt,
  quoteStatus: i32
): EmergencyClosePosition {
  let emergencyClosePositionEvent = changetype<EmergencyClosePosition>(
    newMockEvent()
  )

  emergencyClosePositionEvent.parameters = new Array()

  emergencyClosePositionEvent.parameters.push(
    new ethereum.EventParam(
      "quoteId",
      ethereum.Value.fromUnsignedBigInt(quoteId)
    )
  )
  emergencyClosePositionEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  emergencyClosePositionEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  emergencyClosePositionEvent.parameters.push(
    new ethereum.EventParam(
      "filledAmount",
      ethereum.Value.fromUnsignedBigInt(filledAmount)
    )
  )
  emergencyClosePositionEvent.parameters.push(
    new ethereum.EventParam(
      "closedPrice",
      ethereum.Value.fromUnsignedBigInt(closedPrice)
    )
  )
  emergencyClosePositionEvent.parameters.push(
    new ethereum.EventParam(
      "quoteStatus",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(quoteStatus))
    )
  )

  return emergencyClosePositionEvent
}

export function createFillCloseRequestEvent(
  quoteId: BigInt,
  partyA: Address,
  partyB: Address,
  filledAmount: BigInt,
  closedPrice: BigInt,
  quoteStatus: i32
): FillCloseRequest {
  let fillCloseRequestEvent = changetype<FillCloseRequest>(newMockEvent())

  fillCloseRequestEvent.parameters = new Array()

  fillCloseRequestEvent.parameters.push(
    new ethereum.EventParam(
      "quoteId",
      ethereum.Value.fromUnsignedBigInt(quoteId)
    )
  )
  fillCloseRequestEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  fillCloseRequestEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  fillCloseRequestEvent.parameters.push(
    new ethereum.EventParam(
      "filledAmount",
      ethereum.Value.fromUnsignedBigInt(filledAmount)
    )
  )
  fillCloseRequestEvent.parameters.push(
    new ethereum.EventParam(
      "closedPrice",
      ethereum.Value.fromUnsignedBigInt(closedPrice)
    )
  )
  fillCloseRequestEvent.parameters.push(
    new ethereum.EventParam(
      "quoteStatus",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(quoteStatus))
    )
  )

  return fillCloseRequestEvent
}

export function createLockQuoteEvent(
  partyB: Address,
  quoteId: BigInt
): LockQuote {
  let lockQuoteEvent = changetype<LockQuote>(newMockEvent())

  lockQuoteEvent.parameters = new Array()

  lockQuoteEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  lockQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "quoteId",
      ethereum.Value.fromUnsignedBigInt(quoteId)
    )
  )

  return lockQuoteEvent
}

export function createOpenPositionEvent(
  quoteId: BigInt,
  partyA: Address,
  partyB: Address,
  filledAmount: BigInt,
  openedPrice: BigInt
): OpenPosition {
  let openPositionEvent = changetype<OpenPosition>(newMockEvent())

  openPositionEvent.parameters = new Array()

  openPositionEvent.parameters.push(
    new ethereum.EventParam(
      "quoteId",
      ethereum.Value.fromUnsignedBigInt(quoteId)
    )
  )
  openPositionEvent.parameters.push(
    new ethereum.EventParam("partyA", ethereum.Value.fromAddress(partyA))
  )
  openPositionEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  openPositionEvent.parameters.push(
    new ethereum.EventParam(
      "filledAmount",
      ethereum.Value.fromUnsignedBigInt(filledAmount)
    )
  )
  openPositionEvent.parameters.push(
    new ethereum.EventParam(
      "openedPrice",
      ethereum.Value.fromUnsignedBigInt(openedPrice)
    )
  )

  return openPositionEvent
}

export function createUnlockQuoteEvent(
  partyB: Address,
  quoteId: BigInt,
  quoteStatus: i32
): UnlockQuote {
  let unlockQuoteEvent = changetype<UnlockQuote>(newMockEvent())

  unlockQuoteEvent.parameters = new Array()

  unlockQuoteEvent.parameters.push(
    new ethereum.EventParam("partyB", ethereum.Value.fromAddress(partyB))
  )
  unlockQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "quoteId",
      ethereum.Value.fromUnsignedBigInt(quoteId)
    )
  )
  unlockQuoteEvent.parameters.push(
    new ethereum.EventParam(
      "quoteStatus",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(quoteStatus))
    )
  )

  return unlockQuoteEvent
}
