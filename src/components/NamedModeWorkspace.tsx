import {useEffect, useMemo, useState} from 'react';
import {CheckCircle2, ChevronDown, Clock3, LockKeyhole, ReceiptText, UsersRound} from 'lucide-react';
import {sha256Hex} from '../core/canonical';
import type {ModeAuthorityCommandV1} from '../core/authority/productionAuthority';
import type {CanonicalGroupStateV1} from '../core/moneyEventKernel';
import {
  MODE_WORKFLOW_EVENT_TYPES_V1,
  type CommunityProposalV1,
  type EmergencyRequestV1,
  type ModeWorkflowEventTypeV1,
  type SavingsCircleRoundV1,
} from '../core/modeWorkflows';
import {moneyEquals, moneyFromDecimal, moneyFromMinorUnits, moneyToDecimal, type MoneyAllocationV1, type MoneyV1} from '../core/money';
import {useAppState} from '../state/AppStateContext';
import type {GroupMode} from '../types';
import {getCurrencySymbol} from '../utils';
import {ReceiptFirstStart, type ReviewableReceiptDraft} from './ReceiptFirstStart';
import {modeCopy} from './productModes';
import {BottomAction, Button, Screen, ScreenContent, ScreenHeader} from './primitives';

type NavigationAction = 'SPEND_SPLIT_PURCHASE' | 'SPEND_APPLY_EXPENSE_CORRECTION' | 'OPEN_GROUP_PAYMENTS';
export type NamedModeActionKey = ModeWorkflowEventTypeV1 | NavigationAction;

export interface NamedModeWorkspaceAction {
  key: NamedModeActionKey;
  label: string;
  context?: Record<string, string | number>;
}

export interface NamedModeWorkspaceModel {
  headline: string;
  support: string;
  primary: NamedModeWorkspaceAction | null;
  secondary: NamedModeWorkspaceAction[];
  status: string[];
}

/** Normal-language labels double as an exhaustiveness gate for every signed mode event. */
export const MODE_UI_EVENT_LABELS: Readonly<Record<ModeWorkflowEventTypeV1, string>> = {
  SPEND_TRANSACTION_IMPORTED: 'Add this card purchase',
  SPEND_RECEIPT_REVIEWED: 'Use this receipt',
  SPEND_TRANSACTION_LINKED: 'Connect this reviewed split',
  SPEND_TRANSACTION_REFUNDED: 'Record a refund',
  SPEND_TRANSACTION_REVERSED: 'Record a reversal',
  SPEND_SETTLED_ADJUSTMENT_CONFIRMED: 'Confirm the follow-up',
  CIRCLE_RULES_SET: 'Set the circle rules',
  CIRCLE_RULES_ACCEPTED: 'Accept these rules',
  CIRCLE_PARTICIPANT_EXITED: 'Record this person’s exit',
  CIRCLE_PARTICIPANT_REPLACED: 'Add their replacement',
  CIRCLE_ROUND_OPENED: 'Open the first round',
  CIRCLE_CONTRIBUTION_RECORDED: 'Record my contribution',
  CIRCLE_CONTRIBUTION_RECEIVED: 'Confirm this contribution',
  CIRCLE_CONTRIBUTION_DELAYED: 'Say I need more time',
  CIRCLE_CONTRIBUTION_DEFAULTED: 'Record a missed contribution',
  CIRCLE_CONTRIBUTION_CORRECTED: 'Correct my contribution',
  CIRCLE_PAYOUT_RECORDED: 'Record the handoff',
  CIRCLE_PAYOUT_CONFIRMED: 'Confirm the handoff arrived',
  CIRCLE_ROUND_ADVANCED: 'Open the next round',
  CIRCLE_CLOSED: 'Finish this circle',
  EMERGENCY_POLICY_SET: 'Set who must approve',
  EMERGENCY_POLICY_RECONCILED: 'Update the trusted group',
  EMERGENCY_REQUEST_OPENED: 'Open a private request',
  EMERGENCY_CONTRIBUTION_RECORDED: 'Record my contribution',
  EMERGENCY_CONTRIBUTION_RECEIVED: 'Confirm this contribution',
  EMERGENCY_REQUEST_APPROVED: 'Approve this support',
  EMERGENCY_RELEASE_RECORDED: 'Record the support sent',
  EMERGENCY_RELEASE_CONFIRMED: 'Confirm the support arrived',
  EMERGENCY_RELEASE_DISPUTED: 'Report a problem',
  EMERGENCY_CORRECTION_APPROVED: 'Approve the correction',
  EMERGENCY_RELEASE_CORRECTED: 'Record the corrected support',
  EMERGENCY_REQUEST_CLOSED: 'Save the support record',
  COMMUNITY_POLICY_SET: 'Set the fund roles',
  COMMUNITY_POLICY_RECONCILED: 'Update the fund roles',
  COMMUNITY_CONTRIBUTION_RECORDED: 'Record my contribution',
  COMMUNITY_CONTRIBUTION_RECEIVED: 'Confirm this contribution',
  COMMUNITY_PROPOSAL_CREATED: 'Add a proposal',
  COMMUNITY_PROPOSAL_AMENDED: 'Change this proposal',
  COMMUNITY_PROPOSAL_APPROVED: 'Approve this proposal',
  COMMUNITY_PROPOSAL_REJECTED: 'Decline this proposal',
  COMMUNITY_PROPOSAL_EXPIRED: 'Mark this proposal expired',
  COMMUNITY_RELEASE_RECORDED: 'Record the payment sent',
  COMMUNITY_RELEASE_CONFIRMED: 'Confirm the payment arrived',
  COMMUNITY_STEWARD_HANDOFF_PROPOSED: 'Choose the next steward',
  COMMUNITY_STEWARD_HANDOFF_ACCEPTED: 'Accept the steward handoff',
  COMMUNITY_REPORT_ADDED: 'Save a fund update',
  COMMUNITY_FUND_CLOSED: 'Finish this fund',
};

interface FormValues {
  amount: string;
  reference: string;
  note: string;
  merchant: string;
  recipientId: string;
  threshold: string;
  cadence: string;
  until: string;
}

export function NamedModeWorkspace({
  groupId,
  onBack,
  onSplitPurchase,
  onOpenPayments,
  onManageMembers,
}: {
  groupId: string;
  onBack: () => void;
  onSplitPurchase: (draft: {amount: string; title: string; transactionId: string}) => void;
  onOpenPayments: () => void;
  onManageMembers?: () => void;
}) {
  const {state, authorityBusy, authorityError, runModeAuthority, runExpenseCorrectionAuthority, readCanonicalGroup} = useAppState();
  const group = state.groups[groupId];
  const actorId = state.currentUserId;
  const [canonical, setCanonical] = useState<CanonicalGroupStateV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [localError, setLocalError] = useState('');
  const [selectedKey, setSelectedKey] = useState<NamedModeActionKey | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void readCanonicalGroup(groupId)
      .then(value => { if (!cancelled) setCanonical(value); })
      .catch(reason => { if (!cancelled) setLocalError(message(reason)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [groupId, readCanonicalGroup]);

  const model = useMemo(() => canonical && actorId
    ? deriveNamedModeWorkspace(canonical, actorId, new Date())
    : null, [actorId, canonical]);
  const selected = useMemo(() => {
    const actions = model ? [model.primary, ...model.secondary].filter((value): value is NamedModeWorkspaceAction => Boolean(value)) : [];
    return actions.find(action => action.key === selectedKey) ?? model?.primary ?? null;
  }, [model, selectedKey]);
  const [form, setForm] = useState<FormValues>(() => initialForm(group?.memberIds ?? [], actorId));

  useEffect(() => {
    setSelectedKey(null);
    setShowOptions(false);
    setForm(initialForm(group?.memberIds ?? [], actorId));
  }, [actorId, canonical?.version, group?.memberIds]);

  if (!group || !actorId) return null;
  if (selected?.key === 'SPEND_RECEIPT_REVIEWED' && canonical) {
    return (
      <ReceiptFirstStart
        currency={state.currency}
        onBack={() => setSelectedKey(null)}
        onContinue={draft => void reviewSpendReceipt(draft, selected, canonical, groupId, runModeAuthority, setCanonical, setLocalError)}
      />
    );
  }

  const copy = modeCopy(group);
  const busy = authorityBusy || loading;
  const ready = selected ? formReady(selected.key, form) : false;
  const runSelected = async () => {
    if (!selected || !canonical || busy) return;
    setLocalError('');
    if (selected.key === 'SPEND_SPLIT_PURCHASE') {
      const transactionId = String(selected.context?.transactionId ?? '');
      const transaction = canonical.modeState?.spendCard?.transactions[transactionId];
      if (!transaction?.receipt) return;
      onSplitPurchase({amount: moneyToDecimal(transaction.receipt.reviewedTotal), title: transaction.merchantLabel, transactionId});
      return;
    }
    if (selected.key === 'OPEN_GROUP_PAYMENTS') {
      onOpenPayments();
      return;
    }
    if (selected.key === 'SPEND_APPLY_EXPENSE_CORRECTION') {
      try {
        const transactionId = String(selected.context?.transactionId ?? '');
        const pending = canonical.modeState?.spendCard?.transactions[transactionId]?.pendingExpenseCorrection;
        if (!pending) return;
        const next = await runExpenseCorrectionAuthority({
          groupId,
          expenseId: pending.expenseId,
          reason: pending.correctionReason,
          total: pending.nextTotal,
          allocations: proportionalExpenseAllocations(canonical, pending.expenseId, pending.nextTotal),
        });
        if (next) setCanonical(next);
      } catch (reason) {
        setLocalError(message(reason));
      }
      return;
    }
    try {
      const payload = await commandPayload(selected, canonical, form, state.currency, actorId);
      const next = await runModeAuthority({groupId, eventType: selected.key, payload} as ModeAuthorityCommandV1);
      if (next) setCanonical(next);
    } catch (reason) {
      setLocalError(message(reason));
    }
  };

  return (
    <Screen>
      <ScreenHeader title={group.name} onBack={onBack} rightAction={onManageMembers ? (
        <button type="button" onClick={onManageMembers} className="min-h-11 rounded-full px-3 text-xs font-semibold text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10">
          Manage members
        </button>
      ) : undefined} />
      <ScreenContent className="bg-[#f7f6f4] px-6 py-7 dark:bg-gray-950">
        {loading || !model ? (
          <div role="status" className="py-16 text-center text-sm font-medium text-gray-600">Opening your group…</div>
        ) : (
          <>
            <p className="text-sm font-semibold text-[#c40068] dark:text-[#ff65b5]">{copy.label}</p>
            <h2 className="mt-2 text-[2.15rem] font-bold leading-[1.04] tracking-[-0.055em] text-gray-950 dark:text-white">{model.headline}</h2>
            <p className="mt-3 max-w-[19rem] text-[15px] leading-6 text-gray-600 dark:text-gray-300">{model.support}</p>

            {selected && needsForm(selected.key) && (
              <ActionFields
                action={selected}
                form={form}
                onChange={changes => setForm(current => ({...current, ...changes}))}
                canonical={canonical!}
                memberIds={Object.values(canonical!.members).filter(member => member.active !== false).map(member => member.participantId)}
                currentUserId={actorId}
                users={state.users}
                currency={state.currency}
              />
            )}

            {model.status.length > 0 && (
              <section aria-label="Group progress" className="mt-8 divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                {model.status.map((line, index) => (
                  <div key={`${line}-${index}`} className="flex items-start gap-3 py-4">
                    {index === 0 ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#e6007a]" aria-hidden="true" /> : <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />}
                    <p className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-200">{line}</p>
                  </div>
                ))}
              </section>
            )}

            {(localError || authorityError) && <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-200">{localError || authorityError}</p>}

            {model.secondary.length > 0 && (
              <div className="mt-7 border-t border-gray-200 pt-5 dark:border-gray-800">
                <button type="button" onClick={() => setShowOptions(value => !value)} aria-expanded={showOptions} className="flex min-h-11 w-full items-center justify-between text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                  Change or add something
                  <ChevronDown className={`h-4 w-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {showOptions && (
                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {model.secondary.map(action => (
                      <button key={`${action.key}-${JSON.stringify(action.context ?? {})}`} type="button" onClick={() => { setSelectedKey(action.key); setShowOptions(false); }} className="min-h-12 w-full py-3 text-left text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </ScreenContent>
      {selected && !loading && (
        <BottomAction>
          <Button fullWidth disabled={busy || !ready} onClick={() => void runSelected()} data-testid="mode-primary-action">
            {busy ? 'Saving safely…' : selected.label}
          </Button>
          {selectedKey && model?.primary && selected.key !== model.primary.key && (
            <Button variant="muted" fullWidth onClick={() => setSelectedKey(null)}>Back to what’s next</Button>
          )}
        </BottomAction>
      )}
    </Screen>
  );
}

export function deriveNamedModeWorkspace(state: CanonicalGroupStateV1, actorId: string, now: Date): NamedModeWorkspaceModel {
  const mode = state.mode as GroupMode;
  if (mode === 'spend_card') return spendCardModel(state, actorId);
  if (mode === 'savings_circle') return savingsCircleModel(state, actorId, now);
  if (mode === 'emergency_pot') return emergencyPotModel(state, actorId);
  if (mode === 'community_fund') return communityFundModel(state, actorId, now);
  return {headline: 'Start with the receipt.', support: 'Review it before anything reaches the group.', primary: null, secondary: [], status: []};
}

function spendCardModel(state: CanonicalGroupStateV1, actorId: string): NamedModeWorkspaceModel {
  const allTransactions = Object.values(state.modeState?.spendCard?.transactions ?? {})
    .sort((left, right) => right.transactedAt.localeCompare(left.transactedAt));
  const followUp = allTransactions.flatMap(transaction => transaction.settledAdjustmentFollowUps.map(row => ({transaction, row})))
    .find(({row}) => row.requiredConfirmationIds.includes(actorId) && !row.confirmedBy.some(confirmation => confirmation.participantId === actorId));
  if (followUp) {
    const allocation = followUp.row.allocations.find(row => row.participantId === actorId);
    return model(
      'Confirm the refund follow-up.',
      'The original settled shares stay unchanged. Confirm only after your exact follow-up is resolved outside ChopDot.',
      action('SPEND_SETTLED_ADJUSTMENT_CONFIRMED', {transactionId: followUp.transaction.transactionId, adjustmentId: followUp.row.adjustmentId}),
      [],
      allocation ? [`Your follow-up · ${displayMoney(allocation.amount)}`, `${followUp.row.confirmedBy.length} of ${followUp.row.requiredConfirmationIds.length} people confirmed`] : [],
    );
  }
  const unresolvedFollowUp = allTransactions.flatMap(transaction => transaction.settledAdjustmentFollowUps).find(row => row.confirmedBy.length !== row.requiredConfirmationIds.length);
  if (unresolvedFollowUp) return waiting('Waiting for the refund follow-up.', `${unresolvedFollowUp.confirmedBy.length} of ${unresolvedFollowUp.requiredConfirmationIds.length} affected people confirmed. The settled shares remain unchanged.`);
  const transactions = allTransactions
    .filter(transaction => transaction.cardholderId === actorId)
    ;
  const current = transactions.find(transaction => transaction.pendingExpenseCorrection)
    ?? transactions.find(transaction => !transaction.linkedExpenseId)
    ?? transactions[0];
  if (!current) return model('Add the card purchase.', 'Then match the receipt before anyone is asked to pay.', action('SPEND_TRANSACTION_IMPORTED'));
  if (!current.receipt) return model('Match the receipt.', `${current.merchantLabel} is waiting for a reviewed receipt.`, action('SPEND_RECEIPT_REVIEWED', {transactionId: current.transactionId}), [action('SPEND_TRANSACTION_IMPORTED')], [`Card purchase · ${displayMoney(current.total)}`]);
  if (current.pendingExpenseCorrection) return model(
    'Update everyone’s shares.',
    'The refund or reversal is saved. Apply its exact total to the connected group expense before doing anything else.',
    {key: 'SPEND_APPLY_EXPENSE_CORRECTION', label: 'Apply the correction', context: {transactionId: current.transactionId}},
    [],
    [`New purchase total · ${displayMoney(current.pendingExpenseCorrection.nextTotal)}`, 'Group close and complete export stay blocked until this succeeds.'],
  );
  const corrections = current.linkedExpenseId && current.remaining.minorUnits !== '0'
    ? [action('SPEND_TRANSACTION_REFUNDED', {transactionId: current.transactionId}), action('SPEND_TRANSACTION_REVERSED', {transactionId: current.transactionId})]
    : [];
  const linkedExpenseIds = new Set(transactions.map(transaction => transaction.linkedExpenseId).filter(Boolean));
  const matchingExpense = Object.values(state.expenses).find(expense => expense.paidBy === actorId
    && !linkedExpenseIds.has(expense.expenseId)
    && moneyEquals(expense.total, current.receipt!.reviewedTotal));
  const primary = current.linkedExpenseId
    ? {key: 'OPEN_GROUP_PAYMENTS' as const, label: 'Open group payments'}
    : matchingExpense
      ? action('SPEND_TRANSACTION_LINKED', {transactionId: current.transactionId, expenseId: matchingExpense.expenseId})
      : {key: 'SPEND_SPLIT_PURCHASE' as const, label: 'Split this purchase', context: {transactionId: current.transactionId}};
  return model(
    current.receipt.outcome === 'matched' ? 'Receipt matched.' : 'The totals are different.',
    current.receipt.outcome === 'matched' ? 'Review the people and shares next.' : 'Use the reviewed receipt total, or record a refund or reversal.',
    primary,
    [...corrections, action('SPEND_TRANSACTION_IMPORTED')],
    [`Card purchase · ${displayMoney(current.total)}`, `Receipt · ${displayMoney(current.receipt.reviewedTotal)}`],
  );
}

function savingsCircleModel(state: CanonicalGroupStateV1, actorId: string, now: Date): NamedModeWorkspaceModel {
  const circle = state.modeState?.savingsCircle;
  if (!circle?.rules) return state.organizerId === actorId
    ? model('Set the circle rules.', 'Choose one contribution amount and a clear turn order.', action('CIRCLE_RULES_SET'))
    : waiting('The organizer is setting the circle rules.', 'You will be asked to accept them before the first round.');
  const rules = circle.rules;
  const departedParticipantId = rules.participantOrder.find(id => state.members[id]?.active === false);
  if (departedParticipantId) {
    if (state.organizerId !== actorId) return waiting('The turn order needs an update.', 'The organizer must record the departure and name an accepted replacement.');
    const round = circle.activeRound;
    if (round && !round.exitedParticipantIds.includes(departedParticipantId)) return model(
      'Record this person’s exit.',
      'Their turn or contribution stays visible until an accepted replacement is named.',
      action('CIRCLE_PARTICIPANT_EXITED', {participantId: departedParticipantId}),
    );
    const replacement = Object.values(state.members)
      .filter(member => member.active !== false && member.acceptedAt && !rules.participantOrder.includes(member.participantId))
      .sort((left, right) => left.participantId.localeCompare(right.participantId))[0];
    return replacement
      ? model('Add the accepted replacement.', 'They take the same place in the turn order and must accept the rules.', action('CIRCLE_PARTICIPANT_REPLACED', {departedParticipantId, replacementParticipantId: replacement.participantId}))
      : waiting('An accepted replacement is needed.', 'Add and accept a new group member before continuing the circle.');
  }
  if (!rules.acceptedBy.includes(actorId)) return model('Check the rules.', `${displayMoney(rules.contribution)} each round · ${rules.participantOrder.length} turns.`, action('CIRCLE_RULES_ACCEPTED', {rulesId: rules.rulesId}));
  if (rules.acceptedBy.length !== rules.participantOrder.length) return waiting('Waiting for everyone to accept.', `${rules.acceptedBy.length} of ${rules.participantOrder.length} people have accepted.`);
  if (circle.closedRecordId) return waiting('This circle is finished.', `${circle.completedRounds.length} rounds are saved.`);
  if (!circle.activeRound) return state.organizerId === actorId
    ? model('Open the first round.', `${displayMoney(rules.contribution)} per person.`, action('CIRCLE_ROUND_OPENED'))
    : waiting('The first round is ready to open.', 'Waiting for the organizer.');
  const round = circle.activeRound;
  const own = Object.values(round.contributions).find(row => row.participantId === actorId);
  const recorded = Object.values(round.contributions).find(row => ['recorded', 'delayed'].includes(row.status));
  const recipientName = `round ${round.sequence}`;
  const secondary: NamedModeWorkspaceAction[] = [];
  if (own && actorId !== round.recipientId && own.status !== 'received') {
    secondary.push(action('CIRCLE_CONTRIBUTION_DELAYED', {roundId: round.roundId, contributionId: own.contributionId}));
    secondary.push(action('CIRCLE_CONTRIBUTION_CORRECTED', {roundId: round.roundId, contributionId: own.contributionId}));
  }
  if (actorId !== round.recipientId && !own) return model('Record your contribution.', `${displayMoney(rules.contribution)} is due for round ${round.sequence}.`, action('CIRCLE_CONTRIBUTION_RECORDED', {roundId: round.roundId}), secondary, [`Recipient · ${recipientName}`]);
  if (actorId === round.recipientId && recorded) {
    if (Date.parse(recorded.delayUntil ?? round.dueAt) <= now.getTime()) secondary.push(action('CIRCLE_CONTRIBUTION_DEFAULTED', {roundId: round.roundId, contributionId: recorded.contributionId}));
    return model('Confirm what arrived.', 'Confirm one contribution at a time.', action('CIRCLE_CONTRIBUTION_RECEIVED', {roundId: round.roundId, contributionId: recorded.contributionId}), secondary, circleRoundStatus(round, rules.participantOrder.length));
  }
  const due = rules.participantOrder.filter(id => id !== round.recipientId);
  const allResolved = due.every(id => Object.values(round.contributions).some(row => row.participantId === id && ['received', 'defaulted'].includes(row.status)));
  if (!allResolved) return waiting('Waiting on this round.', `${Object.values(round.contributions).filter(row => row.status === 'received').length} of ${due.length} contributions confirmed.`, secondary);
  if (!round.payout) return state.organizerId === actorId
    ? model('Record the handoff.', 'Only confirmed contributions are included.', action('CIRCLE_PAYOUT_RECORDED', {roundId: round.roundId}), secondary, circleRoundStatus(round, rules.participantOrder.length))
    : waiting('The round is ready for its handoff.', 'Waiting for the organizer to record what was sent.', secondary);
  if (round.payout.status === 'recorded') return round.recipientId === actorId
    ? model('Did the handoff arrive?', `${displayMoney(round.payout.amount)} was recorded as sent.`, action('CIRCLE_PAYOUT_CONFIRMED', {roundId: round.roundId, payoutId: round.payout.payoutId}), secondary)
    : waiting('Waiting for the recipient.', 'The round moves only after they confirm what arrived.', secondary);
  if (state.organizerId !== actorId) return waiting('This round is complete.', 'Waiting for the organizer to move the circle forward.', secondary);
  return round.sequence === rules.participantOrder.length
    ? model('Finish the circle.', 'Every recipient has confirmed their turn.', action('CIRCLE_CLOSED', {roundId: round.roundId}), secondary)
    : model('Open the next round.', `Round ${round.sequence} is complete.`, action('CIRCLE_ROUND_ADVANCED', {roundId: round.roundId}), secondary);
}

function emergencyPotModel(state: CanonicalGroupStateV1, actorId: string): NamedModeWorkspaceModel {
  const emergency = state.modeState?.emergencyPot;
  if (!emergency?.policy) return state.organizerId === actorId
    ? model('Set who must approve.', 'Support is never sent from ChopDot, and one person cannot bypass the group.', action('EMERGENCY_POLICY_SET'))
    : waiting('The trusted group is being set.', 'Nothing can be approved yet.');
  const policy = emergency.policy;
  if (policy.trustedApproverIds.some(id => state.members[id]?.active === false)) return state.organizerId === actorId
    ? model('Update the trusted group.', 'A removed member cannot keep approval power. This signed update preserves the open history.', action('EMERGENCY_POLICY_RECONCILED'))
    : waiting('The trusted group needs an update.', 'The organizer must remove departed approvers before support can continue.');
  const requests = Object.values(emergency.requests).sort((left, right) => left.requestId.localeCompare(right.requestId));
  const request = requests.find(row => !row.closedRecordId);
  if (!request) return requests.length > 0
    ? model('Support record saved.', 'The private reason and recipient stay out of the public summary. Open another request only when someone needs support.', action('EMERGENCY_REQUEST_OPENED'), [], [`${requests.length} support record${requests.length === 1 ? '' : 's'} saved`])
    : model('Open a private request.', 'Choose the recipient and target. The private reason is not collected.', action('EMERGENCY_REQUEST_OPENED'));
  const secondary: NamedModeWorkspaceAction[] = [];
  const recorded = Object.values(request.contributions).find(row => row.status === 'recorded');
  if (recorded && state.organizerId === actorId) return model('Confirm this contribution.', 'Check what arrived before it counts toward the support total.', action('EMERGENCY_CONTRIBUTION_RECEIVED', {requestId: request.requestId, contributionId: recorded.contributionId}), [action('EMERGENCY_CONTRIBUTION_RECORDED', {requestId: request.requestId})], emergencyStatus(request, policy.approvalThreshold));
  if (request.release?.status === 'recorded' && request.recipientId === actorId) return model('Did the support arrive?', `${displayMoney(request.release.amount)} was recorded as sent.`, action('EMERGENCY_RELEASE_CONFIRMED', {requestId: request.requestId, releaseId: request.release.releaseId}), [action('EMERGENCY_RELEASE_DISPUTED', {requestId: request.requestId, releaseId: request.release.releaseId})], emergencyStatus(request, policy.approvalThreshold));
  if (request.release?.status === 'recorded') return waiting('Waiting for the recipient.', 'They confirm or report a problem before this record can close.');
  if (request.release?.status === 'confirmed') return state.organizerId === actorId
    ? model('Save the support record.', 'The public record keeps the private reason and recipient out.', action('EMERGENCY_REQUEST_CLOSED', {requestId: request.requestId}), [], emergencyStatus(request, policy.approvalThreshold))
    : waiting('Support confirmed.', 'The organizer can now save the redacted record.');
  if (request.release?.status === 'disputed') {
    if (policy.trustedApproverIds.includes(actorId) && !request.correctionApprovedBy.includes(actorId)) return model(
      'Review the correction.',
      'The disputed record stays visible. Your approval only authorizes a corrected successor.',
      action('EMERGENCY_CORRECTION_APPROVED', {requestId: request.requestId, releaseId: request.release.releaseId}),
      [],
      emergencyCorrectionStatus(request, policy.approvalThreshold),
    );
    if (state.organizerId === actorId && request.correctionApprovedBy.length >= policy.approvalThreshold) return model(
      'Record the corrected support.',
      'This creates a new external-payment record and keeps the disputed one in history.',
      action('EMERGENCY_RELEASE_CORRECTED', {requestId: request.requestId, disputedReleaseId: request.release.releaseId}),
      [],
      emergencyCorrectionStatus(request, policy.approvalThreshold),
    );
    return waiting('The recipient reported a problem.', `${request.correctionApprovedBy.length} of ${policy.approvalThreshold} correction approvals received.`);
  }
  if (policy.trustedApproverIds.includes(actorId) && !request.approvedBy.includes(actorId)) return model('Review this support.', 'Your approval is one part of the group threshold.', action('EMERGENCY_REQUEST_APPROVED', {requestId: request.requestId}), [action('EMERGENCY_CONTRIBUTION_RECORDED', {requestId: request.requestId})], emergencyStatus(request, policy.approvalThreshold));
  const received = sum(Object.values(request.contributions).filter(row => row.status === 'received').map(row => row.amount), request.target);
  if (!request.release && request.approvedBy.length >= policy.approvalThreshold && BigInt(received.minorUnits) > 0n && state.organizerId === actorId) return model('Record the support sent.', 'This records an external payment; it does not move money.', action('EMERGENCY_RELEASE_RECORDED', {requestId: request.requestId}), [action('EMERGENCY_CONTRIBUTION_RECORDED', {requestId: request.requestId})], emergencyStatus(request, policy.approvalThreshold));
  secondary.push(action('EMERGENCY_CONTRIBUTION_RECORDED', {requestId: request.requestId}));
  return model('Contribute privately.', 'Record only the amount and payment reference. The private reason stays off the record.', secondary[0], [], emergencyStatus(request, policy.approvalThreshold));
}

function communityFundModel(state: CanonicalGroupStateV1, actorId: string, now: Date): NamedModeWorkspaceModel {
  const fund = state.modeState?.communityFund;
  if (!fund?.policy) return state.organizerId === actorId
    ? model('Set the fund roles.', 'Choose a steward and how many people must approve a payment.', action('COMMUNITY_POLICY_SET'))
    : waiting('The fund roles are being set.', 'Contributions and proposals open after that.');
  const policy = fund.policy;
  if (fund.closedRecordId) return waiting('This fund is finished.', 'Its contributions, decisions, payments, and reports are saved.');
  const communityRoleDeparted = state.members[policy.stewardId]?.active === false || policy.approverIds.some(id => state.members[id]?.active === false);
  if (communityRoleDeparted) return state.organizerId === actorId
    ? model('Update the fund roles.', 'A removed member cannot keep steward or approval power. Open decisions remain visible.', action('COMMUNITY_POLICY_RECONCILED'))
    : waiting('The fund roles need an update.', 'The organizer must remove departed role holders before the fund continues.');
  const common: NamedModeWorkspaceAction[] = [action('COMMUNITY_CONTRIBUTION_RECORDED'), action('COMMUNITY_PROPOSAL_CREATED')];
  if (policy.stewardId === actorId) common.push(action('COMMUNITY_STEWARD_HANDOFF_PROPOSED'), action('COMMUNITY_REPORT_ADDED'));
  if (fund.pendingHandoff?.nextStewardId === actorId) return model('Take over the fund?', 'Accept only if you are ready to keep the next record.', action('COMMUNITY_STEWARD_HANDOFF_ACCEPTED', {handoffId: fund.pendingHandoff.handoffId}), common);
  const recorded = Object.values(fund.contributions).find(row => row.status === 'recorded');
  if (recorded && policy.stewardId === actorId) return model('Confirm this contribution.', 'Check what arrived before it becomes available to proposals.', action('COMMUNITY_CONTRIBUTION_RECEIVED', {contributionId: recorded.contributionId}), common, communityStatus(fund));
  const proposals = Object.values(fund.proposals).sort((left, right) => right.revision - left.revision || left.proposalId.localeCompare(right.proposalId));
  const released = proposals.find(row => row.status === 'released' && row.recipientId === actorId);
  if (released?.release) return model('Did the payment arrive?', released.summary, action('COMMUNITY_RELEASE_CONFIRMED', {proposalId: released.proposalId, releaseId: released.release.releaseId}), common, communityStatus(fund));
  const approved = proposals.find(row => row.status === 'approved');
  if (approved && policy.stewardId === actorId) return model('Record the approved payment.', approved.summary, action('COMMUNITY_RELEASE_RECORDED', {proposalId: approved.proposalId}), common, communityStatus(fund));
  const open = proposals.find(row => row.status === 'open');
  if (open) {
    const options = [...common];
    if (open.proposerId === actorId) options.unshift(action('COMMUNITY_PROPOSAL_AMENDED', {proposalId: open.proposalId}));
    if (policy.approverIds.includes(actorId)) options.unshift(action('COMMUNITY_PROPOSAL_REJECTED', {proposalId: open.proposalId}));
    if (Date.parse(open.expiresAt) <= now.getTime()) return model('This proposal has expired.', open.summary, action('COMMUNITY_PROPOSAL_EXPIRED', {proposalId: open.proposalId}), options, communityStatus(fund));
    if (policy.approverIds.includes(actorId) && !open.approvedBy.includes(actorId)) return model('Review the proposal.', open.summary, action('COMMUNITY_PROPOSAL_APPROVED', {proposalId: open.proposalId}), options, communityStatus(fund));
    return waiting('Waiting for the other reviewers.', `${open.approvedBy.length} of ${policy.approvalThreshold} approvals received.`, options);
  }
  const received = Object.values(fund.contributions).some(row => row.status === 'received');
  if (!received) return model('Record a fund contribution.', 'The steward confirms what arrived before it can support a proposal.', action('COMMUNITY_CONTRIBUTION_RECORDED'), common.slice(1));
  const canClose = proposals.length > 0
    && !fund.pendingHandoff
    && Object.values(fund.contributions).every(row => row.status === 'received')
    && proposals.every(row => ['confirmed', 'rejected', 'expired'].includes(row.status));
  if (canClose && policy.stewardId === actorId) return model(
    'Finish this fund?',
    'Every contribution and proposal is resolved. Closing keeps the full history and stops new activity.',
    action('COMMUNITY_FUND_CLOSED'),
    common,
    communityStatus(fund),
  );
  return model('Add the next proposal.', 'Keep the purpose short and choose who should receive the payment.', action('COMMUNITY_PROPOSAL_CREATED'), common.filter(row => row.key !== 'COMMUNITY_PROPOSAL_CREATED'), communityStatus(fund));
}

function ActionFields({action: selected, form, onChange, canonical, memberIds, currentUserId, users, currency}: {
  action: NamedModeWorkspaceAction;
  form: FormValues;
  onChange: (changes: Partial<FormValues>) => void;
  canonical: CanonicalGroupStateV1;
  memberIds: string[];
  currentUserId: string;
  users: Record<string, {name: string}>;
  currency: string;
}) {
  const key = selected.key;
  const amount = amountField(key);
  const reference = referenceField(key);
  const note = noteField(key);
  const recipient = recipientField(key);
  const threshold = ['EMERGENCY_POLICY_SET', 'COMMUNITY_POLICY_SET'].includes(key);
  const cadence = key === 'CIRCLE_RULES_SET';
  const until = key === 'CIRCLE_CONTRIBUTION_DELAYED';
  return (
    <section className="mt-8 space-y-5" aria-label={selected.label}>
      {key === 'SPEND_TRANSACTION_IMPORTED' && <TextField label="Merchant" value={form.merchant} onChange={value => onChange({merchant: value})} placeholder="e.g. Gusto Zurich" />}
      {note && <TextField label={note} value={form.note} onChange={value => onChange({note: value})} placeholder={key.startsWith('COMMUNITY_') ? 'Keep it short and clear' : 'Optional private note'} />}
      {amount && <MoneyField label={amount} value={form.amount} currency={currency} onChange={value => onChange({amount: value})} />}
      {reference && <TextField label="Payment reference" value={form.reference} onChange={value => onChange({reference: value})} placeholder="Bank or cash reference" />}
      {recipient && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">{recipient}
          <select value={form.recipientId} onChange={event => onChange({recipientId: event.target.value})} className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-950 outline-none focus:border-[#e6007a] dark:border-gray-700 dark:bg-gray-900 dark:text-white">
            {memberIds.filter(id => id !== currentUserId || memberIds.length === 1).map(id => <option key={id} value={id}>{users[id]?.name ?? id}</option>)}
          </select>
        </label>
      )}
      {threshold && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Approvals needed
          <input type="number" min="1" max={memberIds.length} value={form.threshold} onChange={event => onChange({threshold: event.target.value})} className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-950 outline-none focus:border-[#e6007a] dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
          <span className="mt-2 block text-xs font-normal text-gray-600 dark:text-gray-300">All {memberIds.length} group members can review.</span>
        </label>
      )}
      {cadence && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Days between rounds
          <input type="number" min="1" max="366" value={form.cadence} onChange={event => onChange({cadence: event.target.value})} className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-950 outline-none focus:border-[#e6007a] dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
          <span className="mt-2 block text-xs font-normal text-gray-600 dark:text-gray-300">Turn order: {memberIds.map(id => users[id]?.name ?? id).join(' → ')}</span>
        </label>
      )}
      {until && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">New date
          <input type="datetime-local" value={form.until} onChange={event => onChange({until: event.target.value})} className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-950 outline-none focus:border-[#e6007a] dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
        </label>
      )}
      {key === 'EMERGENCY_REQUEST_OPENED' && (
        <div className="flex gap-3 rounded-2xl bg-white px-4 py-3 text-sm leading-5 text-gray-700 shadow-sm dark:bg-gray-900 dark:text-gray-200">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#e6007a]" aria-hidden="true" />
          The private reason is not collected. Only the target and group decision are saved.
        </div>
      )}
      {key === 'SPEND_TRANSACTION_IMPORTED' && (
        <div className="flex gap-3 text-sm leading-5 text-gray-600 dark:text-gray-300"><ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-[#e6007a]" aria-hidden="true" />Adding a purchase does not accept its receipt or ask anyone to pay.</div>
      )}
      {key === 'CIRCLE_RULES_SET' && (
        <div className="flex gap-3 text-sm leading-5 text-gray-600 dark:text-gray-300"><UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-[#e6007a]" aria-hidden="true" />Every person accepts these rules before round one.</div>
      )}
      {canonical.closed && <p className="text-sm font-medium text-gray-600 dark:text-gray-300">This group has already been saved.</p>}
    </section>
  );
}

async function reviewSpendReceipt(
  draft: ReviewableReceiptDraft,
  selected: NamedModeWorkspaceAction,
  canonical: CanonicalGroupStateV1,
  groupId: string,
  runModeAuthority: (command: ModeAuthorityCommandV1) => Promise<CanonicalGroupStateV1 | null>,
  setCanonical: (state: CanonicalGroupStateV1 | null) => void,
  setError: (message: string) => void,
) {
  const transactionId = String(selected.context?.transactionId ?? '');
  const transaction = canonical.modeState?.spendCard?.transactions[transactionId];
  if (!transaction) return;
  try {
    const receiptId = makeId('receipt');
    const receiptDigest = await sha256Hex(`chopdot:receipt:${transactionId}:${draft.fileName ?? 'manual'}:${draft.amount}:${draft.title}`);
    const next = await runModeAuthority({groupId, eventType: 'SPEND_RECEIPT_REVIEWED', payload: {transactionId, receiptId, receiptDigest, reviewedTotal: decimalMoney(String(draft.amount), transaction.total.currency)}});
    if (next) setCanonical(next);
  } catch (reason) {
    setError(message(reason));
  }
}

async function commandPayload(action: NamedModeWorkspaceAction, state: CanonicalGroupStateV1, form: FormValues, currency: string, actorId: string): Promise<ModeAuthorityCommandV1['payload']> {
  const key = action.key;
  const context = action.context ?? {};
  const now = new Date();
  const mode = state.modeState;
  if (key === 'SPEND_TRANSACTION_IMPORTED') return {transactionId: makeId('purchase'), transactionReferenceHash: await referenceDigest(form.reference), merchantLabel: form.merchant.trim(), total: decimalMoney(form.amount, currency), transactedAt: now.toISOString()};
  if (key === 'SPEND_TRANSACTION_LINKED') return {transactionId: String(context.transactionId), expenseId: String(context.expenseId)};
  if (key === 'SPEND_TRANSACTION_REFUNDED' || key === 'SPEND_TRANSACTION_REVERSED') return {transactionId: String(context.transactionId), adjustmentId: makeId(key.endsWith('REFUNDED') ? 'refund' : 'reversal'), referenceHash: await referenceDigest(form.reference), reasonDigest: await noteDigest(form.note), amount: decimalMoney(form.amount, currency)};
  if (key === 'SPEND_SETTLED_ADJUSTMENT_CONFIRMED') {
    const transaction = mode?.spendCard?.transactions[String(context.transactionId)];
    const followUp = transaction?.settledAdjustmentFollowUps.find(row => row.adjustmentId === String(context.adjustmentId));
    const allocation = followUp?.allocations.find(row => row.participantId === actorId);
    if (!followUp || !allocation) throw new Error('This refund follow-up is no longer waiting for you.');
    return {transactionId: transaction!.transactionId, adjustmentId: followUp.adjustmentId, amount: allocation.amount, resolutionReferenceHash: await referenceDigest(form.reference)};
  }
  if (key === 'CIRCLE_RULES_SET') return {rulesId: makeId('rules'), participantOrder: Object.keys(state.members), contribution: decimalMoney(form.amount, currency), dueEveryDays: Number(form.cadence)};
  if (key === 'CIRCLE_RULES_ACCEPTED') return {rulesId: String(context.rulesId)};
  if (key === 'CIRCLE_PARTICIPANT_EXITED') return {participantId: String(context.participantId), reasonDigest: await noteDigest('Canonical membership removed')};
  if (key === 'CIRCLE_PARTICIPANT_REPLACED') return {departedParticipantId: String(context.departedParticipantId), replacementParticipantId: String(context.replacementParticipantId), reasonDigest: await noteDigest('Accepted replacement preserves turn order')};
  if (key === 'CIRCLE_ROUND_OPENED') return {roundId: makeId('round'), sequence: 1, dueAt: addDays(now, state.modeState?.savingsCircle?.rules?.dueEveryDays ?? 30)};
  if (key === 'CIRCLE_CONTRIBUTION_RECORDED') return {roundId: String(context.roundId), contributionId: makeId('contribution'), amount: cloneMoney(mode?.savingsCircle?.rules?.contribution), referenceHash: await referenceDigest(form.reference)};
  if (key === 'CIRCLE_CONTRIBUTION_RECEIVED') return {roundId: String(context.roundId), contributionId: String(context.contributionId)};
  if (key === 'CIRCLE_CONTRIBUTION_DELAYED') return {roundId: String(context.roundId), contributionId: String(context.contributionId), until: new Date(form.until).toISOString(), noteDigest: await noteDigest(form.note || 'More time requested')};
  if (key === 'CIRCLE_CONTRIBUTION_DEFAULTED') return {roundId: String(context.roundId), contributionId: String(context.contributionId), noteDigest: await noteDigest(form.note || 'Contribution missed')};
  if (key === 'CIRCLE_CONTRIBUTION_CORRECTED') return {roundId: String(context.roundId), contributionId: String(context.contributionId), amount: decimalMoney(form.amount, currency), reasonDigest: await noteDigest(form.note || 'Amount corrected')};
  if (key === 'CIRCLE_PAYOUT_RECORDED') {
    const round = requiredRound(state, String(context.roundId));
    const partition = mode?.savingsCircle?.rules?.contribution;
    return {roundId: round.roundId, payoutId: makeId('handoff'), amount: sum(Object.values(round.contributions).filter(row => row.status === 'received').map(row => row.amount), partition!), referenceHash: await referenceDigest(form.reference)};
  }
  if (key === 'CIRCLE_PAYOUT_CONFIRMED') return {roundId: String(context.roundId), payoutId: String(context.payoutId)};
  if (key === 'CIRCLE_ROUND_ADVANCED') return {roundId: String(context.roundId), nextRoundId: makeId('round'), nextDueAt: addDays(now, mode?.savingsCircle?.rules?.dueEveryDays ?? 30)};
  if (key === 'CIRCLE_CLOSED') return {roundId: String(context.roundId), recordId: makeId('circle-record')};
  if (key === 'EMERGENCY_POLICY_SET') return {trustedApproverIds: Object.keys(state.members), approvalThreshold: Number(form.threshold)};
  if (key === 'EMERGENCY_POLICY_RECONCILED') {
    const policy = mode?.emergencyPot?.policy;
    if (!policy) throw new Error('The trusted group is missing.');
    const remainingApprovers = policy.trustedApproverIds.filter(id => state.members[id]?.active !== false);
    const trustedApproverIds = remainingApprovers.length > 0 ? remainingApprovers : [actorId];
    return {trustedApproverIds, approvalThreshold: Math.min(policy.approvalThreshold, trustedApproverIds.length)};
  }
  if (key === 'EMERGENCY_REQUEST_OPENED') {
    const requestId = makeId('support');
    return {requestId, recipientId: form.recipientId, reasonDigest: await sha256Hex(`chopdot:private-reason-withheld:${requestId}`), target: decimalMoney(form.amount, currency)};
  }
  if (key === 'EMERGENCY_CONTRIBUTION_RECORDED') return {requestId: String(context.requestId), contributionId: makeId('contribution'), amount: decimalMoney(form.amount, currency), referenceHash: await referenceDigest(form.reference)};
  if (key === 'EMERGENCY_CONTRIBUTION_RECEIVED') return {requestId: String(context.requestId), contributionId: String(context.contributionId)};
  if (key === 'EMERGENCY_REQUEST_APPROVED') return {requestId: String(context.requestId)};
  if (key === 'EMERGENCY_RELEASE_RECORDED') {
    const request = mode?.emergencyPot?.requests[String(context.requestId)];
    if (!request) throw new Error('This support request is missing.');
    const received = sum(Object.values(request.contributions).filter(row => row.status === 'received').map(row => row.amount), request.target);
    const amount = BigInt(received.minorUnits) < BigInt(request.target.minorUnits) ? received : request.target;
    return {requestId: request.requestId, releaseId: makeId('support-sent'), amount, referenceHash: await referenceDigest(form.reference)};
  }
  if (key === 'EMERGENCY_RELEASE_CONFIRMED') return {requestId: String(context.requestId), releaseId: String(context.releaseId)};
  if (key === 'EMERGENCY_RELEASE_DISPUTED') return {requestId: String(context.requestId), releaseId: String(context.releaseId), reasonDigest: await noteDigest(form.note)};
  if (key === 'EMERGENCY_CORRECTION_APPROVED') return {requestId: String(context.requestId), releaseId: String(context.releaseId)};
  if (key === 'EMERGENCY_RELEASE_CORRECTED') return {requestId: String(context.requestId), disputedReleaseId: String(context.disputedReleaseId), releaseId: makeId('support-corrected'), amount: decimalMoney(form.amount, currency), referenceHash: await referenceDigest(form.reference), reasonDigest: await noteDigest(form.note)};
  if (key === 'EMERGENCY_REQUEST_CLOSED') return {requestId: String(context.requestId), recordId: makeId('support-record')};
  if (key === 'COMMUNITY_POLICY_SET') return {stewardId: actorId, approverIds: Object.keys(state.members), approvalThreshold: Number(form.threshold)};
  if (key === 'COMMUNITY_POLICY_RECONCILED') {
    const policy = mode?.communityFund?.policy;
    if (!policy) throw new Error('The fund roles are missing.');
    const activeIds = Object.values(state.members).filter(member => member.active !== false).map(member => member.participantId).sort();
    const remainingApprovers = policy.approverIds.filter(id => activeIds.includes(id));
    const approverIds = remainingApprovers.length > 0 ? remainingApprovers : [actorId];
    const stewardId = activeIds.includes(policy.stewardId) ? policy.stewardId : actorId;
    return {stewardId, approverIds, approvalThreshold: Math.min(policy.approvalThreshold, approverIds.length)};
  }
  if (key === 'COMMUNITY_CONTRIBUTION_RECORDED') return {contributionId: makeId('contribution'), amount: decimalMoney(form.amount, currency), referenceHash: await referenceDigest(form.reference)};
  if (key === 'COMMUNITY_CONTRIBUTION_RECEIVED') return {contributionId: String(context.contributionId)};
  if (key === 'COMMUNITY_PROPOSAL_CREATED') {
    const proposalId = makeId('proposal');
    return {proposalId, recipientId: form.recipientId, summary: form.note.trim(), purposeDigest: await noteDigest(form.note), amount: decimalMoney(form.amount, currency), expiresAt: addDays(now, 7)};
  }
  if (key === 'COMMUNITY_PROPOSAL_AMENDED') return {proposalId: String(context.proposalId), summary: form.note.trim(), purposeDigest: await noteDigest(form.note), amount: decimalMoney(form.amount, currency), expiresAt: addDays(now, 7)};
  if (key === 'COMMUNITY_PROPOSAL_APPROVED' || key === 'COMMUNITY_PROPOSAL_EXPIRED') return {proposalId: String(context.proposalId)};
  if (key === 'COMMUNITY_PROPOSAL_REJECTED') return {proposalId: String(context.proposalId), reasonDigest: await noteDigest(form.note)};
  if (key === 'COMMUNITY_RELEASE_RECORDED') {
    const proposal = requiredProposal(state, String(context.proposalId));
    return {proposalId: proposal.proposalId, releaseId: makeId('fund-payment'), amount: proposal.amount, referenceHash: await referenceDigest(form.reference)};
  }
  if (key === 'COMMUNITY_RELEASE_CONFIRMED') return {proposalId: String(context.proposalId), releaseId: String(context.releaseId)};
  if (key === 'COMMUNITY_STEWARD_HANDOFF_PROPOSED') return {handoffId: makeId('steward'), nextStewardId: form.recipientId};
  if (key === 'COMMUNITY_STEWARD_HANDOFF_ACCEPTED') return {handoffId: String(context.handoffId)};
  if (key === 'COMMUNITY_REPORT_ADDED') return {reportId: makeId('fund-update'), summary: form.note.trim(), reportDigest: await noteDigest(form.note), periodStart: addDays(now, -30), periodEnd: now.toISOString()};
  if (key === 'COMMUNITY_FUND_CLOSED') return {recordId: makeId('fund-record')};
  throw new Error('This group action is unavailable.');
}

function needsForm(key: NamedModeActionKey): boolean {
  return amountField(key) !== null || referenceField(key) !== null || noteField(key) !== null || recipientField(key) !== null || ['EMERGENCY_POLICY_SET', 'COMMUNITY_POLICY_SET', 'CIRCLE_RULES_SET', 'CIRCLE_CONTRIBUTION_DELAYED'].includes(key);
}

function amountField(key: NamedModeActionKey): string | null {
  if (['SPEND_TRANSACTION_IMPORTED','SPEND_TRANSACTION_REFUNDED','SPEND_TRANSACTION_REVERSED','CIRCLE_RULES_SET','CIRCLE_CONTRIBUTION_CORRECTED','EMERGENCY_REQUEST_OPENED','EMERGENCY_CONTRIBUTION_RECORDED','EMERGENCY_RELEASE_CORRECTED','COMMUNITY_CONTRIBUTION_RECORDED','COMMUNITY_PROPOSAL_CREATED','COMMUNITY_PROPOSAL_AMENDED'].includes(key)) return key.includes('PROPOSAL') ? 'Proposed amount' : key === 'EMERGENCY_REQUEST_OPENED' ? 'Support target' : key === 'EMERGENCY_RELEASE_CORRECTED' ? 'Corrected amount' : 'Amount';
  return null;
}

function referenceField(key: NamedModeActionKey): string | null {
  return ['SPEND_TRANSACTION_IMPORTED','SPEND_TRANSACTION_REFUNDED','SPEND_TRANSACTION_REVERSED','SPEND_SETTLED_ADJUSTMENT_CONFIRMED','CIRCLE_CONTRIBUTION_RECORDED','CIRCLE_PAYOUT_RECORDED','EMERGENCY_CONTRIBUTION_RECORDED','EMERGENCY_RELEASE_RECORDED','EMERGENCY_RELEASE_CORRECTED','COMMUNITY_CONTRIBUTION_RECORDED','COMMUNITY_RELEASE_RECORDED'].includes(key) ? 'Payment reference' : null;
}

function noteField(key: NamedModeActionKey): string | null {
  if (['SPEND_TRANSACTION_REFUNDED','SPEND_TRANSACTION_REVERSED','CIRCLE_CONTRIBUTION_DELAYED','CIRCLE_CONTRIBUTION_DEFAULTED','CIRCLE_CONTRIBUTION_CORRECTED','EMERGENCY_RELEASE_DISPUTED','EMERGENCY_RELEASE_CORRECTED','COMMUNITY_PROPOSAL_CREATED','COMMUNITY_PROPOSAL_AMENDED','COMMUNITY_PROPOSAL_REJECTED','COMMUNITY_REPORT_ADDED'].includes(key)) return key.startsWith('COMMUNITY_PROPOSAL') ? 'Proposal' : key === 'COMMUNITY_REPORT_ADDED' ? 'Update' : key.startsWith('SPEND_') ? 'What changed?' : 'Short note';
  return null;
}

function recipientField(key: NamedModeActionKey): string | null {
  if (key === 'EMERGENCY_REQUEST_OPENED') return 'Who should receive support?';
  if (key === 'COMMUNITY_PROPOSAL_CREATED') return 'Who should receive the payment?';
  if (key === 'COMMUNITY_STEWARD_HANDOFF_PROPOSED') return 'Next steward';
  return null;
}

function formReady(key: NamedModeActionKey, form: FormValues): boolean {
  if (key === 'SPEND_RECEIPT_REVIEWED') return true;
  if (amountField(key) && !(Number(form.amount) > 0)) return false;
  if (referenceField(key) && !form.reference.trim()) return false;
  if (noteField(key) && !form.note.trim() && !['CIRCLE_CONTRIBUTION_DELAYED','CIRCLE_CONTRIBUTION_DEFAULTED','CIRCLE_CONTRIBUTION_CORRECTED'].includes(key)) return false;
  if (recipientField(key) && !form.recipientId) return false;
  if (key === 'SPEND_TRANSACTION_IMPORTED' && !form.merchant.trim()) return false;
  if (['EMERGENCY_POLICY_SET','COMMUNITY_POLICY_SET'].includes(key) && !(Number(form.threshold) >= 1)) return false;
  if (key === 'CIRCLE_RULES_SET' && !(Number(form.cadence) >= 1)) return false;
  if (key === 'CIRCLE_CONTRIBUTION_DELAYED' && Number.isNaN(Date.parse(form.until))) return false;
  return true;
}

function initialForm(memberIds: string[], actorId: string | null): FormValues {
  const recipientId = memberIds.find(id => id !== actorId) ?? memberIds[0] ?? '';
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return {amount: '', reference: '', note: '', merchant: '', recipientId, threshold: String(Math.max(1, Math.ceil(memberIds.length / 2))), cadence: '30', until: localDateTime(tomorrow)};
}

function action(key: ModeWorkflowEventTypeV1, context?: Record<string, string | number>): NamedModeWorkspaceAction {
  return {key, label: MODE_UI_EVENT_LABELS[key], ...(context ? {context} : {})};
}

function model(headline: string, support: string, primary: NamedModeWorkspaceAction, secondary: NamedModeWorkspaceAction[] = [], status: string[] = []): NamedModeWorkspaceModel {
  return {headline, support, primary, secondary: uniqueActions(secondary.filter(row => row.key !== primary.key)), status};
}

function waiting(headline: string, support: string, secondary: NamedModeWorkspaceAction[] = []): NamedModeWorkspaceModel {
  return {headline, support, primary: null, secondary: uniqueActions(secondary), status: []};
}

function uniqueActions(actions: NamedModeWorkspaceAction[]): NamedModeWorkspaceAction[] {
  return [...new Map(actions.map(row => [`${row.key}:${JSON.stringify(row.context ?? {})}`, row])).values()];
}

function circleRoundStatus(round: SavingsCircleRoundV1, dueCount: number): string[] {
  const received = Object.values(round.contributions).filter(row => row.status === 'received').length;
  const delayed = Object.values(round.contributions).filter(row => row.status === 'delayed').length;
  const missed = Object.values(round.contributions).filter(row => row.status === 'defaulted').length;
  return [`${received} of ${dueCount - 1} contributions confirmed`, ...(delayed ? [`${delayed} delayed`] : []), ...(missed ? [`${missed} missed and still visible`] : [])];
}

function emergencyStatus(request: EmergencyRequestV1, threshold: number): string[] {
  const received = Object.values(request.contributions).filter(row => row.status === 'received').length;
  return [`${received} contributions confirmed`, `${request.approvedBy.length} of ${threshold} approvals`];
}

function emergencyCorrectionStatus(request: EmergencyRequestV1, threshold: number): string[] {
  return [`${request.correctionApprovedBy.length} of ${threshold} correction approvals`, `${request.releaseHistory.length + 1} release record${request.releaseHistory.length === 0 ? '' : 's'} preserved`];
}

function communityStatus(fund: NonNullable<NonNullable<CanonicalGroupStateV1['modeState']>['communityFund']>): string[] {
  return [`${Object.values(fund.contributions).filter(row => row.status === 'received').length} contributions confirmed`, `${Object.values(fund.proposals).filter(row => row.status === 'confirmed').length} payments confirmed`];
}

function requiredRound(state: CanonicalGroupStateV1, roundId: string): SavingsCircleRoundV1 {
  const round = state.modeState?.savingsCircle?.activeRound;
  if (!round || round.roundId !== roundId) throw new Error('This round is no longer open.');
  return round;
}

function requiredProposal(state: CanonicalGroupStateV1, proposalId: string): CommunityProposalV1 {
  const proposal = state.modeState?.communityFund?.proposals[proposalId];
  if (!proposal) throw new Error('This proposal is missing.');
  return proposal;
}

function decimalMoney(value: string, currency: string): MoneyV1 {
  return moneyFromDecimal(value.trim(), currency, currency === 'PAS' ? 18 : 2);
}

function cloneMoney(value: MoneyV1 | undefined): MoneyV1 {
  if (!value) throw new Error('The accepted amount is missing.');
  return {...value};
}

function sum(values: MoneyV1[], partition: MoneyV1): MoneyV1 {
  const total = values.reduce((minor, value) => {
    if (value.currency !== partition.currency || value.exponent !== partition.exponent) throw new Error('Amounts use different currencies.');
    return minor + BigInt(value.minorUnits);
  }, 0n);
  return moneyFromMinorUnits(total, partition.currency, partition.exponent);
}

/** Preserve the prior split proportions using deterministic largest remainders. */
export function proportionalExpenseAllocations(state: CanonicalGroupStateV1, expenseId: string, nextTotal: MoneyV1): MoneyAllocationV1[] {
  const expense = state.expenses[expenseId];
  if (!expense) throw new Error('The connected group expense is missing.');
  if (expense.total.currency !== nextTotal.currency || expense.total.exponent !== nextTotal.exponent) throw new Error('The connected group expense uses a different currency.');
  const shares = Object.values(state.shares)
    .filter(share => share.expenseId === expenseId)
    .sort((left, right) => left.participantId.localeCompare(right.participantId));
  if (shares.length === 0) throw new Error('The connected group expense has no shares to correct.');
  const oldTotal = shares.reduce((total, share) => total + BigInt(share.amount.minorUnits), 0n);
  if (oldTotal <= 0n) throw new Error('The connected group expense has no positive split to preserve.');
  const desired = BigInt(nextTotal.minorUnits);
  const rows = shares.map(share => {
    if (share.amount.currency !== nextTotal.currency || share.amount.exponent !== nextTotal.exponent) throw new Error('The connected group expense uses a different currency.');
    const scaled = desired * BigInt(share.amount.minorUnits);
    return {participantId: share.participantId, minorUnits: scaled / oldTotal, remainder: scaled % oldTotal};
  });
  let undistributed = desired - rows.reduce((total, row) => total + row.minorUnits, 0n);
  for (const row of [...rows].sort((left, right) => left.remainder === right.remainder
    ? left.participantId.localeCompare(right.participantId)
    : left.remainder > right.remainder ? -1 : 1)) {
    if (undistributed === 0n) break;
    row.minorUnits += 1n;
    undistributed -= 1n;
  }
  return rows.map(row => ({participantId: row.participantId, amount: moneyFromMinorUnits(row.minorUnits, nextTotal.currency, nextTotal.exponent)}));
}

function displayMoney(value: MoneyV1): string {
  return `${value.currency} ${moneyToDecimal(value)}`;
}

function referenceDigest(value: string): Promise<string> {
  if (!value.trim()) throw new Error('Add the payment reference first.');
  return sha256Hex(`chopdot:payment-reference:${value.trim()}`);
}

function noteDigest(value: string): Promise<string> {
  if (!value.trim()) throw new Error('Add a short note first.');
  return sha256Hex(`chopdot:bounded-note:${value.trim()}`);
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`.replace(/[^0-9a-z_-]/giu, '-').slice(0, 128);
}

function addDays(date: Date, days: number): string {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function localDateTime(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function message(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

function MoneyField({label, value, currency, onChange}: {label: string; value: string; currency: string; onChange: (value: string) => void}) {
  return (
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">{label}
      <div className="mt-2 flex min-h-11 items-center border-b-2 border-gray-300 pb-3 focus-within:border-[#e6007a] dark:border-gray-700">
        <span className="mr-2 text-2xl text-gray-700 dark:text-gray-300">{getCurrencySymbol(currency)}</span>
        <input aria-label={label} inputMode="decimal" value={value} onChange={event => onChange(event.target.value)} placeholder="0.00" className="min-h-11 min-w-0 flex-1 bg-transparent text-4xl font-bold tracking-[-0.04em] text-gray-950 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-600" />
      </div>
    </label>
  );
}

function TextField({label, value, onChange, placeholder}: {label: string; value: string; onChange: (value: string) => void; placeholder: string}) {
  return (
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">{label}
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-2 min-h-12 w-full border-b-2 border-gray-300 bg-transparent text-lg font-semibold text-gray-950 outline-none focus:border-[#e6007a] dark:border-gray-700 dark:text-white" />
    </label>
  );
}

export function allModeEventsHaveUiLabels(): boolean {
  return MODE_WORKFLOW_EVENT_TYPES_V1.every(type => Boolean(MODE_UI_EVENT_LABELS[type]));
}
