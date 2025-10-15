/**
 * useTxToasts - Module-level transaction toast manager
 * 
 * Manages blockchain transaction status toasts with state transitions:
 * signing → broadcast → inBlock → finalized (or error)
 * 
 * Only one toast visible at a time.
 * Module-level state (no Context API) for lightweight implementation.
 */

import { useState, useEffect } from 'react';

export type TxState = 'signing' | 'broadcast' | 'inBlock' | 'finalized' | 'error';

export interface TxMeta {
  txHash?: string;
  amount?: number;
  currency?: string;
  fee?: number;
  feeCurrency?: string;
  errorMessage?: string;
  blockNumber?: number;
}

export interface TxToast {
  id: string;
  state: TxState;
  meta?: TxMeta;
}

// Module-level state
let currentToast: TxToast | null = null;
const listeners = new Set<() => void>();

// Notify all listeners of state change
function notify() {
  listeners.forEach(listener => listener());
}

// Auto-dismiss timer
let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

function clearAutoDismiss() {
  if (autoDismissTimer) {
    clearTimeout(autoDismissTimer);
    autoDismissTimer = null;
  }
}

/**
 * Push a new transaction toast
 */
export function pushTxToast(state: TxState, meta?: TxMeta): string {
  clearAutoDismiss();
  
  const id = Date.now().toString();
  currentToast = { id, state, meta };
  notify();
  
  // Auto-dismiss finalized state after 1.5s
  if (state === 'finalized') {
    autoDismissTimer = setTimeout(() => {
      clearTxToast();
    }, 1500);
  }
  
  return id;
}

/**
 * Update current toast state
 */
export function updateTxToast(state: TxState, meta?: TxMeta) {
  if (!currentToast) return;
  
  clearAutoDismiss();
  
  currentToast = {
    ...currentToast,
    state,
    meta: { ...currentToast.meta, ...meta },
  };
  notify();
  
  // Auto-dismiss finalized state after 1.5s
  if (state === 'finalized') {
    autoDismissTimer = setTimeout(() => {
      clearTxToast();
    }, 1500);
  }
}

/**
 * Clear current toast
 */
export function clearTxToast() {
  clearAutoDismiss();
  currentToast = null;
  notify();
}

/**
 * React hook to subscribe to toast state
 */
export function useTxToasts() {
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  
  return {
    current: currentToast,
    push: pushTxToast,
    update: updateTxToast,
    clear: clearTxToast,
  };
}

/**
 * Check if a transaction is currently active
 */
export function isTxActive(): boolean {
  return currentToast !== null && 
         currentToast.state !== 'finalized' && 
         currentToast.state !== 'error';
}
