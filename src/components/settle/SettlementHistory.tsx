import React, { useEffect, useState } from 'react';
import { listSettlements } from '../../repos/settlementsRepo';
import { planckToDot } from '../../utils/units';
import { getCurrentChain } from '../../chain/chains';

export const SettlementHistory: React.FC<{ potId: string }> = ({ potId }) => {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => setRows(await listSettlements(potId)))();
  }, [potId]);

  if (!rows.length) return null;
  const explorerBase = getCurrentChain().explorerBaseUrl;

  return (
    <div className="mt-4">
      <div className="text-sm font-medium mb-2">Settlement history</div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between text-sm p-2 border rounded-lg">
            <div className="truncate">
              {r.method.toUpperCase()} • {r.from?.slice?.(0,6)}…{r.from?.slice?.(-4)} → {r.to.slice(0,6)}…{r.to.slice(-4)} • {planckToDot(r.amountPlanck)} DOT
              {r.txHash && (
                <a className="ml-2 underline opacity-70" href={`${explorerBase}/extrinsic/${r.txHash}`} target="_blank" rel="noreferrer">tx {String(r.txHash).slice(0,10)}…</a>
              )}
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full border">{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};


