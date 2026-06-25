import { useMemo, useState } from 'react';
import { LabMockPanel } from './LabMockPanel';
import { LoopBeatBadge, MockGroupChat } from './MockGroupChat';
import type { LoopBeat } from './types';
import { resolveLoopLabScenario } from './scenarios';
import { ValidationTmaShell } from './ValidationTmaShell';

type GroupMoneyLoopLabProps = {
  scenarioId?: string | null;
  onExit?: () => void;
};

export function GroupMoneyLoopLab({ scenarioId, onExit }: GroupMoneyLoopLabProps) {
  const scenario = useMemo(
    () => resolveLoopLabScenario(scenarioId ?? null),
    [scenarioId],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [frictionLog, setFrictionLog] = useState('');
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const step = scenario.steps[stepIndex];
  if (!step) {
    return null;
  }
  const progress = `${stepIndex + 1} / ${scenario.steps.length}`;

  const beatCounts = useMemo(() => {
    const counts: Record<LoopBeat, number> = { catch: 0, show: 0, move: 0, end: 0 };
    scenario.steps.forEach((s) => {
      counts[s.beat] += 1;
    });
    return counts;
  }, [scenario.steps]);

  const toggleCheck = (id: string) => {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{ backgroundColor: '#0f0f0f', color: '#ffffff' }}
    >
      <header className="border-b border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Group money loop lab</h1>
          <p className="text-sm text-white/60">
            Mock chat + real ChopDot · operator-first · {scenario.title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/50">{progress}</span>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="text-sm px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/5"
            >
              Exit lab
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 grid xl:grid-cols-[0.9fr_0.8fr_1.1fr] gap-0 min-h-0">
        <div className="p-4 min-h-[320px] lg:min-h-0 lg:h-[calc(100vh-8rem)]">
          <MockGroupChat scenario={scenario} stepIndex={stepIndex} />
        </div>

        <div className="border-t xl:border-t-0 xl:border-l border-white/10 p-4 overflow-y-auto space-y-4">
          <div className="flex flex-wrap gap-2 text-xs text-white/50">
            {(['catch', 'show', 'move', 'end'] as const).map((b) => (
              <span key={b}>
                {b}: {beatCounts[b]} steps
              </span>
            ))}
          </div>

          <div className="space-y-2">
            <LoopBeatBadge beat={step.beat} />
            <h2 className="text-base font-medium">{step.id.replace(/-/g, ' ')}</h2>
          </div>

          <section className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
            <h3 className="text-xs uppercase tracking-wide text-white/50">In ChopDot (real app)</h3>
            <p className="text-sm leading-relaxed">{step.chopdotAction}</p>
            {step.catchMock && (
              <LabMockPanel
                catch={{ kind: step.catchMock, solutionId: step.catchSolutionId }}
              />
            )}
            {step.managementMock && (
              <LabMockPanel
                management={{
                  kind: step.managementMock,
                  solutionId: step.managementSolutionId,
                }}
              />
            )}
            {step.payoutMock && (
              <LabMockPanel
                payout={{ kind: step.payoutMock, solutionId: step.payoutSolutionId }}
              />
            )}
            {step.historyMock && (
              <LabMockPanel
                history={{ kind: step.historyMock, solutionId: step.historySolutionId }}
              />
            )}
            <label className="flex items-start gap-2 text-sm cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={!!checks[step.id]}
                onChange={() => toggleCheck(step.id)}
                className="mt-1"
              />
              <span>I did this in the app</span>
            </label>
          </section>

          <section className="rounded-xl bg-sky-500/10 border border-sky-500/30 p-4 space-y-1">
            <h3 className="text-xs uppercase tracking-wide text-sky-200/80">State expectation (C)</h3>
            <p className="text-sm leading-relaxed text-sky-50/90">{step.stateExpectation}</p>
          </section>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((i) => i - 1)}
              className="flex-1 py-2 rounded-lg border border-white/20 disabled:opacity-30 hover:bg-white/5 text-sm"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={stepIndex >= scenario.steps.length - 1}
              onClick={() => setStepIndex((i) => i + 1)}
              className="flex-1 py-2 rounded-lg bg-[#25D366] text-[#111] font-medium disabled:opacity-30 text-sm"
            >
              Next step
            </button>
          </div>

          {stepIndex === scenario.steps.length - 1 && (
            <section className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
              <h3 className="text-sm font-medium">Operator friction log</h3>
              <p className="text-xs text-white/50">
                Human validation notes. Where did the agent still need chat, Sheet, or manual repair?
              </p>
              <textarea
                value={frictionLog}
                onChange={(e) => setFrictionLog(e.target.value)}
                rows={5}
                className="w-full rounded-lg bg-black/40 border border-white/10 p-3 text-sm resize-y"
                placeholder="Agent completed… / Human repair needed when… / Accept run as evidence: Y/N"
              />
            </section>
          )}

          <p className="text-xs text-white/40 leading-relaxed">
            Scenarios:{' '}
            {(['trip', 'catch', 'management', 'payout', 'history'] as const).map((s, i) => (
              <span key={s}>
                {i > 0 ? ' · ' : ''}
                <code className="text-white/60">?loop-lab=1&scenario={s}</code>
              </span>
            ))}
          </p>
        </div>

        <div className="border-t xl:border-t-0 xl:border-l border-white/10 p-4 overflow-y-auto">
          <ValidationTmaShell />
        </div>
      </div>
    </div>
  );
}
