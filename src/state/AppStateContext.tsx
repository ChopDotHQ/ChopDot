import { createContext, useContext, useEffect, useReducer, ReactNode, Dispatch } from 'react';
import { Action } from './store';
import { AppState } from '../types';
import { createCleanState, reducer } from './store';
import { appStorage } from '../environment';

const AppStateContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);
const STORAGE_KEY = 'chopdot-portable-shell-state-v1';

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);

  useEffect(() => {
    appStorage.write(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return <AppStateContext.Provider value={{ state, dispatch }}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within AppStateProvider');
  return context;
}

function loadInitialState(): AppState {
  const stored = appStorage.read(STORAGE_KEY);
  if (!stored) {
    return createCleanState();
  }

  try {
    const parsed = JSON.parse(stored) as AppState;
    return {
      ...createCleanState(),
      ...parsed,
      users: parsed.users ?? {},
      groups: parsed.groups ?? {},
      expenses: parsed.expenses ?? {},
      splits: parsed.splits ?? {},
      paymentMethods: parsed.paymentMethods ?? {},
      activityEvents: parsed.activityEvents ?? {},
      savedRecords: parsed.savedRecords ?? {},
    };
  } catch {
    appStorage.remove(STORAGE_KEY);
    return createCleanState();
  }
}
