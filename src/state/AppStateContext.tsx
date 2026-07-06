import { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';
import { Action } from './store';
import { AppState } from '../types';
import { createCleanState, reducer } from './store';

const AppStateContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, createCleanState());
  return <AppStateContext.Provider value={{ state, dispatch }}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within AppStateProvider');
  return context;
}
