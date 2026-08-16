import type { ReactNode } from 'react';
import { lazy } from 'react';
import type { Notification } from '../screens/NotificationCenter';
import { Toaster } from '../ui/sonner';
import type { PaymentMethod } from '../../App';

const NotificationCenter = lazy(() =>
  import('../screens/NotificationCenter').then((module) => ({ default: module.NotificationCenter }))
);
const ChoosePot = lazy(() =>
  import('../screens/ChoosePot').then((module) => ({ default: module.ChoosePot }))
);
const AddMember = lazy(() =>
  import('../screens/AddMember').then((module) => ({ default: module.AddMember }))
);

type PotSummary = {
  id: string;
  name: string;
  archived?: boolean;
  expenses: Array<{ paidBy: string }>;
  members: Array<{ id: string }>;
};

type Contact = {
  id: string;
  name: string;
  trustScore?: number;
  paymentPreference?: string;
  sharedPots?: number;
  lastTransaction?: string;
};

interface AppOverlaysProps {
  inviteModal?: ReactNode;
  showNotifications: boolean;
  notifications: Notification[];
  onNotificationsClose: () => void;
  onNotificationsMarkAllRead: () => void;
  onNotificationClick: (notification: Notification) => void;
  showChoosePot: boolean;
  pots: PotSummary[];
  onChoosePotClose: () => void;
  onChoosePotCreate: () => void;
  onChoosePotSelect: (potId: string) => void;
  showAddMember: boolean;
  existingContacts: Contact[];
  currentMembers: string[];
  onAddMemberClose: () => void;
  onAddMemberExisting: (contactId: string) => void;
  onInviteNew: (nameOrEmail: string) => void;
  onAddMemberShowQR: () => void;
  canInviteByEmail?: boolean;
  // kept for prop-compat but unused in MVP
  showWalletSheet?: boolean;
  walletConnected?: boolean;
  connectedWallet?: unknown;
  onWalletConnect?: (provider: string) => void;
  onWalletDisconnect?: () => void;
  onWalletClose?: () => void;
  showYouSheet?: boolean;
  youSheetInsights?: unknown;
  onYouSheetClose?: () => void;
  onYouShowQR?: () => void;
  onYouScanQR?: () => void;
  onYouPaymentMethods?: () => void;
  onYouViewInsights?: () => void;
  onYouSettings?: () => void;
  showMyQR?: boolean;
  onMyQRClose?: () => void;
  onCopyHandle?: () => void;
  showScanQR?: boolean;
  onScanQRClose?: () => void;
  showAddPaymentMethod?: boolean;
  onAddPaymentMethodClose?: () => void;
  onAddPaymentMethodSave?: (method: Omit<PaymentMethod, 'id'>, setAsPreferred: boolean) => void;
  selectedPaymentMethod?: PaymentMethod | null;
  onSelectedPaymentMethodClose?: () => void;
  showIPFSAuthOnboarding?: boolean;
  walletAddress?: string | null;
  onIPFSContinue?: () => Promise<void>;
  onIPFSCancel?: () => void;
}

export function AppOverlays({
  inviteModal,
  showNotifications,
  notifications,
  onNotificationsClose,
  onNotificationsMarkAllRead,
  onNotificationClick,
  showChoosePot,
  pots,
  onChoosePotClose,
  onChoosePotCreate,
  onChoosePotSelect,
  showAddMember,
  existingContacts,
  currentMembers,
  onAddMemberClose,
  onAddMemberExisting,
  onInviteNew,
  onAddMemberShowQR,
  canInviteByEmail = true,
}: AppOverlaysProps) {
  return (
    <>
      {inviteModal}

      {showNotifications && (
        <NotificationCenter
          notifications={notifications}
          onClose={onNotificationsClose}
          onMarkAllRead={onNotificationsMarkAllRead}
          onNotificationClick={onNotificationClick}
        />
      )}

      {showChoosePot && (
        <ChoosePot
          pots={pots.filter((pot) => !pot.archived).map((pot) => ({
            id: pot.id,
            name: pot.name,
            myExpenses: pot.expenses.filter((expense) => expense.paidBy === 'owner').length,
            totalExpenses: pot.expenses.length,
            memberCount: pot.members.length,
          }))}
          onClose={onChoosePotClose}
          onCreatePot={onChoosePotCreate}
          onSelectPot={onChoosePotSelect}
        />
      )}

      {showAddMember && (
        <AddMember
          onClose={onAddMemberClose}
          onAddExisting={onAddMemberExisting}
          onInviteNew={onInviteNew}
          onShowQR={onAddMemberShowQR}
          existingContacts={existingContacts}
          currentMembers={currentMembers}
          canInviteByEmail={canInviteByEmail}
        />
      )}

      <Toaster />
    </>
  );
}
