export type RecoveryStep = {
  label: string;
  run: () => Promise<void> | void;
};

export type ActionRecoveryResult<T> = {
  value: T;
  attempts: number;
  recoveredWith: string[];
};

/**
 * Runs an action that may fail, applies recovery steps one-by-one, and retries.
 * Useful for deterministic "fail first, satisfy prerequisites, then pass" flows.
 */
export async function runActionWithRecovery<T>(
  action: () => Promise<T>,
  recoveries: RecoveryStep[]
): Promise<ActionRecoveryResult<T>> {
  const recoveredWith: string[] = [];
  let lastError: unknown;

  for (let attempt = 0; attempt <= recoveries.length; attempt += 1) {
    try {
      const value = await action();
      return { value, attempts: attempt + 1, recoveredWith };
    } catch (error) {
      lastError = error;
      if (attempt === recoveries.length) break;
      const recovery = recoveries[attempt];
      if (!recovery) break;
      await recovery.run();
      recoveredWith.push(recovery.label);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Action failed and recovery steps were exhausted');
}
