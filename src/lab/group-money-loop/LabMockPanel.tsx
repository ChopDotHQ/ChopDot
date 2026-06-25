import type { ReactNode } from 'react';
import type {
  CatchMockKind,
  CatchSolutionId,
  HistoryMockKind,
  HistorySolutionId,
  ManagementMockKind,
  ManagementSolutionId,
  PayoutMockKind,
  PayoutSolutionId,
} from './types';

type LabMockPanelProps = {
  catch?: { kind: CatchMockKind; solutionId?: CatchSolutionId };
  management?: { kind: ManagementMockKind; solutionId?: ManagementSolutionId };
  payout?: { kind: PayoutMockKind; solutionId?: PayoutSolutionId };
  history?: { kind: HistoryMockKind; solutionId?: HistorySolutionId };
};

export function LabMockPanel({ catch: catchMock, management, payout, history }: LabMockPanelProps) {
  if (catchMock) {
    return <CatchMocks kind={catchMock.kind} solutionId={catchMock.solutionId} />;
  }
  if (management) {
    return <ManagementMocks kind={management.kind} solutionId={management.solutionId} />;
  }
  if (payout) {
    return <PayoutMocks kind={payout.kind} solutionId={payout.solutionId} />;
  }
  if (history) {
    return <HistoryMocks kind={history.kind} solutionId={history.solutionId} />;
  }
  return null;
}

function Label({ id, text }: { id: string; text: string }) {
  return (
    <p className="text-[10px] uppercase tracking-wide opacity-80">
      {id} · {text}
    </p>
  );
}

function CatchMocks({
  kind,
  solutionId,
}: {
  kind: CatchMockKind;
  solutionId?: CatchSolutionId;
}) {
  if (kind === 'sheet-retype') {
    return (
      <Panel border="red">
        {solutionId && <Label id={solutionId} text="reject" />}
        <p className="text-xs">Sheet retype — two truths diverge.</p>
      </Panel>
    );
  }
  if (kind === 'card-group-picker') {
    return (
      <Panel border="emerald">
        {solutionId && <Label id={solutionId} text="L3" />}
        <p className="text-sm font-medium">€47 · Coop</p>
        <ChipRow items={['Roommates', 'Summer trip', 'Personal']} accentIdx={1} />
      </Panel>
    );
  }
  return (
    <Panel border="sky">
      {solutionId && <Label id={solutionId} text="L0" />}
      <p className="text-xs opacity-80">Bot draft → [Confirm] [Edit]</p>
    </Panel>
  );
}

function ManagementMocks({
  kind,
  solutionId,
}: {
  kind: ManagementMockKind;
  solutionId?: ManagementSolutionId;
}) {
  if (kind === 'balance-only-trap') {
    return (
      <Panel border="red">
        {solutionId && <Label id={solutionId} text="M15 reject" />}
        <p className="text-sm">Net: Sam owes Alex €40</p>
        <p className="text-xs text-red-200/80">Hides 2 unconfirmed legs — Splitwise stop</p>
      </Panel>
    );
  }
  if (kind === 'open-legs-board') {
    return (
      <Panel border="sky">
        {solutionId && <Label id={solutionId} text="open items" />}
        <ul className="text-xs space-y-1">
          <li>● Jordan → Alex €40 · <strong>claimed</strong></li>
          <li>● Sam → Alex €20 · <strong>open</strong></li>
        </ul>
        <p className="text-[10px] opacity-60">2 open · next: Alex confirm Jordan</p>
      </Panel>
    );
  }
  if (kind === 'claimed-not-confirmed') {
    return (
      <Panel border="amber">
        {solutionId && <Label id={solutionId} text="spine" />}
        <p className="text-xs">Chat: &quot;I Venmo&apos;d you&quot; ≠ pot: confirmed</p>
      </Panel>
    );
  }
  if (kind === 'status-pin') {
    return (
      <Panel border="violet">
        {solutionId && <Label id={solutionId} text="pinned /status" />}
        <p className="text-xs font-mono">Summer trip · 2 open · Alex acts next</p>
      </Panel>
    );
  }
  return (
    <Panel border="sky">
      {solutionId && <Label id={solutionId} text="nudge" />}
      <p className="text-xs">@Jordan — confirm €40 to Alex? [/confirm]</p>
    </Panel>
  );
}

function PayoutMocks({
  kind,
  solutionId,
}: {
  kind: PayoutMockKind;
  solutionId?: PayoutSolutionId;
}) {
  if (kind === 'close-blocked') {
    return (
      <Panel border="red">
        {solutionId && <Label id={solutionId} text="gate" />}
        <p className="text-xs">/close blocked — 1 open leg remaining</p>
      </Panel>
    );
  }
  if (kind === 'deep-link-pay') {
    return (
      <Panel border="emerald">
        {solutionId && <Label id={solutionId} text="deep link" />}
        <p className="text-xs font-mono truncate">twint://pay?amount=40&memo=leg_8f2a</p>
        <p className="text-[10px] opacity-60">Then receiver /confirm</p>
      </Panel>
    );
  }
  return (
    <Panel border="sky">
      {solutionId && <Label id={solutionId} text="confirm loop" />}
      <p className="text-xs">Jordan: /paid €40 · Alex: /confirm from Jordan</p>
    </Panel>
  );
}

function HistoryMocks({
  kind,
  solutionId,
}: {
  kind: HistoryMockKind;
  solutionId?: HistorySolutionId;
}) {
  if (kind === 'close-gate') {
    return (
      <Panel border="amber">
        {solutionId && <Label id={solutionId} text="reject" />}
        <p className="text-xs">TG export only — no structured handoff</p>
      </Panel>
    );
  }
  if (kind === 'optional-seal') {
    return (
      <Panel border="violet">
        {solutionId && <Label id={solutionId} text="L2 optional" />}
        <p className="text-xs">[Seal onchain] · hash 0x8a2… · optional</p>
      </Panel>
    );
  }
  return (
    <Panel border="emerald">
      {solutionId && <Label id={solutionId} text="close pack" />}
      <p className="text-xs font-mono">summer-trip-2026.chopdot.json (24 KB)</p>
      <p className="text-[10px] opacity-60">PDF + CSV siblings · emailed to group</p>
    </Panel>
  );
}

function Panel({
  border,
  children,
}: {
  border: 'sky' | 'emerald' | 'red' | 'amber' | 'violet';
  children: ReactNode;
}) {
  const colors = {
    sky: 'border-[#2AABEE]/40 bg-[#2AABEE]/10 text-[#2AABEE]',
    emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    red: 'border-red-500/40 bg-red-500/10 text-red-300',
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    violet: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  };
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${colors[border]}`}>{children}</div>
  );
}

function ChipRow({ items, accentIdx }: { items: string[]; accentIdx?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span
          key={item}
          className={`text-xs px-3 py-1 rounded-full ${
            i === accentIdx ? 'bg-[#2AABEE] text-white' : 'bg-white/10 border border-white/20'
          }`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
