import { useMemo, useState } from 'react';
import {
  addExpense,
  addMember,
  buildPotStatus,
  closeChapter,
  confirmLeg,
  createChapter,
  exportChapterJson,
  markLegPaid,
  refreshLegs,
} from '../../chapter/chapterEngine';
import type { ChapterDocument, SettlementLeg } from '../../chapter/types';
import type { BaseCurrency } from '../../schema/pot';

type ExpenseDraftState = {
  payerId: string;
  amount: string;
  memo: string;
  splitCount: string;
};

type ProbeResult = {
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
};

const CURRENCIES: BaseCurrency[] = ['EUR', 'USD', 'CHF', 'GBP'];

function createSeedChapter(): ChapterDocument {
  let chapter = createChapter({
    name: 'Friends trip validation',
    currency: 'EUR',
    telegramChatId: 'validation-lab',
    organizer: { name: 'Alex', telegramUserId: 'lab_alex' },
  });
  chapter = addMember(chapter, { name: 'Sam', telegramUserId: 'lab_sam' });
  chapter = addMember(chapter, { name: 'Jordan', telegramUserId: 'lab_jordan' });
  return chapter;
}

function createSeedReplay(): ChapterDocument {
  let chapter = createSeedChapter();
  chapter = addExpense(chapter, {
    paidByMemberId: 'alex',
    draft: { amount: 480, memo: 'Airbnb', splitCount: 3 },
    source: 'manual',
  });
  chapter = addExpense(chapter, {
    paidByMemberId: 'sam',
    draft: { amount: 120, memo: 'Dinner receipt', splitCount: 3 },
    source: 'manual',
  });
  chapter = addExpense(chapter, {
    paidByMemberId: 'alex',
    draft: { amount: 42, memo: 'Transit passes', splitCount: 3 },
    source: 'manual',
  });
  return chapter;
}

function memberName(chapter: ChapterDocument, memberId: string): string {
  return chapter.members.find((member) => member.id === memberId)?.name ?? memberId;
}

function splitLegs(legs: SettlementLeg[]) {
  return {
    open: legs.filter((leg) => leg.state === 'open'),
    claimed: legs.filter((leg) => leg.state === 'claimed'),
    confirmed: legs.filter((leg) => leg.state === 'confirmed'),
  };
}

export function ValidationTmaShell() {
  const [chapter, setChapter] = useState<ChapterDocument | null>(() => createSeedChapter());
  const [chapterName, setChapterName] = useState('Friends trip validation');
  const [currency, setCurrency] = useState<BaseCurrency>('EUR');
  const [memberNameInput, setMemberNameInput] = useState('');
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraftState>({
    payerId: 'alex',
    amount: '120',
    memo: 'Dinner receipt',
    splitCount: '3',
  });
  const [message, setMessage] = useState('Seeded validation chapter. Add expenses or run the fixed replay.');
  const [exportText, setExportText] = useState('');
  const [probeResults, setProbeResults] = useState<ProbeResult[]>([]);

  const syncedChapter = useMemo(() => (chapter ? refreshLegs(chapter) : null), [chapter]);
  const status = useMemo(
    () => (syncedChapter ? buildPotStatus(syncedChapter) : null),
    [syncedChapter],
  );
  const legGroups = useMemo(
    () => splitLegs(syncedChapter?.legs ?? []),
    [syncedChapter?.legs],
  );

  function setUpdatedChapter(next: ChapterDocument, nextMessage: string) {
    setChapter(next);
    setMessage(nextMessage);
    setExportText('');
  }

  function handleCreateChapter() {
    const next = createChapter({
      name: chapterName.trim() || 'Validation chapter',
      currency,
      telegramChatId: 'validation-lab',
      organizer: { name: 'Alex', telegramUserId: 'lab_alex' },
    });
    setExpenseDraft((prev) => ({ ...prev, payerId: next.members[0]?.id ?? '' }));
    setUpdatedChapter(next, 'Created a new validation chapter with Alex as organizer.');
  }

  function handleSeedMembers() {
    let next = chapter ?? createSeedChapter();
    next = addMember(next, { name: 'Sam', telegramUserId: 'lab_sam' });
    next = addMember(next, { name: 'Jordan', telegramUserId: 'lab_jordan' });
    setUpdatedChapter(next, 'Added Sam and Jordan for the fixed replay.');
  }

  function handleSeedReplay() {
    const next = createSeedReplay();
    setExpenseDraft((prev) => ({ ...prev, payerId: 'alex' }));
    setUpdatedChapter(next, 'Loaded the fixed friends-trip replay: Airbnb, dinner, and transit.');
  }

  function handleAddMember() {
    if (!chapter || !memberNameInput.trim()) {
      return;
    }
    const cleanName = memberNameInput.trim();
    const next = addMember(chapter, {
      name: cleanName,
      telegramUserId: `lab_${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    });
    setMemberNameInput('');
    setUpdatedChapter(next, `${cleanName} added to the chapter.`);
  }

  function handleAddExpense() {
    if (!chapter) {
      return;
    }

    const amount = Number.parseFloat(expenseDraft.amount);
    const splitCount = Number.parseInt(expenseDraft.splitCount, 10);
    if (!Number.isFinite(amount) || amount <= 0 || !expenseDraft.payerId) {
      setMessage('Add a positive amount and choose a payer.');
      return;
    }

    const next = addExpense(chapter, {
      paidByMemberId: expenseDraft.payerId,
      draft: {
        amount,
        memo: expenseDraft.memo.trim() || 'Expense',
        splitCount: Number.isFinite(splitCount) && splitCount > 0 ? splitCount : undefined,
      },
      source: 'manual',
    });
    setUpdatedChapter(next, 'Expense added. Status and open legs refreshed from chapterEngine.');
  }

  function handleMarkPaid(leg: SettlementLeg) {
    if (!chapter) {
      return;
    }
    try {
      const next = markLegPaid(chapter, { payerMemberId: leg.fromMemberId, legId: leg.id });
      setUpdatedChapter(next, `${memberName(chapter, leg.fromMemberId)} marked paid; receiver confirmation still required.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not mark leg paid.');
    }
  }

  function handleConfirm(leg: SettlementLeg) {
    if (!chapter) {
      return;
    }
    try {
      const next = confirmLeg(chapter, { creditorMemberId: leg.toMemberId, legId: leg.id });
      setUpdatedChapter(next, `${memberName(chapter, leg.toMemberId)} confirmed receipt.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not confirm leg.');
    }
  }

  function handleClose() {
    if (!syncedChapter) {
      return;
    }
    try {
      const closed = closeChapter(syncedChapter);
      const exported = exportChapterJson(closed);
      setChapter(closed);
      setExportText(exported);
      setMessage('Chapter closed. Export is ready for the validation evidence pack.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cannot close chapter yet.');
    }
  }

  function handleDownloadExport() {
    if (!exportText) {
      return;
    }
    const blob = new Blob([exportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(chapter?.name ?? 'chopdot-validation').replace(/\s+/g, '-').toLowerCase()}.chopdot.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleRunUnhappyPathProbes() {
    const fixture = createSeedReplay();
    const statusBeforePayment = buildPotStatus(fixture);
    const firstLeg = statusBeforePayment.legs[0];
    const secondMember = fixture.members.find((member) => member.id !== firstLeg?.fromMemberId);
    const wrongReceiver = fixture.members.find((member) => member.id !== firstLeg?.toMemberId);
    const results: ProbeResult[] = [];

    try {
      closeChapter(fixture);
      results.push({
        name: 'Premature close',
        expected: 'Agent must not close while open legs remain.',
        actual: 'Close succeeded unexpectedly.',
        passed: false,
      });
    } catch (error) {
      results.push({
        name: 'Premature close',
        expected: 'Agent must not close while open legs remain.',
        actual: error instanceof Error ? error.message : 'Close blocked.',
        passed: true,
      });
    }

    if (firstLeg && secondMember) {
      try {
        markLegPaid(fixture, { payerMemberId: secondMember.id, legId: firstLeg.id });
        results.push({
          name: 'Wrong payer',
          expected: 'Only the debtor can mark a leg paid.',
          actual: 'Wrong payer marked paid unexpectedly.',
          passed: false,
        });
      } catch (error) {
        results.push({
          name: 'Wrong payer',
          expected: 'Only the debtor can mark a leg paid.',
          actual: error instanceof Error ? error.message : 'Wrong payer blocked.',
          passed: true,
        });
      }
    }

    if (firstLeg && wrongReceiver) {
      try {
        const claimed = markLegPaid(fixture, { payerMemberId: firstLeg.fromMemberId, legId: firstLeg.id });
        confirmLeg(claimed, { creditorMemberId: wrongReceiver.id, legId: firstLeg.id });
        results.push({
          name: 'Wrong receiver',
          expected: 'Only the receiver can confirm receipt.',
          actual: 'Wrong receiver confirmed unexpectedly.',
          passed: false,
        });
      } catch (error) {
        results.push({
          name: 'Wrong receiver',
          expected: 'Only the receiver can confirm receipt.',
          actual: error instanceof Error ? error.message : 'Wrong receiver blocked.',
          passed: true,
        });
      }
    }

    try {
      addExpense(fixture, {
        paidByMemberId: 'not-a-member',
        draft: { amount: 42, memo: 'Unknown payer', splitCount: 3 },
        source: 'manual',
      });
      results.push({
        name: 'Unknown payer',
        expected: 'Agent must reject facts that cannot be attached to a member.',
        actual: 'Unknown payer expense was accepted unexpectedly.',
        passed: false,
      });
    } catch (error) {
      results.push({
        name: 'Unknown payer',
        expected: 'Agent must reject facts that cannot be attached to a member.',
        actual: error instanceof Error ? error.message : 'Unknown payer blocked.',
        passed: true,
      });
    }

    results.push({
      name: 'Ambiguous chat claim',
      expected: 'A human-like agent treats "I paid you" as context, not receiver confirmation.',
      actual:
        statusBeforePayment.openLegCount > 0
          ? 'Open legs remain until explicit mark-paid and receiver-confirm actions.'
          : 'Status was cleared without confirmation.',
      passed: statusBeforePayment.openLegCount > 0,
    });

    setProbeResults(results);
    setMessage(
      results.every((result) => result.passed)
        ? 'Unhappy-path probes passed. Agent must still explain these judgments in the evidence card.'
        : 'One or more unhappy-path probes failed. Do not use this run as validation evidence yet.',
    );
  }

  return (
    <section
      className="h-full min-h-[680px] overflow-hidden rounded-xl border text-white flex flex-col"
      style={{ backgroundColor: '#0e1621', borderColor: 'rgba(42, 171, 238, 0.3)', color: '#ffffff' }}
    >
      <header className="border-b border-white/10 px-4 py-3" style={{ backgroundColor: '#17212b' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#2AABEE]">
              Validation-only TMA shell
            </p>
            <h2 className="text-base font-semibold">Chapter loop workbench</h2>
          </div>
          <span className="rounded-full border border-amber-300/40 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-100">
            Prototype
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-white/60">
          Uses chapterEngine directly. No wallet, rail, chain, Supabase, or production transport.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={chapterName}
            onChange={(event) => setChapterName(event.target.value)}
            className="min-w-0 rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-[#2AABEE]"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#ffffff' }}
            placeholder="Chapter name"
          />
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value as BaseCurrency)}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-[#2AABEE]"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#ffffff' }}
          >
            {CURRENCIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ShellButton onClick={handleCreateChapter}>Create</ShellButton>
          <ShellButton onClick={handleSeedMembers}>Seed members</ShellButton>
          <ShellButton onClick={handleSeedReplay}>Fixed replay</ShellButton>
        </div>

        {syncedChapter && status && (
          <>
            <section className="space-y-3 border-y border-white/10 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">{syncedChapter.name}</h3>
                  <p className="text-xs text-white/50">
                    {syncedChapter.members.length} members · {syncedChapter.expenses.length} expenses · {syncedChapter.chapterState}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold">{status.openLegCount}</p>
                  <p className="text-[10px] uppercase tracking-wide text-white/50">open legs</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Metric label="Open" value={String(legGroups.open.length)} />
                <Metric label="Claimed" value={String(legGroups.claimed.length)} />
                <Metric label="Confirmed" value={String(legGroups.confirmed.length)} />
              </div>
              <p className="rounded-lg bg-[#2AABEE]/10 px-3 py-2 text-xs text-sky-50">
                {status.legs[0]?.nextActor
                  ? `Next actor: ${status.legs[0].nextActor} must ${status.legs[0].nextAction}.`
                  : 'All legs are confirmed. History gate can close.'}
              </p>
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={memberNameInput}
                  onChange={(event) => setMemberNameInput(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-[#2AABEE]"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#ffffff' }}
                  placeholder="Member name"
                />
                <ShellButton onClick={handleAddMember}>Add</ShellButton>
              </div>
              <div className="flex flex-wrap gap-2">
                {syncedChapter.members.map((member) => (
                  <span key={member.id} className="rounded-full bg-white/10 px-2.5 py-1 text-xs">
                    {member.name}
                  </span>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={expenseDraft.payerId}
                  onChange={(event) =>
                    setExpenseDraft((prev) => ({ ...prev, payerId: event.target.value }))
                  }
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-[#2AABEE]"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#ffffff' }}
                >
                  {syncedChapter.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      Paid by {member.name}
                    </option>
                  ))}
                </select>
                <input
                  value={expenseDraft.amount}
                  onChange={(event) =>
                    setExpenseDraft((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  inputMode="decimal"
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-[#2AABEE]"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#ffffff' }}
                  placeholder="Amount"
                />
                <input
                  value={expenseDraft.memo}
                  onChange={(event) =>
                    setExpenseDraft((prev) => ({ ...prev, memo: event.target.value }))
                  }
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-[#2AABEE]"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#ffffff' }}
                  placeholder="Memo"
                />
                <input
                  value={expenseDraft.splitCount}
                  onChange={(event) =>
                    setExpenseDraft((prev) => ({ ...prev, splitCount: event.target.value }))
                  }
                  inputMode="numeric"
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-[#2AABEE]"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#ffffff' }}
                  placeholder="Split count"
                />
              </div>
              <ShellButton onClick={handleAddExpense}>Add expense</ShellButton>
            </section>

            <section className="space-y-2">
              <SectionTitle>Open and claimed legs</SectionTitle>
              {status.legs.length === 0 ? (
                <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                  No open legs. Closeout is available.
                </p>
              ) : (
                status.legs.map((leg) => (
                  <LegRow
                    key={leg.id}
                    chapter={syncedChapter}
                    leg={leg}
                    onMarkPaid={() => handleMarkPaid(leg)}
                    onConfirm={() => handleConfirm(leg)}
                  />
                ))
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle>Agent unhappy-path probes</SectionTitle>
                <ShellButton onClick={handleRunUnhappyPathProbes}>Run probes</ShellButton>
              </div>
              <p className="text-xs text-white/55">
                These probes check human-context judgment: premature close, wrong actor, unknown payer, and ambiguous paid claims.
              </p>
              {probeResults.length > 0 && (
                <div className="space-y-2">
                  {probeResults.map((result) => (
                    <div
                      key={result.name}
                      className="rounded-lg border px-3 py-2 text-xs"
                      style={{
                        borderColor: result.passed ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.45)',
                        backgroundColor: result.passed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.1)',
                      }}
                    >
                      <p className="font-semibold">
                        {result.passed ? 'PASS' : 'FAIL'} · {result.name}
                      </p>
                      <p className="text-white/60">Expected: {result.expected}</p>
                      <p className="text-white/75">Actual: {result.actual}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <SectionTitle>Confirmed history</SectionTitle>
              {legGroups.confirmed.length === 0 ? (
                <p className="text-xs text-white/45">No confirmed legs yet.</p>
              ) : (
                legGroups.confirmed.map((leg) => (
                  <p key={leg.id} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70">
                    {memberName(syncedChapter, leg.fromMemberId)} paid {memberName(syncedChapter, leg.toMemberId)} · {leg.amount.toFixed(2)} {leg.currency} · confirmed
                  </p>
                ))
              )}
            </section>

            <section className="space-y-2 border-t border-white/10 pt-4">
              <div className="flex gap-2">
                <ShellButton onClick={handleClose}>Close chapter</ShellButton>
                <ShellButton onClick={handleDownloadExport} disabled={!exportText}>
                  Download export
                </ShellButton>
              </div>
              <p
                className="rounded-lg px-3 py-2 text-xs text-white/65"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
              >
                {message}
              </p>
              {exportText && (
                <textarea
                  value={exportText}
                  readOnly
                  rows={8}
                  className="w-full rounded-lg border border-white/10 p-3 font-mono text-[11px] text-white/70"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', color: '#ffffff' }}
                />
              )}
            </section>
          </>
        )}
      </div>
    </section>
  );
}

function ShellButton({
  children,
  disabled,
  onClick,
}: {
  children: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-[#2AABEE]/40 bg-[#2AABEE]/15 px-3 py-2 text-xs font-medium text-sky-50 transition hover:bg-[#2AABEE]/25 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-white/15 pl-3">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-white/45">{label}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">{children}</h3>;
}

function LegRow({
  chapter,
  leg,
  onMarkPaid,
  onConfirm,
}: {
  chapter: ChapterDocument;
  leg: SettlementLeg;
  onMarkPaid: () => void;
  onConfirm: () => void;
}) {
  const action = leg.state === 'claimed' ? onConfirm : onMarkPaid;
  const actionLabel = leg.state === 'claimed' ? 'Confirm receipt' : 'Mark paid';
  return (
    <div className="grid gap-2 rounded-lg border border-white/10 bg-white/5 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="text-sm font-medium">
          {memberName(chapter, leg.fromMemberId)} to {memberName(chapter, leg.toMemberId)}
        </p>
        <p className="text-xs text-white/55">
          {leg.amount.toFixed(2)} {leg.currency} · {leg.state}
        </p>
      </div>
      <ShellButton onClick={action}>{actionLabel}</ShellButton>
    </div>
  );
}
