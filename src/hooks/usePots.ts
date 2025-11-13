
import { useEffect, useState, useRef } from 'react';
import { useData } from '../services/data/DataContext';
import type { Pot } from '../services/data/types';

let globalRefreshTrigger = 0;

export function usePots(): Pot[] {
  const { pots: potService } = useData();
  const [pots, setPots] = useState<Pot[]>([]);
  const refreshTriggerRef = useRef(0);

  useEffect(() => {
    refreshTriggerRef.current = globalRefreshTrigger;
    
    potService.listPots()
      .then(data => {
        setPots(data);
        
        if (import.meta.env.DEV) {
          console.log('[usePots] Loaded', data.length, 'pots via data layer');
        }
      })
      .catch(error => {
        console.error('[usePots] Failed to load pots:', error);
        setPots([]);
      });
  }, [potService]);

  useEffect(() => {
    const handleRefresh = () => {
      refreshTriggerRef.current = globalRefreshTrigger;
      potService.listPots()
        .then(data => {
          setPots(data);
          if (import.meta.env.DEV) {
            console.log('[usePots] Refreshed, loaded', data.length, 'pots');
          }
        })
        .catch(error => {
          console.error('[usePots] Refresh failed:', error);
        });
    };

    window.addEventListener('pots-refresh', handleRefresh);
    return () => {
      window.removeEventListener('pots-refresh', handleRefresh);
    };
  }, [potService]);

  return pots;
}

export function refreshPots(): void {
  if (import.meta.env.DEV) {
    globalRefreshTrigger++;
    window.dispatchEvent(new CustomEvent('pots-refresh'));
  }
}

