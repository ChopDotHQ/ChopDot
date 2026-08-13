import {moneyToDecimal} from '../core/money.ts';
import type {GroupKeyEnvelopeV1} from '../environment/accountBoundKeyEnvelope.ts';
import {GroupRecoveryService} from './groupRecovery.ts';

export interface RecoveryActor {
  participantId: string;
  accountPublicKeyHex: string;
}

export interface RecoveryAccessResolver {
  resolve(input: {groupId: string; actor: RecoveryActor}): Promise<null | {
    productId: string;
    minimumKeyVersion: number;
    keyEnvelope: GroupKeyEnvelopeV1;
    entropy: Parameters<GroupRecoveryService['recover']>[0]['entropy'];
  }>;
}

export interface RecoveredGroupSummary {
  groupId: string;
  groupName: string;
  version: number;
  stateHash: string;
  totalLabel: string;
  currencies: string[];
  memberCount: number;
  receivedCount: number;
  openCount: number;
  closed: boolean;
  recordId: string | null;
}

export type RecoveryEntryOutcome =
  | {status: 'ready'; summary: RecoveredGroupSummary}
  | {status: 'unavailable'};

export class RecoveryEntryService {
  constructor(private readonly options: {
    actor: RecoveryActor;
    access: RecoveryAccessResolver;
    recovery: GroupRecoveryService;
  }) {}

  async recover(groupId: string): Promise<RecoveryEntryOutcome> {
    if (!groupId.trim()) return {status: 'unavailable'};
    const access = await this.options.access.resolve({groupId, actor: this.options.actor});
    if (!access) return {status: 'unavailable'};
    try {
      const recovered = await this.options.recovery.recover({
        productId: access.productId,
        groupId,
        participantId: this.options.actor.participantId,
        accountPublicKeyHex: this.options.actor.accountPublicKeyHex,
        minimumKeyVersion: access.minimumKeyVersion,
        keyEnvelope: access.keyEnvelope,
        entropy: access.entropy,
      });
      const currencyTotals = recovered.state.closed?.currencyTotals
        ?? Object.values(recovered.state.expenses).reduce<Record<string, typeof recovered.state.expenses[string]['total']>>((totals, expense) => {
          totals[expense.total.currency] = expense.total;
          return totals;
        }, {});
      const totals = Object.values(currencyTotals);
      const totalLabel = totals.length === 1
        ? `${totals[0].currency} ${moneyToDecimal(totals[0])}`
        : totals.map(total => `${total.currency} ${moneyToDecimal(total)}`).join(' · ');
      const participantShares = Object.values(recovered.state.shares).filter(share => {
        const expense = recovered.state.expenses[share.expenseId];
        return share.participantId !== expense.paidBy;
      });
      return {status: 'ready', summary: {
        groupId,
        groupName: recovered.state.name,
        version: recovered.state.version,
        stateHash: recovered.stateHash,
        totalLabel,
        currencies: totals.map(total => total.currency),
        memberCount: Object.keys(recovered.state.members).length,
        receivedCount: participantShares.filter(share => share.status === 'received').length,
        openCount: participantShares.filter(share => !['received', 'waived'].includes(share.status)).length,
        closed: Boolean(recovered.state.closed),
        recordId: recovered.state.closed?.recordId ?? null,
      }};
    } catch {
      return {status: 'unavailable'};
    }
  }
}
