/**
 * AccountMenu - User account entry point (MVP: no wallet features)
 */

import { useAccount } from '../contexts/AccountContext';
import { User } from 'lucide-react';

export function AccountMenu() {
  const account = useAccount();

  const addr = account.address0 as string | null;
  const displayName = addr
    ? `${addr.slice(0, 6)}...${addr.slice(-4)}`
    : 'Account';

  return (
    <div className="relative inline-block">
      <button
        className="px-2.5 py-2 sm:px-3 rounded-lg border bg-card hover:bg-muted transition-colors flex items-center gap-1.5"
        style={{ borderColor: 'var(--border)' }}
        aria-label="Account"
      >
        <User className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium truncate max-w-[90px] hidden sm:inline">
          {displayName}
        </span>
      </button>
    </div>
  );
}
