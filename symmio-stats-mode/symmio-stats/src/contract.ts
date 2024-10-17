import { BigInt } from "@graphprotocol/graph-ts"
import {
  Contract,
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
import { ExampleEntity } from "../generated/schema"

export function handleActiveEmergencyMode(event: ActiveEmergencyMode): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from)

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (!entity) {
    entity = new ExampleEntity(event.transaction.from)

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.facetAddress(...)
  // - contract.facetAddresses(...)
  // - contract.facetFunctionSelectors(...)
  // - contract.facets(...)
  // - contract.supportsInterface(...)
  // - contract.allocatedBalanceOfPartyA(...)
  // - contract.allocatedBalanceOfPartyB(...)
  // - contract.allocatedBalanceOfPartyBs(...)
  // - contract.balanceInfoOfPartyA(...)
  // - contract.balanceInfoOfPartyB(...)
  // - contract.balanceOf(...)
  // - contract.coolDownsOfMA(...)
  // - contract.forceCloseGapRatio(...)
  // - contract.getBalanceLimitPerUser(...)
  // - contract.getCollateral(...)
  // - contract.getFeeCollector(...)
  // - contract.getLiquidatedStateOfPartyA(...)
  // - contract.getMuonConfig(...)
  // - contract.getMuonIds(...)
  // - contract.getPartyAOpenPositions(...)
  // - contract.getPartyAPendingQuotes(...)
  // - contract.getPartyBEmergencyStatus(...)
  // - contract.getPartyBOpenPositions(...)
  // - contract.getPartyBPendingQuotes(...)
  // - contract.getQuote(...)
  // - contract.getQuotes(...)
  // - contract.getQuotesByParent(...)
  // - contract.getRoleHash(...)
  // - contract.getSettlementStates(...)
  // - contract.getSymbol(...)
  // - contract.getSymbols(...)
  // - contract.hasRole(...)
  // - contract.isPartyALiquidated(...)
  // - contract.isPartyB(...)
  // - contract.isPartyBLiquidated(...)
  // - contract.isSuspended(...)
  // - contract.liquidationTimeout(...)
  // - contract.liquidatorShare(...)
  // - contract.nonceOfPartyA(...)
  // - contract.nonceOfPartyB(...)
  // - contract.partyAPositionsCount(...)
  // - contract.partyAStats(...)
  // - contract.partyBLiquidationTimestamp(...)
  // - contract.partyBPositionsCount(...)
  // - contract.pauseState(...)
  // - contract.pendingQuotesValidLength(...)
  // - contract.quoteIdsOf(...)
  // - contract.quotesLength(...)
  // - contract.symbolNameById(...)
  // - contract.symbolNameByQuoteId(...)
  // - contract.symbolsByQuoteId(...)
  // - contract.withdrawCooldownOf(...)
  // - contract.getBasefee(...)
  // - contract.getBlockHash(...)
  // - contract.getBlockNumber(...)
  // - contract.getChainId(...)
  // - contract.getCurrentBlockCoinbase(...)
  // - contract.getCurrentBlockDifficulty(...)
  // - contract.getCurrentBlockGasLimit(...)
  // - contract.getCurrentBlockTimestamp(...)
  // - contract.getEthBalance(...)
  // - contract.getLastBlockHash(...)
}

export function handleAddSymbol(event: AddSymbol): void {}

export function handleDeactiveEmergencyMode(
  event: DeactiveEmergencyMode
): void {}

export function handleDeregisterPartyB(event: DeregisterPartyB): void {}

export function handlePauseAccounting(event: PauseAccounting): void {}

export function handlePauseGlobal(event: PauseGlobal): void {}

export function handlePauseLiquidation(event: PauseLiquidation): void {}

export function handlePausePartyAActions(event: PausePartyAActions): void {}

export function handlePausePartyBActions(event: PausePartyBActions): void {}

export function handleRegisterPartyB(event: RegisterPartyB): void {}

export function handleRoleGranted(event: RoleGranted): void {}

export function handleRoleRevoked(event: RoleRevoked): void {}

export function handleSetBalanceLimitPerUser(
  event: SetBalanceLimitPerUser
): void {}

export function handleSetCollateral(event: SetCollateral): void {}

export function handleSetDeallocateCooldown(
  event: SetDeallocateCooldown
): void {}

export function handleSetFeeCollector(event: SetFeeCollector): void {}

export function handleSetForceCancelCloseCooldown(
  event: SetForceCancelCloseCooldown
): void {}

export function handleSetForceCancelCooldown(
  event: SetForceCancelCooldown
): void {}

export function handleSetForceCloseCooldown(
  event: SetForceCloseCooldown
): void {}

export function handleSetForceCloseGapRatio(
  event: SetForceCloseGapRatio
): void {}

export function handleSetLiquidationTimeout(
  event: SetLiquidationTimeout
): void {}

export function handleSetLiquidatorShare(event: SetLiquidatorShare): void {}

export function handleSetMuonConfig(event: SetMuonConfig): void {}

export function handleSetMuonIds(event: SetMuonIds): void {}

export function handleSetPartyBEmergencyStatus(
  event: SetPartyBEmergencyStatus
): void {}

export function handleSetPendingQuotesValidLength(
  event: SetPendingQuotesValidLength
): void {}

export function handleSetSuspendedAddress(event: SetSuspendedAddress): void {}

export function handleSetSymbolAcceptableValues(
  event: SetSymbolAcceptableValues
): void {}

export function handleSetSymbolFundingState(
  event: SetSymbolFundingState
): void {}

export function handleSetSymbolMaxLeverage(event: SetSymbolMaxLeverage): void {}

export function handleSetSymbolMaxSlippage(event: SetSymbolMaxSlippage): void {}

export function handleSetSymbolTradingFee(event: SetSymbolTradingFee): void {}

export function handleSetSymbolValidationState(
  event: SetSymbolValidationState
): void {}

export function handleUnpauseAccounting(event: UnpauseAccounting): void {}

export function handleUnpauseGlobal(event: UnpauseGlobal): void {}

export function handleUnpauseLiquidation(event: UnpauseLiquidation): void {}

export function handleUnpausePartyAActions(event: UnpausePartyAActions): void {}

export function handleUnpausePartyBActions(event: UnpausePartyBActions): void {}

export function handleDisputeForLiquidation(
  event: DisputeForLiquidation
): void {}

export function handleFullyLiquidatedPartyB(
  event: FullyLiquidatedPartyB
): void {}

export function handleLiquidatePartyA(event: LiquidatePartyA): void {}

export function handleLiquidatePartyA1(event: LiquidatePartyA1): void {}

export function handleLiquidatePartyB(event: LiquidatePartyB): void {}

export function handleLiquidatePartyB1(event: LiquidatePartyB1): void {}

export function handleLiquidatePendingPositionsPartyA(
  event: LiquidatePendingPositionsPartyA
): void {}

export function handleLiquidatePositionsPartyA(
  event: LiquidatePositionsPartyA
): void {}

export function handleLiquidatePositionsPartyB(
  event: LiquidatePositionsPartyB
): void {}

export function handleLiquidationDisputed(event: LiquidationDisputed): void {}

export function handleSetSymbolsPrices(event: SetSymbolsPrices): void {}

export function handleSettlePartyALiquidation(
  event: SettlePartyALiquidation
): void {}

export function handleExpireQuote(event: ExpireQuote): void {}

export function handleForceCancelCloseRequest(
  event: ForceCancelCloseRequest
): void {}

export function handleForceCancelQuote(event: ForceCancelQuote): void {}

export function handleForceClosePosition(event: ForceClosePosition): void {}

export function handleRequestToCancelCloseRequest(
  event: RequestToCancelCloseRequest
): void {}

export function handleRequestToCancelQuote(event: RequestToCancelQuote): void {}

export function handleRequestToClosePosition(
  event: RequestToClosePosition
): void {}

export function handleSendQuote(event: SendQuote): void {}

export function handleDiamondCut(event: DiamondCut): void {}

export function handleAllocateForPartyB(event: AllocateForPartyB): void {}

export function handleAllocatePartyA(event: AllocatePartyA): void {}

export function handleDeallocateForPartyB(event: DeallocateForPartyB): void {}

export function handleDeallocatePartyA(event: DeallocatePartyA): void {}

export function handleDeposit(event: Deposit): void {}

export function handleTransferAllocation(event: TransferAllocation): void {}

export function handleWithdraw(event: Withdraw): void {}

export function handleAcceptCancelCloseRequest(
  event: AcceptCancelCloseRequest
): void {}

export function handleAcceptCancelRequest(event: AcceptCancelRequest): void {}

export function handleAllocatePartyB(event: AllocatePartyB): void {}

export function handleChargeFundingRate(event: ChargeFundingRate): void {}

export function handleEmergencyClosePosition(
  event: EmergencyClosePosition
): void {}

export function handleFillCloseRequest(event: FillCloseRequest): void {}

export function handleLockQuote(event: LockQuote): void {}

export function handleOpenPosition(event: OpenPosition): void {}

export function handleUnlockQuote(event: UnlockQuote): void {}
