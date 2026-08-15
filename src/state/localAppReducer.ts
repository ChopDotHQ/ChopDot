import type {AppState} from '../types';
import {
  isLocalOnlyIdentityAction,
  reduceIdentityAction,
  type LocalIdentityAction,
} from '../identity/polkadotIdentity';
import {
  reduceWithSettlementAudit,
  type LocalSettlementAction,
} from '../settlement/localSettlementAudit';

export type LocalAppAction = LocalSettlementAction | LocalIdentityAction;

export function isLocalOnlyAppAction(action: LocalAppAction): boolean {
  return isLocalOnlyIdentityAction(action) || action.type === 'RETRACT_MARK_PAID' || action.type === 'ATTACH_CHAIN_EVIDENCE';
}

export function reduceLocalAppState(state: AppState, action: LocalAppAction): AppState {
  if (isLocalOnlyIdentityAction(action)) return reduceIdentityAction(state, action);
  return reduceWithSettlementAudit(state, action);
}
