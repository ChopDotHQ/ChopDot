import React, { useCallback, useState } from 'react';
import { BN } from '@polkadot/util';
import { useChain } from '../../chain/LightClientProvider';
import { useWallet } from '../../wallet/WalletProvider';
import { web3FromAddress } from '@polkadot/extension-dapp';

interface TxSendProps {
  to: string;
  amountPlanck: string | BN;
  onSuccess?: (txHash: string, includedBlock?: string) => void;
}

export const TxSend: React.FC<TxSendProps> = ({ to, amountPlanck, onSuccess }) => {
  const { api, isReady } = useChain();
  const { selected } = useWallet();
  const [status, setStatus] = useState<'idle' | 'signing' | 'sending' | 'inblock' | 'finalized' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | undefined>();

  const canSend = isReady && !!selected;

  const send = useCallback(async () => {
    if (!api || !selected) return;
    if (status === 'signing' || status === 'sending') return; // debounce
    try {
      setError(null); setStatus('signing');
      const injector = await web3FromAddress(selected.address);
      const tx = api.tx.balances.transferKeepAlive(to, amountPlanck);
      setStatus('sending');
      const unsub = await tx.signAndSend(selected.address, { signer: injector.signer }, (result) => {
        if (result.status.isInBlock) {
          setStatus('inblock');
          setHash(tx.hash.toHex());
          const block = result.status.asInBlock.toHex();
          onSuccess?.(tx.hash.toHex(), block);
        } else if (result.status.isFinalized) {
          setStatus('finalized');
          unsub();
        }
      });
    } catch (e) {
      setStatus('error');
      const msg = (e as any)?.message || String(e);
      const friendly =
        msg.includes('Inability') || msg.includes('balances.InsufficientBalance') ? 'Insufficient balance' :
        msg.includes('Bad address') ? 'Invalid address' :
        msg;
      setError(friendly);
    }
  }, [api, selected, to, amountPlanck, onSuccess, status]);

  return (
    <div className="flex items-center gap-2">
      <button className="px-3 py-2 rounded-xl border" disabled={!canSend || status === 'sending' || status === 'signing'} onClick={send}>
        {status === 'idle' && 'Send DOT'}
        {status === 'signing' && 'Signing…'}
        {status === 'sending' && 'Sending…'}
        {status === 'inblock' && 'In block ✓'}
        {status === 'finalized' && 'Finalized ✓'}
        {status === 'error' && 'Retry'}
      </button>
      {hash && <code className="text-xs opacity-70">tx: {hash.slice(0, 12)}…</code>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
};


