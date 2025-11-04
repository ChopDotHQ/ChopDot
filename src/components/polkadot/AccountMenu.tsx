import React from 'react';
import { useWallet } from '../../wallet/WalletProvider';

export const AccountMenu: React.FC = () => {
  const { accounts, selected, selectAccount, isConnected } = useWallet();

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs opacity-70">No account connected</span>
        <a
          className="px-3 py-1.5 rounded-xl border hover:bg-black/5"
          href="https://polkadot.js.org/extension/" target="_blank" rel="noreferrer"
        >
          Install/Connect
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs opacity-70">Account:</span>
      <select
        className="px-2 py-1 rounded-md border text-sm"
        value={selected?.address}
        onChange={(e) => selectAccount(e.target.value)}
      >
        {accounts.map(a => (
          <option key={a.address} value={a.address}>
            {(a.meta?.name || 'Account')} — {a.address.slice(0,6)}…{a.address.slice(-4)}
          </option>
        ))}
      </select>
    </div>
  );
};


