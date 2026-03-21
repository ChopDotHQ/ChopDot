import type { ReactNode } from 'react';
import type { PaymentMethod } from '../components/screens/PaymentMethods';
import type { Notification } from '../components/screens/NotificationCenter';
import type { Pot } from '../types/app';

interface YouSheetInsights {
  monthlySpending: number;
  topCategory: string;
  topCategoryAmount: number;
  activePots: number;
  totalSettled: number;
}

interface OverlayPropsInput {
  inviteModal: ReactNode;
  overlayState: {
    showWalletSheet: boolean;
    showNotifications: boolean;
    showYouSheet: boolean;
    showMyQR: boolean;
    showScanQR: boolean;
    showChoosePot: boolean;
    showAddPaymentMethod: boolean;
    selectedPaymentMethod: PaymentMethod | null;
    showAddMember: boolean;
    showIPFSAuthOnboarding: boolean;
  };
  overlayHandlers: {
    handleWalletConnect: (provider: string) => void;
    handleWalletDisconnect: () => void;
    handleWalletClose: () => void;
    handleNotificationsClose: () => void;
    handleNotificationsMarkAllRead: () => void;
    handleNotificationClick: (notification: Notification) => void;
    handleYouSheetClose: () => void;
    handleYouShowQR: () => void;
    handleYouScanQR: () => void;
    handleYouPaymentMethods: () => void;
    handleYouViewInsights: () => void;
    handleYouSettings: () => void;
    handleMyQRClose: () => void;
    handleCopyHandle: () => void;
    handleScanQRClose: () => void;
    handleChoosePotClose: () => void;
    handleChoosePotCreate: () => void;
    handleChoosePotSelect: (potId: string) => void;
    handleAddPaymentMethodClose: () => void;
    handleAddPaymentMethodSave: (method: Omit<PaymentMethod, 'id'>, setAsPreferred: boolean) => void;
    handleSelectedPaymentMethodClose: () => void;
    handleAddMemberClose: () => void;
    handleAddMemberShowQR: () => void;
    handleInviteNew: (nameOrEmail: string) => void;
    handleIPFSContinue: () => Promise<void>;
    handleIPFSCancel: () => void;
  };
  walletConnected: boolean;
  connectedWallet: { provider: string; address: string; name?: string } | undefined;
  notifications: Notification[];
  youTabInsights: YouSheetInsights;
  pots: Pot[];
  currentPotId: string | null;
  existingContacts: { id: string; name: string }[];
  currentMemberIds: string[];
  handleAddMemberExisting: (contactId: string) => void;
  isGuest: boolean;
  walletAddress: string | null;
}

export function buildOverlayProps(input: OverlayPropsInput) {
  const { overlayState: s, overlayHandlers: h } = input;
  return {
    inviteModal: input.inviteModal,
    showWalletSheet: s.showWalletSheet,
    walletConnected: input.walletConnected,
    connectedWallet: input.connectedWallet,
    onWalletConnect: h.handleWalletConnect,
    onWalletDisconnect: h.handleWalletDisconnect,
    onWalletClose: h.handleWalletClose,
    showNotifications: s.showNotifications,
    notifications: input.notifications,
    onNotificationsClose: h.handleNotificationsClose,
    onNotificationsMarkAllRead: h.handleNotificationsMarkAllRead,
    onNotificationClick: h.handleNotificationClick,
    showYouSheet: s.showYouSheet,
    youSheetInsights: input.youTabInsights,
    onYouSheetClose: h.handleYouSheetClose,
    onYouShowQR: h.handleYouShowQR,
    onYouScanQR: h.handleYouScanQR,
    onYouPaymentMethods: h.handleYouPaymentMethods,
    onYouViewInsights: h.handleYouViewInsights,
    onYouSettings: h.handleYouSettings,
    showMyQR: s.showMyQR,
    onMyQRClose: h.handleMyQRClose,
    onCopyHandle: h.handleCopyHandle,
    showScanQR: s.showScanQR,
    onScanQRClose: h.handleScanQRClose,
    showChoosePot: s.showChoosePot,
    pots: input.pots,
    onChoosePotClose: h.handleChoosePotClose,
    onChoosePotCreate: h.handleChoosePotCreate,
    onChoosePotSelect: h.handleChoosePotSelect,
    showAddPaymentMethod: s.showAddPaymentMethod,
    onAddPaymentMethodClose: h.handleAddPaymentMethodClose,
    onAddPaymentMethodSave: h.handleAddPaymentMethodSave,
    selectedPaymentMethod: s.selectedPaymentMethod,
    onSelectedPaymentMethodClose: h.handleSelectedPaymentMethodClose,
    showAddMember: s.showAddMember && !!input.currentPotId,
    existingContacts: input.existingContacts,
    currentMembers: input.currentMemberIds,
    onAddMemberClose: h.handleAddMemberClose,
    onAddMemberExisting: input.handleAddMemberExisting,
    onInviteNew: h.handleInviteNew,
    onAddMemberShowQR: h.handleAddMemberShowQR,
    canInviteByEmail: !input.isGuest,
    showIPFSAuthOnboarding: s.showIPFSAuthOnboarding,
    walletAddress: input.walletAddress,
    onIPFSContinue: h.handleIPFSContinue,
    onIPFSCancel: h.handleIPFSCancel,
  };
}
