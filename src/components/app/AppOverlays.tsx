import type { ReactNode } from 'react';
import { lazy } from 'react';
import { WalletConnectionSheet } from '../WalletConnectionSheet';
import type { Notification } from '../screens/NotificationCenter';
import { YouSheet } from '../YouSheet';
import { IPFSAuthOnboarding } from '../IPFSAuthOnboarding';
import { Toaster } from '../ui/sonner';
import { TxToast } from '../TxToast';
import type { PaymentMethod } from '../screens/PaymentMethods';

const NotificationCenter = lazy(() =>
  import('../screens/NotificationCenter').then((module) => ({ default: module.NotificationCenter }))
);
const MyQR = lazy(() =>
  import('../screens/MyQR').then((module) => ({ default: module.MyQR }))
);
const ScanQR = lazy(() =>
  import('../screens/ScanQR').then((module) => ({ default: module.ScanQR }))
);
const ChoosePot = lazy(() =>
  import('../screens/ChoosePot').then((module) => ({ default: module.ChoosePot }))
);
const AddPaymentMethod = lazy(() =>
  import('../screens/AddPaymentMethod').then((module) => ({ default: module.AddPaymentMethod }))
);
const ViewPaymentMethod = lazy(() =>
  import('../screens/ViewPaymentMethod').then((module) => ({ default: module.ViewPaymentMethod }))
);
const AddMember = lazy(() =>
  import('../screens/AddMember').then((module) => ({ default: module.AddMember }))
);

type ConnectedWallet = {
  provider: string;
  address: string;
  name?: string;
};

type PotSummary = {
  id: string;
  name: string;
  archived?: boolean;
  expenses: Array<{ paidBy: string }>;
  members: Array<{ id: string }>;
};

type YouSheetInsights = {
  monthlySpending: number;
  topCategory: string;
  topCategoryAmount: number;
  activePots: number;
  totalSettled: number;
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
  showWalletSheet: boolean;
  walletConnected: boolean;
  connectedWallet?: ConnectedWallet;
  onWalletConnect: (provider: string) => void;
  onWalletDisconnect: () => void;
  onWalletClose: () => void;
  showNotifications: boolean;
  notifications: Notification[];
  onNotificationsClose: () => void;
  onNotificationsMarkAllRead: () => void;
  onNotificationClick: (notification: Notification) => void;
  showYouSheet: boolean;
  youSheetInsights: YouSheetInsights;
  onYouSheetClose: () => void;
  onYouShowQR: () => void;
  onYouScanQR: () => void;
  onYouPaymentMethods: () => void;
  onYouViewInsights: () => void;
  onYouSettings: () => void;
  showMyQR: boolean;
  onMyQRClose: () => void;
  onCopyHandle: () => void;
  showScanQR: boolean;
  onScanQRClose: () => void;
  showChoosePot: boolean;
  pots: PotSummary[];
  onChoosePotClose: () => void;
  onChoosePotCreate: () => void;
  onChoosePotSelect: (potId: string) => void;
  showAddPaymentMethod: boolean;
  onAddPaymentMethodClose: () => void;
  onAddPaymentMethodSave: (method: Omit<PaymentMethod, "id">, setAsPreferred: boolean) => void;
  selectedPaymentMethod: PaymentMethod | null;
  onSelectedPaymentMethodClose: () => void;
  showAddMember: boolean;
  existingContacts: Contact[];
  currentMembers: string[];
  onAddMemberClose: () => void;
  onAddMemberExisting: (contactId: string) => void;
  onInviteNew: (nameOrEmail: string) => void;
  onAddMemberShowQR: () => void;
  canInviteByEmail?: boolean;
  showIPFSAuthOnboarding: boolean;
  walletAddress: string | null;
  onIPFSContinue: () => Promise<void>;
  onIPFSCancel: () => void;
}

export function AppOverlays({
  inviteModal,
  showWalletSheet,
  walletConnected,
  connectedWallet,
  onWalletConnect,
  onWalletDisconnect,
  onWalletClose,
  showNotifications,
  notifications,
  onNotificationsClose,
  onNotificationsMarkAllRead,
  onNotificationClick,
  showYouSheet,
  youSheetInsights,
  onYouSheetClose,
  onYouShowQR,
  onYouScanQR,
  onYouPaymentMethods,
  onYouViewInsights,
  onYouSettings,
  showMyQR,
  onMyQRClose,
  onCopyHandle,
  showScanQR,
  onScanQRClose,
  showChoosePot,
  pots,
  onChoosePotClose,
  onChoosePotCreate,
  onChoosePotSelect,
  showAddPaymentMethod,
  onAddPaymentMethodClose,
  onAddPaymentMethodSave,
  selectedPaymentMethod,
  onSelectedPaymentMethodClose,
  showAddMember,
  existingContacts,
  currentMembers,
  onAddMemberClose,
  onAddMemberExisting,
  onInviteNew,
  onAddMemberShowQR,
  canInviteByEmail = true,
  showIPFSAuthOnboarding,
  walletAddress,
  onIPFSContinue,
  onIPFSCancel,
}: AppOverlaysProps) {
  return (
    <>
      {inviteModal}

      {showWalletSheet && (
        <WalletConnectionSheet
          isConnected={walletConnected}
          connectedWallet={connectedWallet}
          onConnect={onWalletConnect}
          onDisconnect={onWalletDisconnect}
          onClose={onWalletClose}
        />
      )}

      {showNotifications && (
        <NotificationCenter
          notifications={notifications}
          onClose={onNotificationsClose}
          onMarkAllRead={onNotificationsMarkAllRead}
          onNotificationClick={onNotificationClick}
        />
      )}

      {showYouSheet && (
        <YouSheet
          onClose={onYouSheetClose}
          onShowQR={onYouShowQR}
          onScanQR={onYouScanQR}
          onPaymentMethods={onYouPaymentMethods}
          onViewInsights={onYouViewInsights}
          onSettings={onYouSettings}
          insights={youSheetInsights}
        />
      )}

      {showMyQR && (
        <MyQR onClose={onMyQRClose} onCopyHandle={onCopyHandle} />
      )}

      {showScanQR && (
        <ScanQR onClose={onScanQRClose} />
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

      {showAddPaymentMethod && (
        <AddPaymentMethod
          onClose={onAddPaymentMethodClose}
          onSave={onAddPaymentMethodSave}
        />
      )}

      {selectedPaymentMethod && (
        <ViewPaymentMethod
          method={selectedPaymentMethod}
          onClose={onSelectedPaymentMethodClose}
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
      <TxToast />

      {showIPFSAuthOnboarding && walletAddress && (
        <IPFSAuthOnboarding
          walletAddress={walletAddress}
          onContinue={onIPFSContinue}
          onCancel={onIPFSCancel}
        />
      )}
    </>
  );
}
