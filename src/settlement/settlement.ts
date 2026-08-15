export type SettlementRail =
  | 'cash'
  | 'bank_transfer'
  | 'payment_link'
  | 'polkadot_native'
  | 'polkadot_usdc';

export type SettlementEvidenceKind =
  | 'payer_attestation'
  | 'external_reference'
  | 'chain_transaction';

export interface SettlementEvidenceBase {
  kind: SettlementEvidenceKind;
  observedAt: string;
}

export interface PayerAttestationEvidence extends SettlementEvidenceBase {
  kind: 'payer_attestation';
}

export interface ExternalReferenceEvidence extends SettlementEvidenceBase {
  kind: 'external_reference';
  reference: string;
}

export interface ChainTransactionEvidence extends SettlementEvidenceBase {
  kind: 'chain_transaction';
  txHash: string;
  chainId: string;
  from: string;
  to: string;
  amountBaseUnits: string;
  blockNumber: string;
}

export type SettlementEvidence =
  | PayerAttestationEvidence
  | ExternalReferenceEvidence
  | ChainTransactionEvidence;

export interface SettlementCapability {
  rail: SettlementRail;
  available: boolean;
  reason?: string;
}

export type SettlementOutcome =
  | { status: 'awaiting_payer'; rail: SettlementRail }
  | { status: 'awaiting_receiver_confirmation'; rail: SettlementRail; evidence: SettlementEvidence }
  | { status: 'failed'; rail: SettlementRail; reason: string };

export function settlementOutcomeFromEvidence(
  rail: SettlementRail,
  evidence: SettlementEvidence,
): SettlementOutcome {
  return {
    status: 'awaiting_receiver_confirmation',
    rail,
    evidence,
  };
}

export function unavailableSettlementCapability(
  rail: SettlementRail,
  reason: string,
): SettlementCapability {
  return {rail, available: false, reason};
}

export function availableSettlementCapability(rail: SettlementRail): SettlementCapability {
  return {rail, available: true};
}

export function isChainSettlementRail(rail: SettlementRail): boolean {
  return rail === 'polkadot_native' || rail === 'polkadot_usdc';
}
