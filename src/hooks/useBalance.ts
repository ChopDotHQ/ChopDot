import { useEffect, useState } from 'react';
import { useChain } from '../chain/LightClientProvider';
import { useWallet } from '../wallet/WalletProvider';

export function useBalance() {
  const { api, isReady } = useChain();
  const { selected } = useWallet();
  const [free, setFree] = useState<string>('0');

  useEffect(() => {
    if (!api || !isReady || !selected) return;
    let unsub: any;
    (async () => {
      const acc = await (api as any).query.system.account(selected.address);
      setFree((acc as any).data.free.toString());
      unsub = await (api as any).query.system.account(selected.address, (acct: any) => {
        setFree(acct.data.free.toString());
      });
    })();
    return () => { if (unsub) unsub(); };
  }, [api, isReady, selected?.address]);

  return { free, hasAccount: !!selected };
}


