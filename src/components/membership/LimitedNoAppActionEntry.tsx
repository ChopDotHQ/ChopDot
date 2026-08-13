import {useEffect, useState} from 'react';
import type {SignedLimitedNoAppActionV1} from '../../membership/limitedNoAppAction.ts';
import type {LimitedNoAppActionService} from '../../membership/limitedNoAppActionService.ts';
import {
  LimitedNoAppActionFlow,
  type LimitedNoAppActionFlowState,
} from './LimitedNoAppActionFlow.tsx';

export interface LimitedNoAppActionEntryDependencies {
  /** Authority is injected by the app provider; URL data never creates it. */
  service: LimitedNoAppActionService;
}

export function LimitedNoAppActionEntry({
  request,
  dependencies,
  onClose,
}: {
  request: SignedLimitedNoAppActionV1;
  dependencies?: LimitedNoAppActionEntryDependencies;
  onClose: () => void;
}) {
  const [state, setState] = useState<LimitedNoAppActionFlowState | 'checking'>('checking');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let active = true;
    const prepare = async () => {
      if (!dependencies) return 'unavailable' as const;
      try {
        await dependencies.service.restore();
        const outcome = await dependencies.service.enter(request);
        if (outcome.status !== 'ready') return unavailableState(outcome.status);
        const response = dependencies.service.state.responses[request.requestId];
        if (!response) return readyState(request);
        const delivery = await dependencies.service.flush();
        return responseState(response.decision, delivery.pending.length > 0);
      } catch {
        return 'unavailable' as const;
      }
    };
    void prepare().then(next => { if (active) setState(next); });
    return () => { active = false; };
  }, [dependencies, request]);

  const respond = async () => {
    if (!dependencies || running || !isReady(state)) return;
    setRunning(true);
    try {
      const response = await dependencies.service.respond({
        requestId: request.requestId,
        responseId: `limited-response-${request.requestId}`,
        decision: request.action === 'MARK_PAID' ? 'MARKED_PAID' : 'DECLINED',
        respondedAt: new Date().toISOString(),
      });
      const delivery = await dependencies.service.flush();
      setState(responseState(response.decision, delivery.pending.length > 0));
    } catch {
      setState('unavailable');
    } finally {
      setRunning(false);
    }
  };

  if (state === 'checking') {
    return (
      <main className="flex min-h-[100dvh] flex-col bg-[#f7f6f4] px-6 py-7 text-gray-950">
        <header><p className="text-lg font-bold tracking-[-0.03em]">ChopDot</p></header>
        <p role="status" className="mt-12 text-sm font-medium text-gray-500">Checking your dinner request…</p>
      </main>
    );
  }

  return (
    <LimitedNoAppActionFlow
      state={state}
      amount={request.amountMinor / 100}
      currency={request.currency}
      running={running}
      onRespond={respond}
      onClose={onClose}
    />
  );
}

function readyState(request: SignedLimitedNoAppActionV1): LimitedNoAppActionFlowState {
  return request.action === 'MARK_PAID' ? 'ready_to_mark_paid' : 'ready_to_decline';
}

function responseState(decision: 'MARKED_PAID' | 'DECLINED', pending: boolean): LimitedNoAppActionFlowState {
  if (decision === 'MARKED_PAID') return pending ? 'marked_paid_pending' : 'marked_paid';
  return pending ? 'declined_pending' : 'declined';
}

function unavailableState(status: 'wrong_account' | 'expired' | 'untrusted_organizer' | 'invalid'): LimitedNoAppActionFlowState {
  if (status === 'wrong_account' || status === 'expired') return status;
  return 'unavailable';
}

function isReady(state: LimitedNoAppActionFlowState | 'checking'): state is 'ready_to_mark_paid' | 'ready_to_decline' {
  return state === 'ready_to_mark_paid' || state === 'ready_to_decline';
}
