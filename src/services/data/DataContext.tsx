/**
 * Data Context
 * 
 * Provides data layer services via React context.
 * Instantiates repositories and services based on VITE_DATA_SOURCE flag.
 * 
 * Usage:
 * ```tsx
 * const { pots, expenses } = useData();
 * const allPots = await pots.listPots();
 * ```
 */

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { LocalStorageSource } from './sources/LocalStorageSource';
import { HttpSource } from './sources/HttpSource';
import { PotRepository } from './repositories/PotRepository';
import { ExpenseRepository } from './repositories/ExpenseRepository';
import { MemberRepository } from './repositories/MemberRepository';
import { SettlementRepository } from './repositories/SettlementRepository';
import { PotService } from './services/PotService';
import { ExpenseService } from './services/ExpenseService';
import { MemberService } from './services/MemberService';
import { SettlementService } from './services/SettlementService';
import type { DataSource } from './repositories/PotRepository';

interface DataContextValue {
  pots: PotService;
  expenses: ExpenseService;
  members: MemberService;
  settlements: SettlementService;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

/**
 * Data Provider
 * 
 * Creates service instances based on VITE_DATA_SOURCE environment variable.
 * Default: 'local' (uses LocalStorageSource)
 * Future: 'api' (uses HttpSource)
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const services = useMemo(() => {
    // Determine data source from environment variable
    const dataSource = import.meta.env.VITE_DATA_SOURCE || 'local';
    
    // Create source instance
    const source: DataSource = dataSource === 'api'
      ? new HttpSource()
      : new LocalStorageSource();

    // Create repositories with appropriate TTLs
    const potRepo = new PotRepository(source, 60_000); // 60s TTL
    const expenseRepo = new ExpenseRepository(source, 5_000); // 5s TTL
    const memberRepo = new MemberRepository(source);
    const settlementRepo = new SettlementRepository(300_000); // 5m TTL

    // Create services
    const potService = new PotService(potRepo);
    const expenseService = new ExpenseService(expenseRepo, potRepo);
    const memberService = new MemberService(memberRepo);
    const settlementService = new SettlementService(settlementRepo, potRepo);

    return {
      pots: potService,
      expenses: expenseService,
      members: memberService,
      settlements: settlementService,
    };
  }, []); // Empty deps - services are stable

  return (
    <DataContext.Provider value={services}>
      {children}
    </DataContext.Provider>
  );
}

/**
 * Hook to access data services
 * 
 * @throws Error if used outside DataProvider
 */
export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}

