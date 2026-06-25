import { catchInvestigationV1 } from './catch-investigation-v1';
import { historyInvestigationV1 } from './history-investigation-v1';
import { managementInvestigationV1 } from './management-investigation-v1';
import { payoutInvestigationV1 } from './payout-investigation-v1';
import { tripChapterV1 } from './trip-chapter-v1';
import type { GroupMoneyScenario } from '../types';

export const loopLabScenarios: Record<string, GroupMoneyScenario> = {
  trip: tripChapterV1,
  catch: catchInvestigationV1,
  management: managementInvestigationV1,
  payout: payoutInvestigationV1,
  history: historyInvestigationV1,
};

export function resolveLoopLabScenario(id: string | null): GroupMoneyScenario {
  if (id && loopLabScenarios[id]) {
    return loopLabScenarios[id];
  }
  return tripChapterV1;
}

export {
  catchInvestigationV1,
  historyInvestigationV1,
  managementInvestigationV1,
  payoutInvestigationV1,
  tripChapterV1,
};
