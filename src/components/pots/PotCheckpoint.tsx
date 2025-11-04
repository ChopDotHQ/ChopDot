import React, { useCallback, useState } from 'react';
import { useChain } from '../../chain/LightClientProvider';
import { useWallet } from '../../wallet/WalletProvider';
import { hashPotState } from '../../utils/hashState';
import { openPotDoc } from '../../repos/y/store';

export const PotCheckpoint: React.FC<{ potId: string }> = ({ potId }) => {
  const { api, isReady } = useChain();
  const { selected } = useWallet();
  const [payloadHex, setPayloadHex] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const prep = useCallback(async () => {
    setBusy(true);
    const { hex } = await hashPotState(potId);
    const payload = { potId, hash: hex };
    const u8 = new TextEncoder().encode(JSON.stringify(payload));
    const bytesHex = '0x' + Array.from(u8).map((b) => b.toString(16).padStart(2, '0')).join('');
    setPayloadHex(bytesHex);
    setBusy(false);
  }, [potId]);

  const onSuccess = async (_txHash: string, includedBlock?: string) => {
    if (!includedBlock) return;
    const { root, destroy } = await openPotDoc(potId);
    const meta = root.get('meta') as any;
    if (meta && typeof (meta as any).set === 'function') {
      (meta as any).set('checkpoint', { block: includedBlock, at: Date.now() });
    }
    destroy();
  };

  if (!isReady || !selected || !api) return null;

  return (
    <div className="flex items-center gap-2">
      {!payloadHex ? (
        <button className="px-3 py-2 rounded-xl border" onClick={prep} disabled={busy}>Anchor pot state</button>
      ) : (
        <button
          className="px-3 py-2 rounded-xl border"
          onClick={async () => {
            const tx = api.tx.system.remark(payloadHex);
            const { web3FromAddress } = await import('@polkadot/extension-dapp');
            const injector = await web3FromAddress(selected.address);
            const unsub = await tx.signAndSend(selected.address, { signer: injector.signer }, (result) => {
              if (result.status.isInBlock) {
                onSuccess(tx.hash.toHex(), result.status.asInBlock.toHex());
              } else if (result.status.isFinalized) {
                unsub();
              }
            });
          }}
        >
          Send checkpoint
        </button>
      )}
    </div>
  );
};


