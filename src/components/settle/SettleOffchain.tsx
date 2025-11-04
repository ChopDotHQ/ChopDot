import React, { useMemo, useState } from 'react';
import { BN } from '@polkadot/util';
import { useWallet } from '../../wallet/WalletProvider';
import { dotToPlanck } from '../../utils/units';
import { isValidAddress } from '../../utils/ss58';
import { recordSettlement } from '../../repos/settlementsRepo';

type Props = { potId: string; defaultTo?: string };

export const SettleOffchain: React.FC<Props> = ({ potId, defaultTo }) => {
  const { selected } = useWallet();
  const [to, setTo] = useState(defaultTo || '');
  const [dot, setDot] = useState('0.01');
  const [method, setMethod] = useState<'cash' | 'bank'>('cash');
  const [saved, setSaved] = useState(false);
  const amountPlanck = useMemo(() => dotToPlanck(dot || '0'), [dot]);
  const addrValid = isValidAddress(to);
  const canSave = !!selected?.address && !!to && addrValid && amountPlanck.gt(new BN(0));

  const submit = async () => {
    if (!selected) return;
    await recordSettlement(potId, {
      from: selected.address,
      to,
      amountPlanck: amountPlanck.toString(),
      method,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="space-y-3 p-3 rounded-xl border">
      <div className="text-sm font-medium">Record off-chain settlement</div>

      <label className="block text-xs opacity-70">Recipient (SS58)</label>
      <input
        className={`w-full px-3 py-2 rounded-md border ${to && !addrValid ? 'border-red-500' : ''}`}
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="15xxx…"
      />
      {to && !addrValid && <div className="text-xs text-red-600">Invalid address</div>}

      <label className="block text-xs opacity-70">Amount (DOT)</label>
      <input
        className="w-full px-3 py-2 rounded-md border"
        value={dot}
        onChange={(e) => setDot(e.target.value)}
        placeholder="0.01"
      />

      <label className="block text-xs opacity-70">Method</label>
      <select
        className="px-3 py-2 rounded-md border"
        value={method}
        onChange={(e) => setMethod(e.target.value as 'cash' | 'bank')}
      >
        <option value="cash">Cash</option>
        <option value="bank">Bank</option>
      </select>

      <button
        disabled={!canSave}
        onClick={submit}
        className="px-3 py-2 rounded-xl border"
      >
        Save
      </button>
      {saved && <span className="text-xs text-green-600">Saved ✓</span>}
    </div>
  );
};


