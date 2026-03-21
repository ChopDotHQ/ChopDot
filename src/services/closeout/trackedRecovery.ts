type TrackedPotRecoveryEntry = {
  potId: string;
  closeouts?: unknown[];
  history?: unknown[];
  lastEditAt?: string;
  savedAt: number;
};

const TRACKED_POT_RECOVERY_KEY = 'chopdot_tracked_pot_recovery_v1';

const readRecoveryMap = (): Record<string, TrackedPotRecoveryEntry> => {
  if (typeof localStorage === 'undefined') {
    return {};
  }

  try {
    const raw = localStorage.getItem(TRACKED_POT_RECOVERY_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, TrackedPotRecoveryEntry> : {};
  } catch {
    return {};
  }
};

const writeRecoveryMap = (value: Record<string, TrackedPotRecoveryEntry>) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(TRACKED_POT_RECOVERY_KEY, JSON.stringify(value));
  } catch {
    // Ignore local recovery persistence failures.
  }
};

const toTimestamp = (value?: string) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const saveTrackedPotRecovery = (
  pot: {
    id: string;
    closeouts?: unknown[];
    history?: unknown[];
    lastEditAt?: string;
  },
) => {
  const current = readRecoveryMap();
  current[pot.id] = {
    potId: pot.id,
    closeouts: pot.closeouts,
    history: pot.history,
    lastEditAt: pot.lastEditAt,
    savedAt: Date.now(),
  };
  writeRecoveryMap(current);
};

export const mergeTrackedPotRecovery = <TPot extends {
  id: string;
  closeouts?: unknown[];
  history?: unknown[];
  lastEditAt?: string;
}>(
  pot: TPot | null | undefined,
): TPot | null | undefined => {
  if (!pot) {
    return pot;
  }

  const recovery = readRecoveryMap()[pot.id];
  if (!recovery) {
    return pot;
  }

  const potLastEditAt = toTimestamp(pot.lastEditAt);
  const recoveryLastEditAt = toTimestamp(recovery.lastEditAt);
  const recoveryIsNewer = recoveryLastEditAt >= potLastEditAt;

  const currentCloseouts = pot.closeouts ?? [];
  const currentHistory = pot.history ?? [];
  const recoveryCloseouts = recovery.closeouts ?? currentCloseouts;
  const recoveryHistory = recovery.history ?? currentHistory;

  const shouldUseRecoveryCloseouts =
    recoveryCloseouts.length > currentCloseouts.length ||
    (recoveryCloseouts.length > 0 && currentCloseouts.length === 0) ||
    recoveryIsNewer;
  const shouldUseRecoveryHistory =
    recoveryHistory.length > currentHistory.length ||
    (recoveryHistory.length > 0 && currentHistory.length === 0) ||
    recoveryIsNewer;

  if (!shouldUseRecoveryCloseouts && !shouldUseRecoveryHistory) {
    return pot;
  }

  return {
    ...pot,
    closeouts: shouldUseRecoveryCloseouts ? recoveryCloseouts : currentCloseouts,
    history: shouldUseRecoveryHistory ? recoveryHistory : currentHistory,
    lastEditAt:
      recoveryIsNewer && recovery.lastEditAt
        ? recovery.lastEditAt
        : pot.lastEditAt,
  };
};
