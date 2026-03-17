import { useState } from 'react';
import type { PaymentMethod } from '../components/screens/PaymentMethods';

export const useOverlayState = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWalletSheet, setShowWalletSheet] = useState(false);
  const [showYouSheet, setShowYouSheet] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const [showScanQR, setShowScanQR] = useState(false);
  const [showChoosePot, setShowChoosePot] = useState(false);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [fabQuickAddPotId, setFabQuickAddPotId] = useState<string | null>(null);
  const [showIPFSAuthOnboarding, setShowIPFSAuthOnboarding] = useState(false);
  const [pendingIPFSAction, setPendingIPFSAction] = useState<(() => Promise<void>) | null>(null);

  return {
    showNotifications, setShowNotifications,
    showWalletSheet, setShowWalletSheet,
    showYouSheet, setShowYouSheet,
    showMyQR, setShowMyQR,
    showScanQR, setShowScanQR,
    showChoosePot, setShowChoosePot,
    showAddPaymentMethod, setShowAddPaymentMethod,
    selectedPaymentMethod, setSelectedPaymentMethod,
    showAddMember, setShowAddMember,
    fabQuickAddPotId, setFabQuickAddPotId,
    showIPFSAuthOnboarding, setShowIPFSAuthOnboarding,
    pendingIPFSAction, setPendingIPFSAction,
  };
};
