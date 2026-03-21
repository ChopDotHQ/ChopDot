import { X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '../ui/drawer';
import { EmailLoginPanel } from './panels/EmailLoginPanel';
import type { PanelMode } from './SignInThemes';

interface EmailLoginDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
  email: string;
  password: string;
  rememberEmail: boolean;
  loading: boolean;
  panelMode: PanelMode;
  error: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberEmailChange: (value: boolean) => void;
  onSubmit: () => void;
  onForgotPassword: () => void;
  onCancel: () => void;
  onCreateAccount: () => void;
}

export function EmailLoginDrawer({
  open, onOpenChange, isMobile, email, password, rememberEmail,
  loading, panelMode, error, onEmailChange, onPasswordChange,
  onRememberEmailChange, onSubmit, onForgotPassword, onCancel, onCreateAccount,
}: EmailLoginDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? 'bottom' : 'right'} autoFocus={!isMobile}>
      <DrawerContent className="p-0">
        <div className="flex items-start justify-between gap-4 px-4 pt-4">
          <div className="space-y-1">
            <DrawerTitle asChild><h2 className="text-base font-semibold text-foreground">Email &amp; password</h2></DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">Sign in with your ChopDot account</DrawerDescription>
          </div>
          <DrawerClose asChild>
            <button type="button" onClick={() => triggerHaptic('light')} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted/40 active:scale-95 transition-transform" aria-label="Close">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </DrawerClose>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3 space-y-4">
          <EmailLoginPanel
            email={email} password={password} rememberEmail={rememberEmail}
            loading={loading} panelMode={panelMode}
            onEmailChange={onEmailChange} onPasswordChange={onPasswordChange}
            onRememberEmailChange={onRememberEmailChange}
            onSubmit={onSubmit} onForgotPassword={onForgotPassword} onCancel={onCancel}
          />
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          )}
          <button type="button" onClick={onCreateAccount} className="text-xs font-semibold underline underline-offset-4 text-[var(--accent)]">
            Need an account? Create one
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
