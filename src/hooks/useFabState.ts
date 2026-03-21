import { useMemo } from 'react';
import { Receipt, CheckCircle, ArrowLeftRight, Plus, type LucideIcon } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import type { Pot } from '../types/app';

interface FabState {
  visible: boolean;
  icon: LucideIcon;
  color: string;
  action: () => void;
}

interface UseFabStateParams {
  screen: { type: string; potId?: string; [key: string]: unknown } | null;
  getActiveTab: () => 'pots' | 'people' | 'activity' | 'you';
  pots: Pot[];
  currentPotId: string | null;
  push: (screen: { type: string; [key: string]: unknown }) => void;
  setCurrentPotId: (id: string | null) => void;
  setFabQuickAddPotId: (id: string | null) => void;
  setSelectedCounterpartyId: (id: string | null) => void;
  showToast: (msg: string, type?: string) => void;
}

export function useFabState({
  screen,
  getActiveTab,
  pots,
  currentPotId,
  push,
  setCurrentPotId,
  setFabQuickAddPotId,
  setSelectedCounterpartyId,
  showToast,
}: UseFabStateParams): FabState {
  const hidden: FabState = useMemo(
    () => ({ visible: false, icon: Receipt, color: 'var(--accent)', action: () => {} }),
    []
  );

  return useMemo(() => {
    const activeTab = getActiveTab();

    if (screen?.type === 'settle-selection' || screen?.type === 'settle-home') {
      return hidden;
    }

    if (screen?.type === 'pot-home') {
      const potForFab = pots.find(p => p.id === (currentPotId || screen.potId));
      if (potForFab?.type === 'savings') {
        return {
          visible: true,
          icon: CheckCircle,
          color: 'var(--money)',
          action: () => {
            triggerHaptic('light');
            setCurrentPotId(potForFab.id);
            push({ type: 'add-contribution' });
          },
        };
      }
      return {
        visible: true,
        icon: Receipt,
        color: 'var(--accent)',
        action: () => {
          triggerHaptic('light');
          if (potForFab) {
            setCurrentPotId(potForFab.id);
            setFabQuickAddPotId(potForFab.id);
            return;
          }
          if (screen.potId) {
            setCurrentPotId(screen.potId as string);
            setFabQuickAddPotId(screen.potId as string);
            return;
          }
          showToast('Unable to open add expense right now. Please retry.', 'error');
        },
      };
    }

    if (activeTab === 'people' || activeTab === 'you') return hidden;

    if (activeTab === 'activity') {
      return {
        visible: true,
        icon: ArrowLeftRight,
        color: 'var(--accent)',
        action: () => {
          triggerHaptic('light');
          setCurrentPotId(null);
          setSelectedCounterpartyId(null);
          push({ type: 'settle-selection' });
        },
      };
    }

    if (activeTab === 'pots') {
      return {
        visible: true,
        icon: Plus,
        color: 'var(--accent)',
        action: () => {
          triggerHaptic('light');
          push({ type: 'create-pot' });
        },
      };
    }

    return hidden;
  }, [screen, getActiveTab, pots, currentPotId, push, setCurrentPotId, setFabQuickAddPotId, setSelectedCounterpartyId, showToast, hidden]);
}
