import { useState } from 'react';
import { Shield, Lock, Download, Cloud, ChevronRight, ChevronDown, Mail, KeyRound } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { triggerHaptic } from '../../utils/haptics';
import type { PSAStyleProps } from './section-props';
import { psaMouseHandlers } from './section-props';

interface SecuritySettingsSectionProps extends PSAStyleProps {
  isGuest: boolean;
  emailUpdate: {
    value: string;
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    setValue: (value: string) => void;
    handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  };
  passwordUpdate: {
    newPassword: string;
    confirmPassword: string;
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    setNewPassword: (value: string) => void;
    setConfirmPassword: (value: string) => void;
    handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  };
  onCrustStorage: () => void;
  onShowHelp: () => void;
}

function exportLocalData() {
  if (typeof window === 'undefined') return;
  const payload = {
    exportedAt: new Date().toISOString(),
    pots: window.localStorage.getItem('chopdot_pots'),
    settlements: window.localStorage.getItem('chopdot_settlements'),
    notifications: window.localStorage.getItem('chopdot_notifications'),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `chopdot-data-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function SecuritySettingsSection({
  isGuest,
  emailUpdate,
  passwordUpdate,
  onCrustStorage,
  onShowHelp,
  ...psa
}: SecuritySettingsSectionProps) {
  const [open, setOpen] = useState(false);
  const hover = psaMouseHandlers(psa);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          onClick={() => { triggerHaptic('light'); setOpen(!open); }}
          className={psa.isPSA
            ? `${psa.psaCardClass} w-full rounded-xl p-4 flex items-start justify-between transition-all duration-200 active:scale-[0.98]`
            : 'w-full card rounded-xl p-4 flex items-start justify-between hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]'}
          style={psa.isPSA ? psa.psaCardStyle : undefined}
          {...hover}
        >
          <div className="flex-1 text-left">
            <p className="text-label" style={{ fontWeight: 600 }}>Security & Privacy</p>
            <p className="text-micro text-secondary mt-0.5">Privacy settings, backup and data export</p>
          </div>
          {open ? <ChevronDown className="w-5 h-5 text-secondary flex-shrink-0 ml-2" /> : <ChevronRight className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent
        className={psa.isPSA ? `mt-2 ${psa.psaCardClass} rounded-xl p-4 space-y-3` : 'mt-2 card rounded-xl p-4 space-y-3'}
        style={psa.isPSA ? psa.psaCardStyle : undefined}
      >
        {!isGuest && (
          <div className="space-y-4 rounded-xl border border-border/60 p-4">
            <h3 className="text-label font-semibold">Account security</h3>
            <form onSubmit={emailUpdate.handleSubmit} className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-secondary" />
                <span className="text-micro text-secondary">Email address</span>
              </div>
              <input
                type="email"
                value={emailUpdate.value}
                onChange={(e) => emailUpdate.setValue(e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                placeholder="name@domain.com"
                required
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-[var(--accent)] py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                disabled={emailUpdate.status === 'loading'}
              >
                {emailUpdate.status === 'loading' ? 'Updating\u2026' : 'Update email'}
              </button>
              {emailUpdate.message && (
                <p className={`text-xs ${emailUpdate.status === 'error' ? 'text-destructive' : 'text-secondary'}`}>
                  {emailUpdate.message}
                </p>
              )}
            </form>

            <form onSubmit={passwordUpdate.handleSubmit} className="space-y-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-secondary" />
                <span className="text-micro text-secondary">Password</span>
              </div>
              <input
                type="password"
                value={passwordUpdate.newPassword}
                onChange={(e) => passwordUpdate.setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                placeholder="New password"
                minLength={8}
                required
              />
              <input
                type="password"
                value={passwordUpdate.confirmPassword}
                onChange={(e) => passwordUpdate.setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                placeholder="Confirm password"
                minLength={8}
                required
              />
              <button
                type="submit"
                className="w-full rounded-xl border border-border py-2 text-sm font-semibold text-foreground hover:bg-muted/20 transition-colors disabled:opacity-60"
                disabled={passwordUpdate.status === 'loading'}
              >
                {passwordUpdate.status === 'loading' ? 'Updating\u2026' : 'Update password'}
              </button>
              {passwordUpdate.message && (
                <p className={`text-xs ${passwordUpdate.status === 'error' ? 'text-destructive' : 'text-secondary'}`}>
                  {passwordUpdate.message}
                </p>
              )}
            </form>
          </div>
        )}

        <button onClick={() => { triggerHaptic('light'); exportLocalData(); }} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left">
          <Download className="w-4 h-4 text-secondary" />
          <span className="text-micro">Export data</span>
        </button>
        <button onClick={() => { triggerHaptic('light'); onCrustStorage(); }} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left">
          <Cloud className="w-4 h-4 text-secondary" />
          <span className="text-micro">Crust Storage (IPFS)</span>
        </button>
        <button onClick={() => { triggerHaptic('light'); onShowHelp(); }} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left">
          <Shield className="w-4 h-4 text-secondary" />
          <span className="text-micro">Privacy settings</span>
        </button>
        <button onClick={() => { triggerHaptic('light'); onCrustStorage(); }} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left">
          <Lock className="w-4 h-4 text-secondary" />
          <span className="text-micro">Backup wallet</span>
        </button>
      </CollapsibleContent>
    </Collapsible>
  );
}
