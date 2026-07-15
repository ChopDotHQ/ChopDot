import { firmaHandoffAdapter } from './adapters/FirmaHandoffAdapter';
import { outsideAdapter } from './adapters/OutsideAdapter';
import { ReferenceHandoffAdapter } from './adapters/ReferenceHandoffAdapter';
import { twintHandoffAdapter } from './adapters/TwintHandoffAdapter';
import type { SettlementAdapter, SettlementRailId } from './types/settlementAdapter';

const adapters: Record<SettlementRailId, SettlementAdapter> = {
  twint: twintHandoffAdapter,
  firma: firmaHandoffAdapter,
  outside: outsideAdapter,
  bank: new ReferenceHandoffAdapter('bank'),
  wise: new ReferenceHandoffAdapter('wise'),
  revolut: new ReferenceHandoffAdapter('revolut'),
  venmo: new ReferenceHandoffAdapter('venmo'),
  cashapp: new ReferenceHandoffAdapter('cashapp'),
  asset_hub: new ReferenceHandoffAdapter('asset_hub'),
  coinage: new ReferenceHandoffAdapter('coinage'),
  dot: new ReferenceHandoffAdapter('dot'),
  pas: new ReferenceHandoffAdapter('pas'),
  paypal: new ReferenceHandoffAdapter('paypal'),
  usdc: new ReferenceHandoffAdapter('usdc'),
};

export function getSettlementAdapter(railId: SettlementRailId): SettlementAdapter {
  return adapters[railId] ?? outsideAdapter;
}

export function resolveHandoffRail(
  preference?: string,
  fallback: SettlementRailId = 'twint',
): SettlementRailId {
  if (preference && preference in adapters) {
    return preference as SettlementRailId;
  }
  return fallback;
}
