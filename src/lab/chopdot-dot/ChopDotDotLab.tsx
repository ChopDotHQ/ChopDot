import { useState } from 'react';
import type { DotObligation, DotParticipant, DotReleaseRequest } from '../../chopdot-dot/commitmentKernel';
import type { DotLabAgent, DotLabMode } from './dotLabScenarios';
import { createDotLabScenario, modeFromQuery } from './dotLabScenarios';
import { useDotLabState } from './useDotLabState';
import './ChopDotDotLab.css';

type ChopDotDotLabProps = {
  modeParam?: string | null;
  onExit?: () => void;
};

const modes: DotLabMode[] = ['savings_circle', 'emergency_pot', 'community_fund'];

const modeTestIds: Record<DotLabMode, string> = {
  savings_circle: 'mode-savings-circle',
  emergency_pot: 'mode-emergency-pot',
  community_fund: 'mode-community-fund',
};

function money(amount: number, currency: string): string {
  return `${amount.toLocaleString()} ${currency}`;
}

function participantName(participants: DotParticipant[], id: string): string {
  return participants.find((participant) => participant.id === id)?.name ?? id;
}

function hasRole(participant: DotParticipant | undefined, roles: DotParticipant['roles']): boolean {
  return Boolean(participant?.roles.some((role) => roles.includes(role)));
}

function modeCopy(mode: DotLabMode) {
  if (mode === 'savings_circle') {
    return {
      eyebrow: 'Savings circle',
      title: 'Run a savings circle',
      promise: 'Track this round, confirm who paid, handle delays, and close with a private record.',
      primaryNoun: 'round',
      releaseNoun: 'payout',
      closeLabel: 'Close round',
      openCloseLabel: 'Close round with note',
    };
  }
  if (mode === 'emergency_pot') {
    return {
      eyebrow: 'Emergency pot',
      title: 'Coordinate emergency help',
      promise: 'Keep support private, confirm what arrived, approve release, and export a redacted record.',
      primaryNoun: 'pot',
      releaseNoun: 'release',
      closeLabel: 'Close pot',
      openCloseLabel: 'Close pot with note',
    };
  }
  return {
    eyebrow: 'Community fund',
    title: 'Manage a community fund',
    promise: 'Track contributions, approvals, spending, and handoff without turning ChopDot into custody.',
    primaryNoun: 'fund',
    releaseNoun: 'release',
    closeLabel: 'Close period',
    openCloseLabel: 'Close period with note',
  };
}

function statusLabel(state: string): string {
  if (state === 'open') return 'Waiting';
  if (state === 'claimed') return 'Marked paid';
  if (state === 'confirmed') return 'Confirmed';
  if (state === 'exception_recorded') return 'Noted';
  if (state === 'requested') return 'Needs approval';
  if (state === 'approved') return 'Approved';
  if (state === 'claimed_released') return 'Released outside ChopDot';
  if (state === 'closed_with_open_items') return 'Closed with notes';
  return state.replace(/_/g, ' ');
}

function ModeSelector({ onSelect }: { onSelect: (mode: DotLabMode) => void }) {
  return (
    <div className="dot-product-root dot-mode-screen" data-testid="dot-lab">
      <main className="dot-mode-shell">
        <div className="dot-app-mark">ChopDot</div>
        <p className="dot-kicker">Choose the group job</p>
        <h1>What are you managing?</h1>
        <div className="dot-mode-list">
          {modes.map((mode) => {
            const scenario = createDotLabScenario(mode);
            const copy = modeCopy(mode);
            return (
              <button
                key={mode}
                type="button"
                data-testid={modeTestIds[mode]}
                onClick={() => onSelect(mode)}
                className="dot-mode-row"
              >
                <span>
                  <strong>{scenario.label}</strong>
                  <small>{copy.promise}</small>
                </span>
                <span aria-hidden="true">Open</span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function ViewAsSwitch({
  agents,
  activeAgentId,
  onChange,
}: {
  agents: DotLabAgent[];
  activeAgentId: string;
  onChange: (id: string) => void;
}) {
  return (
    <section className="dot-view-as" data-testid="active-agent">
      <p className="dot-kicker">View as</p>
      <div className="dot-person-tabs">
        {agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            className={activeAgentId === agent.id ? 'is-active' : undefined}
            onClick={() => onChange(agent.id)}
          >
            <span>{agent.name}</span>
            <small>{agent.job}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function ObligationItem({
  obligation,
  activeAgent,
  participants,
  onClaim,
  onConfirm,
  onException,
}: {
  obligation: DotObligation;
  activeAgent: DotLabAgent | undefined;
  participants: DotParticipant[];
  onClaim: () => void;
  onConfirm: () => void;
  onException: () => void;
}) {
  const participant = participants.find((item) => item.id === activeAgent?.participantId);
  const payerName = participantName(participants, obligation.fromParticipantId);
  const receiverName = participantName(participants, obligation.toParticipantId);
  const canClaim = obligation.state === 'open' && activeAgent?.participantId === obligation.fromParticipantId;
  const canConfirm =
    obligation.state === 'claimed' &&
    (activeAgent?.participantId === obligation.toParticipantId || hasRole(participant, ['organizer', 'treasurer']));
  const canNote = obligation.state === 'open' && hasRole(participant, ['organizer', 'treasurer']);

  return (
    <article className="dot-money-row" data-testid={`obligation-${obligation.id}`}>
      <div>
        <p className="dot-row-title">{payerName}</p>
        <p className="dot-row-copy">
          {money(obligation.amount, obligation.currency)} to {receiverName}
        </p>
      </div>
      <div className="dot-row-side">
        <span className={`dot-status dot-status-${obligation.state}`}>{statusLabel(obligation.state)}</span>
        <div className="dot-row-actions">
          {canClaim && (
            <button type="button" className="dot-primary-action" onClick={onClaim}>
              Mark paid
            </button>
          )}
          {canConfirm && (
            <button type="button" className="dot-primary-action" onClick={onConfirm}>
              Confirm received
            </button>
          )}
          {canNote && (
            <button type="button" onClick={onException}>
              Record delay
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ReleaseCard({
  release,
  activeAgent,
  participants,
  releaseNoun,
  onCreate,
  onApprove,
  onClaim,
  onConfirm,
}: {
  release?: DotReleaseRequest;
  activeAgent: DotLabAgent | undefined;
  participants: DotParticipant[];
  releaseNoun: string;
  onCreate: () => void;
  onApprove: () => void;
  onClaim: () => void;
  onConfirm: () => void;
}) {
  const participant = participants.find((item) => item.id === activeAgent?.participantId);
  const canCreate = !release && hasRole(participant, ['organizer', 'treasurer']);
  const canApprove = release?.state === 'requested' && hasRole(participant, ['approver', 'organizer', 'treasurer']);
  const canClaim =
    release?.state === 'approved' &&
    (release.requesterId === activeAgent?.participantId || hasRole(participant, ['organizer', 'treasurer', 'payer']));
  const canConfirm =
    release?.state === 'claimed_released' &&
    (release.recipientId === activeAgent?.participantId || hasRole(participant, ['organizer', 'treasurer']));

  return (
    <section className="dot-section" data-testid="release-panel">
      <div className="dot-section-heading">
        <div>
          <p className="dot-kicker">Money out</p>
          <h2>{release ? release.title : `Prepare ${releaseNoun}`}</h2>
        </div>
        {release && <span className={`dot-status dot-status-${release.state}`}>{statusLabel(release.state)}</span>}
      </div>
      <p className="dot-section-copy">
        {release
          ? `${money(release.amount, release.currency)} for ${participantName(participants, release.recipientId)}. ChopDot records the steps; money still moves outside ChopDot.`
          : `Start this only when the group is ready to record the ${releaseNoun}.`}
      </p>
      <div className="dot-action-strip">
        {canCreate && (
          <button type="button" className="dot-primary-action" onClick={onCreate}>
            Prepare {releaseNoun}
          </button>
        )}
        {canApprove && (
          <button type="button" className="dot-primary-action" onClick={onApprove}>
            Approve {releaseNoun}
          </button>
        )}
        {canClaim && (
          <button type="button" className="dot-primary-action" onClick={onClaim}>
            Mark released outside ChopDot
          </button>
        )}
        {canConfirm && (
          <button type="button" className="dot-primary-action" onClick={onConfirm}>
            Confirm received
          </button>
        )}
      </div>
    </section>
  );
}

function DeveloperInspector({
  lab,
}: {
  lab: ReturnType<typeof useDotLabState>;
}) {
  const { state, receipt } = lab;
  return (
    <details className="dot-inspector">
      <summary>Developer checks</summary>
      <div className="dot-inspector-grid">
        <section data-testid="token-rail">
          <h3>Test-token rail</h3>
          {state.rail.transfers.length ? (
            state.rail.transfers.map((transfer) => (
              <p key={transfer.id}>
                {transfer.state}: {money(transfer.amount, transfer.currency)}
              </p>
            ))
          ) : (
            <p>No token evidence yet.</p>
          )}
        </section>
        <section data-testid="event-history">
          <h3>Event history</h3>
          {state.events.map((event) => (
            <p key={event.id}>
              <strong>{event.label}</strong> - {event.actor}: {event.detail}
            </p>
          ))}
        </section>
        <section>
          <h3>Adversarial controls</h3>
          <div className="dot-action-strip">
            {state.chapter.obligations.map((obligation) => (
              <button key={obligation.id} type="button" onClick={() => lab.failContributionTransfer(obligation.id)}>
                Simulate failed transfer
              </button>
            ))}
            <button type="button" onClick={() => lab.tryForbidden('claim-first')}>
              Try forbidden claim
            </button>
          </div>
        </section>
        <section>
          <h3>Raw receipt</h3>
          <pre>{JSON.stringify(receipt, null, 2)}</pre>
        </section>
      </div>
    </details>
  );
}

function DotProductBoard({ mode, onBack, onExit }: { mode: DotLabMode; onBack: () => void; onExit?: () => void }) {
  const lab = useDotLabState(mode);
  const { scenario, state, status, receipt } = lab;
  const copy = modeCopy(state.mode);
  const activeId = state.activeAgent?.id ?? '';
  const release = state.chapter.releaseRequests.at(-1);
  const confirmedCount = state.chapter.obligations.filter((item) => item.state === 'confirmed').length;
  const paidOrNotedCount = state.chapter.obligations.filter(
    (item) => item.state === 'confirmed' || item.state === 'exception_recorded',
  ).length;
  const participant = state.chapter.participants.find((item) => item.id === state.activeAgent?.participantId);
  const canClose = hasRole(participant, ['organizer', 'treasurer']);
  const activeOpenObligation = state.chapter.obligations.find(
    (item) => item.state === 'open' && item.fromParticipantId === state.activeAgent?.participantId,
  );
  const activeConfirmableObligation = state.chapter.obligations.find(
    (item) =>
      item.state === 'claimed' &&
      (item.toParticipantId === state.activeAgent?.participantId || hasRole(participant, ['organizer', 'treasurer'])),
  );
  const activeNotableObligation = state.chapter.obligations.find(
    (item) => item.state === 'open' && hasRole(participant, ['organizer', 'treasurer']),
  );
  const heroAction = (() => {
    if (activeOpenObligation) {
      return {
        label: `Mark ${money(activeOpenObligation.amount, activeOpenObligation.currency)} paid`,
        onClick: () => lab.claimContribution(activeOpenObligation.id),
      };
    }
    if (activeConfirmableObligation) {
      return {
        label: `Confirm ${participantName(state.chapter.participants, activeConfirmableObligation.fromParticipantId)} paid`,
        onClick: () => lab.confirmContribution(activeConfirmableObligation.id),
      };
    }
    if (activeNotableObligation) {
      return {
        label: `Record delay for ${participantName(state.chapter.participants, activeNotableObligation.fromParticipantId)}`,
        onClick: () => lab.recordMissedContribution(activeNotableObligation.id),
      };
    }
    return null;
  })();
  const nextLine = status.nextActor
    ? `${status.nextActor} needs to ${status.nextAction ?? 'act next'}.`
    : `This ${copy.primaryNoun} is ready to close.`;

  return (
    <div className="dot-product-root" data-testid="dot-lab">
      {mode === 'savings_circle' && (
        <div data-testid="summit-banner" className="summit-banner">
          Savings circle live · Spend Cards next — same commitment engine
        </div>
      )}
      <div className="dot-product-shell">
        <header className="dot-product-top">
          <div>
            <div className="dot-app-mark">ChopDot</div>
            <p className="dot-kicker">{copy.eyebrow}</p>
            <h1>{state.chapter.name}</h1>
          </div>
          <div className="dot-top-actions">
            <button type="button" onClick={onBack}>Modes</button>
            {onExit && <button type="button" onClick={onExit}>Exit</button>}
          </div>
        </header>

        <main className="dot-product-main">
          <section className="dot-hero">
            <p className="dot-kicker">Right now</p>
            <h2>{nextLine}</h2>
            <p>{copy.promise}</p>
            <div className="dot-hero-stats">
              <span>{paidOrNotedCount}/{state.chapter.obligations.length} handled</span>
              <span data-testid="next-actor">Next: {status.nextActor ?? 'Ready'}</span>
              <span>{status.closeoutReadiness === 'ready' ? 'Can close' : 'Still open'}</span>
            </div>
            {heroAction && (
              <button type="button" className="dot-hero-action dot-primary-action" onClick={heroAction.onClick}>
                {heroAction.label}
              </button>
            )}
          </section>

          <ViewAsSwitch agents={state.agents} activeAgentId={activeId} onChange={lab.setActiveAgentId} />

          <section className="dot-section" data-testid="blockers">
            <div className="dot-section-heading">
              <div>
                <p className="dot-kicker">What is waiting</p>
                <h2>{status.blockers.length ? `${status.blockers.length} open item${status.blockers.length === 1 ? '' : 's'}` : 'Nothing is blocking closeout'}</h2>
              </div>
            </div>
            {status.blockers.length ? (
              <ul className="dot-wait-list">
                {status.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
            ) : (
              <p className="dot-section-copy">Everyone has either paid, confirmed, or has a note attached.</p>
            )}
          </section>

          <section className="dot-section">
            <div className="dot-section-heading">
              <div>
                <p className="dot-kicker">Contributions</p>
                <h2>{confirmedCount} confirmed</h2>
              </div>
            </div>
            <div className="dot-money-list">
              {state.chapter.obligations.map((obligation) => (
                <ObligationItem
                  key={obligation.id}
                  obligation={obligation}
                  activeAgent={state.activeAgent}
                  participants={state.chapter.participants}
                  onClaim={() => lab.claimContribution(obligation.id)}
                  onConfirm={() => lab.confirmContribution(obligation.id)}
                  onException={() => lab.recordMissedContribution(obligation.id)}
                />
              ))}
            </div>
          </section>

          <ReleaseCard
            release={release}
            activeAgent={state.activeAgent}
            participants={state.chapter.participants}
            releaseNoun={copy.releaseNoun}
            onCreate={lab.createRelease}
            onApprove={lab.approveRelease}
            onClaim={lab.claimRelease}
            onConfirm={lab.confirmRelease}
          />

          <section className="dot-receipt" data-testid="receipt-preview">
            <div>
              <p className="dot-kicker">Private record</p>
              <h2>{status.closeoutReadiness === 'ready' ? 'Ready to close' : 'Closeout is not ready yet'}</h2>
              <p>
                {receipt.summary.confirmedObligationCount}/{receipt.summary.obligationCount} contributions confirmed.
                {' '}
                {receipt.summary.exceptionCount > 0 ? `${receipt.summary.exceptionCount} note added.` : 'No exception notes yet.'}
              </p>
            </div>
            {canClose && (
              <div className="dot-action-strip">
                {status.closeoutReadiness === 'ready' ? (
                  <button type="button" className="dot-primary-action" onClick={lab.closeCleanly}>
                    {copy.closeLabel}
                  </button>
                ) : (
                  <button type="button" onClick={lab.closeWithOpenItems}>
                    {copy.openCloseLabel}
                  </button>
                )}
              </div>
            )}
            <pre className="dot-hidden-receipt">{JSON.stringify(receipt, null, 2)}</pre>
          </section>

          <DeveloperInspector lab={lab} />
          <div className="sr-only">{scenario.label}</div>
        </main>
      </div>
    </div>
  );
}

export function ChopDotDotLab({ modeParam, onExit }: ChopDotDotLabProps) {
  const [selectedMode, setSelectedMode] = useState<DotLabMode | null>(() => modeFromQuery(modeParam ?? null));

  if (!selectedMode) {
    return <ModeSelector onSelect={setSelectedMode} />;
  }

  return <DotProductBoard mode={selectedMode} onBack={() => setSelectedMode(null)} onExit={onExit} />;
}
