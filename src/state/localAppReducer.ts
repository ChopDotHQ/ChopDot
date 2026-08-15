import type {AppState} from '../types';
import type {Action} from './store';
import {appendStableActivityForAction} from '../history/localActivityAudit';
import {
  isLocalOnlyIdentityAction,
  reduceIdentityAction,
  type LocalIdentityAction,
} from '../identity/polkadotIdentity';
import {
  isLocalOnlySettlementAction,
  reduceWithSettlementAudit,
  type LocalSettlementAction,
} from '../settlement/localSettlementAudit';

export type LocalAppAction = LocalSettlementAction | LocalIdentityAction;
export type LocalOnlyAppAction = LocalIdentityAction | Exclude<LocalSettlementAction, Action>;

export function isLocalOnlyAppAction(action: LocalAppAction): action is LocalOnlyAppAction {
  return isLocalOnlyIdentityAction(action) || isLocalOnlySettlementAction(action as LocalSettlementAction);
}

export function reduceLocalAppState(state: AppState, action: LocalAppAction): AppState {
  if (isLocalOnlyIdentityAction(action)) return reduceIdentityAction(state, action);
  const next = reduceWithSettlementAudit(state, action);
  if (isLocalOnlySettlementAction(action)) return next;
  return appendStableActivityForAction(state, next, action);
}
