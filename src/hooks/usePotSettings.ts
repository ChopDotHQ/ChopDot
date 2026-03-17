import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Pot } from '../types/app';
import { logDev, warnDev } from '../utils/logDev';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PotServiceLike = {
  updatePot: (id: string, updates: Record<string, unknown>) => Promise<unknown>;
};

type UsePotSettingsParams = {
  setPots: Dispatch<SetStateAction<Pot[]>>;
  potService: PotServiceLike;
  usingSupabaseSource: boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  notifyPotRefresh: (potId: string) => void;
};

export const usePotSettings = ({
  setPots,
  potService,
  usingSupabaseSource,
  showToast,
  notifyPotRefresh,
}: UsePotSettingsParams) => {
  const pendingSyncRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      Object.values(pendingSyncRef.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      pendingSyncRef.current = {};
    };
  }, []);

  const updatePotSettings = useCallback(
    (potId: string, settings: Record<string, unknown>) => {
      const normalizedSettings: Partial<Pot> = {};

      if (typeof settings?.potName === 'string') {
        normalizedSettings.name = settings.potName;
      }
      if (typeof settings?.baseCurrency === 'string') {
        normalizedSettings.baseCurrency = settings.baseCurrency;
      }
      if (typeof settings?.budgetEnabled === 'boolean') {
        normalizedSettings.budgetEnabled = settings.budgetEnabled;
      }
      if ('budget' in (settings || {})) {
        normalizedSettings.budget = settings.budget as number | undefined;
      }

      if (Object.keys(normalizedSettings).length === 0) {
        return;
      }

      setPots((prev) =>
        prev.map((pot) => (pot.id === potId ? { ...pot, ...normalizedSettings } : pot)),
      );

      const existingTimeout = pendingSyncRef.current[potId];
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      pendingSyncRef.current[potId] = setTimeout(async () => {
        try {
          if (usingSupabaseSource && !UUID_LIKE_REGEX.test(potId)) {
            logDev('[DataLayer] Skipping remote updatePot settings for local-only pot id', { potId });
            return;
          }

          const updateDto: Record<string, unknown> = { ...normalizedSettings };
          if (typeof updateDto.name === 'string') {
            const trimmed = updateDto.name.trim();
            if (!trimmed) {
              return;
            }
            updateDto.name = trimmed;
          }

          await potService.updatePot(potId, updateDto);
          logDev('[DataLayer] Pot settings updated via service', {
            potId,
            keys: Object.keys(updateDto),
          });
          notifyPotRefresh(potId);
        } catch (error) {
          warnDev('[DataLayer] Service updatePot settings failed', error);
          const message = error instanceof Error ? error.message : String(error);
          showToast(`Saved locally only (sync failed): ${message}`, 'error');
        } finally {
          delete pendingSyncRef.current[potId];
        }
      }, 500);
    },
    [notifyPotRefresh, potService, setPots, showToast, usingSupabaseSource],
  );

  return { updatePotSettings };
};
