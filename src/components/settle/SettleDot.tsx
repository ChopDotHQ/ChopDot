import React, { useMemo, useState } from 'react';
import { BN } from '@polkadot/util';
import { useWallet } from '../../wallet/WalletProvider';
import { dotToPlanck, planckToDot } from '../../utils/units';
import { TxSend } from '../polkadot/TxSend';
import { recordSettlement, markVerified } from '../../repos/settlementsRepo';
import { isValidAddress } from '../../utils/ss58';
import { useBalance } from '../../hooks/useBalance';

type Props = { potId: string; defaultTo?: string };

export const SettleDot: React.FC<Props> = ({ potId, defaultTo }) => {
  const { selected } = useWallet();
  const { free } = useBalance();
  const [to, setTo] = useState<string>(defaultTo || '');
  const [dot, setDot] = useState<string>('0.01');

  const amountPlanck = useMemo<BN>(() => dotToPlanck(dot || '0'), [dot]);
  const feeBuffer = new BN(1_000_000_000); // ~0.001 DOT
  const freeBn = useMemo(() => new BN(free || '0'), [free]);
  const hasBalance = useMemo(() => amountPlanck.add(feeBuffer).lte(freeBn), [amountPlanck, feeBuffer, freeBn]);
  const addrValid = isValidAddress(to);
  const canSend = !!selected?.address && !!to && addrValid && amountPlanck.gt(new BN(0)) && hasBalance;

  const handleSuccess = async (txHash: string, includedBlock?: string) => {
    if (!selected) return;
    const id = await recordSettlement(potId, {
      from: selected.address,
      to,
      amountPlanck: amountPlanck.toString(),
      method: 'dot',
      txHash,
    });
    if (includedBlock) {
      await markVerified(potId, id, includedBlock);
    }
  };

  return (
    <div className="space-y-3 p-3 rounded-xl border">
      <div className="text-sm font-medium">Settle with DOT</div>

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

      <div className="text-xs opacity-70">≈ {planckToDot(amountPlanck)} DOT</div>
      <div className="text-xs opacity-70">Balance: {planckToDot(freeBn)} DOT</div>
      {!hasBalance && <div className="text-xs text-red-600">Insufficient balance (incl. fee)</div>}

      <div className="pt-2">
        <TxSend to={to} amountPlanck={amountPlanck} onSuccess={handleSuccess} />
      </div>
    </div>
  );
};


