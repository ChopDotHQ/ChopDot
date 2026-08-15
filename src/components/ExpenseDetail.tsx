import {useMemo, useState} from 'react';
import {useAppState} from '../state/AppStateContext';
import type {Expense, Split} from '../types';
import {BottomAction, Button, MoneyAmount, Screen, ScreenContent, ScreenHeader} from './primitives';

export function ExpenseDetail({expenseId, onBack}: {expenseId: string; onBack: () => void}) {
  const {state, dispatch} = useAppState();
  const expense = state.expenses[expenseId];
  const group = expense ? state.groups[expense.groupId] : undefined;
  const existingSplits = useMemo(
    () => Object.values(state.splits).filter(split => split.expenseId === expenseId),
    [state.splits, expenseId],
  );
  const [editing, setEditing] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [paidByUserId, setPaidByUserId] = useState(expense?.paidByUserId ?? '');
  const [date, setDate] = useState(expense?.date.slice(0, 10) ?? '');
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(existingSplits.map(split => [split.userId, String(split.amount)])),
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!expense || !group) return null;

  const participants = group.memberIds
    .map(userId => state.users[userId])
    .filter(Boolean);
  const isAdjustment = expense.kind === 'adjustment';
  const isEditable = !isAdjustment && existingSplits.every(split =>
    split.userId === expense.paidByUserId
      ? (split.status === 'open' || split.status === 'confirmed') && !split.walletPayment
      : split.status === 'open',
  );
  const hasPaymentActivity = existingSplits.some(split =>
    split.userId !== expense.paidByUserId
    && (split.status === 'marked_paid' || split.status === 'confirmed' || Boolean(split.walletPayment)),
  );
  const payer = state.users[expense.paidByUserId];
  const correctionEvents = Object.values(state.activityEvents).filter(event =>
    event.type === 'expense_correction_recorded' && event.details?.expenseId === expense.id,
  );
  const relatedAdjustments = (Object.values(state.expenses) as Expense[]).filter(item =>
    item.kind === 'adjustment' && item.relatedExpenseId === expense.id,
  );
  const formOpen = editing || correcting;

  const resetDraft = () => {
    setDescription(expense.description);
    setAmount(String(expense.amount));
    setPaidByUserId(expense.paidByUserId);
    setDate(expense.date.slice(0, 10));
    setSplitAmounts(Object.fromEntries(existingSplits.map(split => [split.userId, String(split.amount)])));
    setError(null);
  };

  const closeForm = () => {
    resetDraft();
    setEditing(false);
    setCorrecting(false);
  };

  const toggleParticipant = (userId: string) => {
    setSplitAmounts(current => {
      if (current[userId] !== undefined) {
        const next = {...current};
        delete next[userId];
        return next;
      }
      return {...current, [userId]: '0'};
    });
  };

  const handleSave = () => {
    const parsedAmount = Number(amount);
    if (!description.trim()) {
      setError('Add a description.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (!paidByUserId || !group.memberIds.includes(paidByUserId)) {
      setError('Choose who paid.');
      return;
    }
    if (correcting && paidByUserId !== expense.paidByUserId) {
      setError('Who paid cannot change after a request or payment has started.');
      return;
    }

    const selected = Object.entries(splitAmounts);
    if (selected.length === 0) {
      setError('Choose at least one participant.');
      return;
    }

    const parsedSplits = selected.map(([userId, value]) => ({userId, amount: Number(value)}));
    if (parsedSplits.some(split => !Number.isFinite(split.amount) || split.amount < 0)) {
      setError('Every share must be a valid amount.');
      return;
    }
    const total = parsedSplits.reduce((sum, split) => sum + split.amount, 0);
    if (Math.abs(total - parsedAmount) >= 1e-9) {
      setError(`Shares must add up to ${parsedAmount}.`);
      return;
    }

    const nextExpense: Expense = {
      ...expense,
      description: description.trim(),
      amount: parsedAmount,
      paidByUserId,
      date: date ? `${date}T12:00:00.000Z` : expense.date,
    };
    const nextSplits: Split[] = parsedSplits.map(split => {
      const existing = existingSplits.find(item => item.userId === split.userId);
      return {
        id: existing?.id ?? `${expense.id}-${split.userId}`,
        expenseId: expense.id,
        userId: split.userId,
        amount: split.amount,
        status: split.userId === paidByUserId ? 'confirmed' : 'open',
      };
    });

    if (correcting) {
      const correctionId = makeId('correction');
      const replacementRequests: Record<string, {requestId: string}> = {};
      for (const split of existingSplits) {
        const proposed = nextSplits.find(item => item.userId === split.userId);
        if (split.status === 'request_sent' && proposed && proposed.amount > 0 && !hasPaymentActivity) {
          replacementRequests[split.userId] = {requestId: makeId('request')};
        }
      }
      dispatch({
        type: 'CORRECT_EXPENSE',
        payload: {
          expense: nextExpense,
          splits: nextSplits,
          correctionId,
          occurredAt: new Date().toISOString(),
          replacementRequests,
        },
      });
      setNotice(
        hasPaymentActivity
          ? 'Correction recorded. Existing payment history was preserved and any difference is shown as an adjustment.'
          : 'Correction recorded. The previous request was replaced with the corrected amount.',
      );
      setCorrecting(false);
    } else {
      dispatch({type: 'UPDATE_EXPENSE', payload: {expense: nextExpense, splits: nextSplits}});
      setEditing(false);
      setNotice('Expense updated.');
    }
    setError(null);
  };

  if (formOpen) {
    return (
      <Screen>
        <ScreenHeader title={correcting ? 'Correct expense' : 'Edit expense'} onBack={closeForm} />
        <ScreenContent className="p-6 space-y-5">
          {correcting && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              {hasPaymentActivity
                ? 'Payment activity already exists. ChopDot will keep that history and create an adjustment for any difference.'
                : 'A payment request is already live. Saving will invalidate that request and replace it with the corrected amount.'}
            </div>
          )}

          <Field label="Description">
            <input
              value={description}
              onChange={event => setDescription(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
            />
          </Field>

          <Field label="Amount">
            <input
              inputMode="decimal"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
            />
          </Field>

          <Field label="Paid by">
            <select
              value={paidByUserId}
              onChange={event => setPaidByUserId(event.target.value)}
              disabled={correcting}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-60"
            >
              {participants.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            {correcting && <p className="text-xs text-gray-500 dark:text-gray-400">Who paid is locked once payment activity starts.</p>}
          </Field>

          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={event => setDate(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
            />
          </Field>

          <div className="space-y-2">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Split</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Choose who participated and enter each share.</p>
            </div>
            {participants.map(user => {
              const included = splitAmounts[user.id] !== undefined;
              return (
                <div key={user.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={() => toggleParticipant(user.id)}
                    aria-label={`Include ${user.name}`}
                    className="w-5 h-5"
                  />
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{user.name}</span>
                  {included && (
                    <input
                      inputMode="decimal"
                      value={splitAmounts[user.id]}
                      onChange={event => setSplitAmounts(current => ({...current, [user.id]: event.target.value}))}
                      aria-label={`${user.name} share`}
                      className="w-24 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-right text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
        </ScreenContent>
        <BottomAction>
          <Button onClick={handleSave} fullWidth>{correcting ? 'Record correction' : 'Save changes'}</Button>
          <Button variant="muted" onClick={closeForm} fullWidth>Cancel</Button>
        </BottomAction>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={isAdjustment ? 'Adjustment' : 'Expense'} onBack={onBack} />
      <ScreenContent className="p-6 space-y-5">
        {notice && (
          <p role="status" className="rounded-2xl bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-800 dark:text-green-200">
            {notice}
          </p>
        )}

        <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">{expense.description}</p>
          <div className="mt-1 text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            <MoneyAmount amount={expense.amount} currency={expense.currency ?? state.currency} />
          </div>
          {isAdjustment && <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">Correction adjustment · historical record</p>}
        </div>

        <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4 shadow-sm">
          <DetailRow label={isAdjustment ? 'Credited by' : 'Paid by'} value={payer?.name ?? 'Unknown'} />
          <DetailRow label="Date" value={new Date(expense.date).toLocaleDateString()} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Split</p>
            <div className="space-y-2">
              {existingSplits.map(split => (
                <div key={split.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{state.users[split.userId]?.name ?? 'Unknown'}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    <MoneyAmount amount={split.amount} currency={expense.currency ?? state.currency} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {!isAdjustment && !isEditable && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            This expense already has payment activity. You can still correct it, but ChopDot will preserve the existing request/payment history.
          </div>
        )}

        {correctionEvents.length > 0 && (
          <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-2 shadow-sm">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Corrections</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {correctionEvents.length === 1 ? '1 correction recorded.' : `${correctionEvents.length} corrections recorded.`} Original payment history is preserved.
            </p>
            {relatedAdjustments.length > 0 && (
              <div className="pt-2 space-y-2">
                {relatedAdjustments.map(adjustment => (
                  <div key={adjustment.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">{adjustment.description}</span>
                    <span className="font-semibold text-gray-900 dark:text-white"><MoneyAmount amount={adjustment.amount} currency={adjustment.currency ?? state.currency} /></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {confirmDelete && (
          <div className="rounded-3xl border border-red-200 dark:border-red-900 bg-white dark:bg-gray-900 p-5 space-y-3">
            <p className="font-semibold text-gray-900 dark:text-white">Delete this expense?</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">This removes the expense and its open shares from the group.</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(false)} fullWidth>Keep it</Button>
              <button
                type="button"
                onClick={() => {
                  dispatch({type: 'DELETE_EXPENSE', payload: {expenseId: expense.id}});
                  onBack();
                }}
                className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </ScreenContent>

      {isEditable && !confirmDelete && (
        <BottomAction>
          <Button onClick={() => setEditing(true)} fullWidth>Edit expense</Button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full py-3 text-sm font-semibold text-red-600"
          >
            Delete expense
          </button>
        </BottomAction>
      )}

      {!isAdjustment && !isEditable && (
        <BottomAction>
          <Button onClick={() => setCorrecting(true)} fullWidth>Correct expense</Button>
        </BottomAction>
      )}
    </Screen>
  );
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
      {children}
    </label>
  );
}

function DetailRow({label, value}: {label: string; value: string}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">{value}</span>
    </div>
  );
}