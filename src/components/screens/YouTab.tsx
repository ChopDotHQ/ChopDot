import { useState } from 'react';
import { TrendingUp, Bell, ChevronRight, HelpCircle, LogOut, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { HelpSheet } from '../HelpSheet';
import { type Theme, useTheme } from '../../utils/useTheme';
import { usePSAStyle } from '../../utils/usePSAStyle';
import { AccountMenu } from '../AccountMenu';
import { useEmailUpdate } from '../../hooks/useEmailUpdate';
import { usePasswordUpdate } from '../../hooks/usePasswordUpdate';
import { ProfileCard } from '../you/ProfileCard';
import { GeneralSettingsSection } from '../you/GeneralSettingsSection';
import { NotificationSettingsSection } from '../you/NotificationSettingsSection';
import { SecuritySettingsSection } from '../you/SecuritySettingsSection';
import { AdvancedSettingsSection } from '../you/AdvancedSettingsSection';

interface YouTabProps {
  onShowQR: () => void;
  onScanQR: () => void;
  onReceive: () => void;
  onPaymentMethods: () => void;
  onViewInsights: () => void;
  onSettings: () => void;
  onCrustStorage: () => void;
  onNotificationClick: () => void;
  onWalletClick: () => void;
  walletConnected?: boolean;
  notificationCount: number;
  insights: {
    monthlySpending: number;
    topCategory: string;
    topCategoryAmount: number;
    activePots: number;
    totalSettled: number;
    expensesConfirmed: number;
    expensesNeedingConfirmation: number;
    confirmationRate: number;
    settlementsCompleted: number;
    activeGroups: number;
  };
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  userName?: string;
  userEmail?: string;
  isGuest?: boolean;
}

export function YouTab({
  onShowQR,
  onScanQR,
  onReceive,
  onPaymentMethods,
  onViewInsights,
  onSettings: _onSettings,
  onCrustStorage,
  onNotificationClick,
  notificationCount,
  insights,
  theme,
  onThemeChange,
  onLogout,
  onDeleteAccount,
  userName = 'You',
  userEmail,
  isGuest = false,
  walletConnected,
}: YouTabProps) {
  const { brandVariant, setBrandVariant } = useTheme();
  const { isPSA, psaStyles, psaClasses } = usePSAStyle();
  const [showHelp, setShowHelp] = useState(false);
  const emailUpdate = useEmailUpdate(userEmail);
  const passwordUpdate = usePasswordUpdate();

  const psaProps = {
    isPSA,
    psaCardClass: psaClasses.card,
    psaCardStyle: psaStyles.card,
    psaCardHoverStyle: psaStyles.cardHover,
  };

  const hoverHandlers = isPSA
    ? {
        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => Object.assign(e.currentTarget.style, psaStyles.cardHover),
        onMouseLeave: (e: React.MouseEvent<HTMLElement>) => Object.assign(e.currentTarget.style, psaStyles.card),
      }
    : {};

  return (
    <div
      className={`h-full overflow-auto pb-[88px] ${isPSA ? '' : 'bg-background'}`}
      style={isPSA ? psaStyles.background : undefined}
    >
      <div className="p-4 flex items-center justify-between">
        <h1 className="text-screen-title">You</h1>
        <div className="flex items-center gap-2">
          <AccountMenu />
          <button
            onClick={onNotificationClick}
            className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-all duration-200 active:scale-95"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-micro" style={{ background: 'var(--accent-pink)', color: 'var(--card)' }}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        <ProfileCard
          userName={userName}
          isGuest={isGuest}
          walletConnected={walletConnected}
          onShowQR={onShowQR}
          onScanQR={onScanQR}
          onReceive={onReceive}
          isPSA={isPSA}
          psaCardClass={psaClasses.card}
          psaCardStyle={psaStyles.card}
        />

        <button
          onClick={onViewInsights}
          className={isPSA ? `${psaClasses.card} p-4 w-full text-left transition-all duration-200 active:scale-[0.98]` : 'card p-4 w-full text-left transition-all duration-200 active:scale-[0.98] hover:shadow-fab'}
          style={isPSA ? psaStyles.card : undefined}
          {...hoverHandlers}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-label" style={{ fontWeight: 600 }}>Quick insights</h3>
            <TrendingUp className="w-4 h-4 text-secondary" />
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-micro text-secondary">Monthly spending</span>
              <span className="text-[18px] tabular-nums" style={{ fontWeight: 700 }}>${insights.monthlySpending.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-micro text-secondary">Active pots</span>
              <span className="text-[18px] tabular-nums" style={{ fontWeight: 700 }}>{insights.activePots}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-micro text-secondary">Total settled</span>
              <span className="text-[18px] tabular-nums" style={{ fontWeight: 700 }}>${insights.totalSettled.toFixed(2)}</span>
            </div>
          </div>
        </button>

        <div className="space-y-2">
          <GeneralSettingsSection {...psaProps} theme={theme} onThemeChange={onThemeChange} brandVariant={brandVariant} setBrandVariant={setBrandVariant} />

          <button
            onClick={() => { triggerHaptic('light'); onPaymentMethods(); }}
            className={isPSA ? `${psaClasses.card} w-full rounded-xl p-4 flex items-start justify-between transition-all duration-200 active:scale-[0.98]` : 'w-full card rounded-xl p-4 flex items-start justify-between hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]'}
            style={isPSA ? psaStyles.card : undefined}
            {...hoverHandlers}
          >
            <div className="flex-1 text-left">
              <p className="text-label" style={{ fontWeight: 600 }}>Payment methods</p>
              <p className="text-micro text-secondary mt-0.5">Manage bank accounts and crypto wallets</p>
            </div>
            <ChevronRight className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />
          </button>

          <NotificationSettingsSection {...psaProps} />
          <SecuritySettingsSection {...psaProps} isGuest={isGuest} emailUpdate={emailUpdate} passwordUpdate={passwordUpdate} onCrustStorage={onCrustStorage} onShowHelp={() => setShowHelp(true)} />
          <AdvancedSettingsSection {...psaProps} />

          <button
            onClick={() => { triggerHaptic('light'); setShowHelp(true); }}
            className={isPSA ? `${psaClasses.card} w-full rounded-xl p-4 flex items-start justify-between transition-all duration-200 active:scale-[0.98]` : 'w-full card rounded-xl p-4 flex items-start justify-between hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]'}
            style={isPSA ? psaStyles.card : undefined}
            {...hoverHandlers}
          >
            <div className="flex items-center gap-3 flex-1 text-left">
              <div className="w-8 h-8 rounded-full bg-accent-pink-soft flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-accent-pink" />
              </div>
              <div>
                <p className="text-label" style={{ fontWeight: 600 }}>Help & Support</p>
                <p className="text-micro text-secondary mt-0.5">Learn how to use ChopDot</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />
          </button>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => { triggerHaptic('medium'); onLogout(); }}
              className={isPSA ? `${psaClasses.card} w-full rounded-xl p-4 flex items-center gap-3 transition-all duration-200 active:scale-[0.98]` : 'w-full card rounded-xl p-4 flex items-center gap-3 hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]'}
              style={isPSA ? psaStyles.card : undefined}
              {...hoverHandlers}
            >
              <LogOut className="w-5 h-5 text-foreground" />
              <span className="text-label">Sign out</span>
            </button>
            <button
              onClick={() => { triggerHaptic('medium'); onDeleteAccount(); }}
              className={isPSA ? `${psaClasses.card} w-full rounded-xl p-4 flex items-center gap-3 transition-all duration-200 active:scale-[0.98]` : 'w-full card rounded-xl p-4 flex items-center gap-3 hover:bg-destructive/10 transition-all duration-200 active:scale-[0.98]'}
              style={isPSA ? psaStyles.card : undefined}
              {...hoverHandlers}
            >
              <Trash2 className="w-5 h-5 text-destructive" />
              <span className="text-label text-destructive">Delete account</span>
            </button>
          </div>
        </div>
      </div>

      {showHelp && <HelpSheet onClose={() => setShowHelp(false)} />}
    </div>
  );
}
