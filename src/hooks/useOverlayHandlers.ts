import { useCallback } from 'react';
import { triggerHaptic } from '../utils/haptics';
import type { PaymentMethod } from '../App';
import type { Notification } from '../components/screens/NotificationCenter';
import type { Screen } from '../nav';
import type { InviteService } from '../services/InviteService';

interface OverlayHandlersDeps {
  setWalletConnected: (v: boolean) => void;
  setConnectedWallet: (v: { provider: string; address: string; name?: string } | undefined) => void;
  setShowWalletSheet: (v: boolean) => void;
  setShowNotifications: (v: boolean) => void;
  setNotifications: (fn: (prev: Notification[]) => Notification[]) => void;
  setShowYouSheet: (v: boolean) => void;
  setShowMyQR: (v: boolean) => void;
  setShowScanQR: (v: boolean) => void;
  setShowChoosePot: (v: boolean) => void;
  setShowAddPaymentMethod: (v: boolean) => void;
  setSelectedPaymentMethod: (v: PaymentMethod | null) => void;
  setPaymentMethods: (fn: (prev: PaymentMethod[]) => PaymentMethod[]) => void;
  setPreferredMethodId: (id: string) => void;
  setShowAddMember: (v: boolean) => void;
  setCurrentPotId: (id: string | null) => void;
  setFabQuickAddPotId: (id: string | null) => void;
  setShowIPFSAuthOnboarding: (v: boolean) => void;
  setPendingIPFSAction: (fn: (() => Promise<void>) | null) => void;
  pendingIPFSAction: (() => Promise<void>) | null;
  push: (screen: Screen) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  inviteService: InviteService;
  fetchInvites: (potId: string) => void;
  currentPotId: string | null;
  isGuest: boolean;
}

export function useOverlayHandlers(deps: OverlayHandlersDeps) {
  const {
    setShowNotifications, setNotifications,
    setShowYouSheet, setShowChoosePot,
    setShowAddPaymentMethod, setSelectedPaymentMethod, setPaymentMethods, setPreferredMethodId,
    setShowAddMember, setCurrentPotId, setFabQuickAddPotId,
    setShowIPFSAuthOnboarding, setPendingIPFSAction, pendingIPFSAction,
    push, showToast, inviteService, fetchInvites, currentPotId, isGuest,
  } = deps;

  const handleWalletConnect = useCallback(() => {}, []);
  const handleWalletDisconnect = useCallback(() => {}, []);
  const handleWalletClose = useCallback(() => {}, []);
  const handleNotificationsClose = useCallback(() => setShowNotifications(false), []);

  const handleNotificationsMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    triggerHaptic('light');
  }, []);

  const handleNotificationClick = useCallback((notification: Notification) => {
    setNotifications((prev) => prev.map((item) => item.id === notification.id ? { ...item, read: true } : item));
    notification.onAction?.();
  }, []);

  const handleYouSheetClose = useCallback(() => setShowYouSheet(false), []);
  const handleYouShowQR = useCallback(() => { setShowYouSheet(false); }, []);
  const handleYouScanQR = useCallback(() => { setShowYouSheet(false); }, []);
  const handleYouPaymentMethods = useCallback(() => { setShowYouSheet(false); }, []);
  const handleYouViewInsights = useCallback(() => { setShowYouSheet(false); }, []);
  const handleYouSettings = useCallback(() => { setShowYouSheet(false); push({ type: 'settings' }); }, [push]);
  const handleMyQRClose = useCallback(() => {}, []);
  const handleCopyHandle = useCallback(() => showToast('Handle copied', 'info'), [showToast]);
  const handleScanQRClose = useCallback(() => {}, []);
  const handleChoosePotClose = useCallback(() => setShowChoosePot(false), []);
  const handleChoosePotCreate = useCallback(() => push({ type: 'create-pot' }), [push]);

  const handleChoosePotSelect = useCallback((potId: string) => {
    setCurrentPotId(potId);
    setFabQuickAddPotId(potId);
    setShowChoosePot(false);
    push({ type: 'pot-home', potId });
  }, [push]);

  const handleAddPaymentMethodClose = useCallback(() => setShowAddPaymentMethod(false), []);

  const handleAddPaymentMethodSave = useCallback((method: Omit<PaymentMethod, 'id'>, setAsPreferred: boolean) => {
    const newId = Date.now().toString();
    setPaymentMethods((prev) => [...prev, { ...method, id: newId }]);
    if (setAsPreferred) setPreferredMethodId(newId);
    setShowAddPaymentMethod(false);
    showToast('Payment method added', 'success');
  }, [showToast]);

  const handleSelectedPaymentMethodClose = useCallback(() => setSelectedPaymentMethod(null), []);
  const handleAddMemberClose = useCallback(() => setShowAddMember(false), []);
  const handleAddMemberShowQR = useCallback(() => { setShowAddMember(false); }, []);

  const handleInviteNew = useCallback((nameOrEmail: string) => {
    const email = nameOrEmail.trim().toLowerCase();
    if (!currentPotId) { showToast('Select a pot first', 'error'); return; }
    if (isGuest) { showToast('Email invites require login. In guest mode, add members from contacts.', 'info'); return; }
    if (!email || !email.includes('@')) { showToast('Enter a valid email address', 'error'); return; }

    (async () => {
      try {
        const { error, token } = await inviteService.createInvite(currentPotId, email);
        if (error) { showToast(error, 'error'); return; }
        const link = `${window.location.origin}/join?token=${token}`;
        try { await navigator.clipboard?.writeText(link); showToast(`Invite sent to ${email}. Link copied.`, 'success'); }
        catch { showToast(`Invite sent to ${email}`, 'success'); }
        fetchInvites(currentPotId);
        setShowAddMember(false);
      } catch (err) {
        console.error('[Invite] unexpected error', err);
        showToast('Failed to send invite', 'error');
      }
    })();
  }, [currentPotId, fetchInvites, inviteService, isGuest, showToast]);

  const handleIPFSContinue = useCallback(async () => {
    setShowIPFSAuthOnboarding(false);
    if (pendingIPFSAction) {
      try { await pendingIPFSAction(); }
      catch (error) { console.error('[App] Pending action failed:', error); showToast('Action failed. Please try again.', 'error'); }
      finally { setPendingIPFSAction(null); }
    }
  }, [pendingIPFSAction, showToast]);

  const handleIPFSCancel = useCallback(() => {
    setShowIPFSAuthOnboarding(false);
    setPendingIPFSAction(null);
  }, []);

  return {
    handleWalletConnect, handleWalletDisconnect, handleWalletClose,
    handleNotificationsClose, handleNotificationsMarkAllRead, handleNotificationClick,
    handleYouSheetClose, handleYouShowQR, handleYouScanQR,
    handleYouPaymentMethods, handleYouViewInsights, handleYouSettings,
    handleMyQRClose, handleCopyHandle, handleScanQRClose,
    handleChoosePotClose, handleChoosePotCreate, handleChoosePotSelect,
    handleAddPaymentMethodClose, handleAddPaymentMethodSave, handleSelectedPaymentMethodClose,
    handleAddMemberClose, handleAddMemberShowQR,
    handleInviteNew, handleIPFSContinue, handleIPFSCancel,
  };
}
