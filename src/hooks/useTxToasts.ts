
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

let currentToast: TxToast | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(listener => listener());
}

let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

function clearAutoDismiss() {
  if (autoDismissTimer) {
    clearTimeout(autoDismissTimer);
    autoDismissTimer = null;
  }
}

export function pushTxToast(state: TxState, meta?: TxMeta): string {
  clearAutoDismiss();
  
  const id = Date.now().toString();
  currentToast = { id, state, meta };
  notify();
  
  if (state === 'finalized') {
    autoDismissTimer = setTimeout(() => {
      clearTxToast();
    }, 1500);
  }
  
  return id;
}

export function updateTxToast(state: TxState, meta?: TxMeta) {
  if (!currentToast) return;
  
  clearAutoDismiss();
  
  currentToast = {
    ...currentToast,
    state,
    meta: { ...currentToast.meta, ...meta },
  };
  notify();
  
  if (state === 'finalized') {
    autoDismissTimer = setTimeout(() => {
      clearTxToast();
    }, 1500);
  }
}

export function clearTxToast() {
  clearAutoDismiss();
  currentToast = null;
  notify();
}

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

export function isTxActive(): boolean {
  return currentToast !== null && 
         currentToast.state !== 'finalized' && 
         currentToast.state !== 'error';
}
