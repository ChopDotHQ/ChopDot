import type { GroupMoneyScenario } from '../types';

export const historyInvestigationV1: GroupMoneyScenario = {
  id: 'history-investigation-v1',
  title: 'P4 History — finish + handoff',
  chapter: 'Summer trip · history lab',
  skin: 'telegram',
  personas: {
    alex: { name: 'Alex', role: 'Organizer', color: '#2AABEE' },
    sam: { name: 'Sam', role: 'Member', color: '#53bdeb' },
    jordan: { name: 'Jordan', role: 'Member', color: '#8696a0' },
  },
  steps: [
    {
      id: 'h-reject',
      beat: 'end',
      historySolutionId: 'H05',
      historyMock: 'close-gate',
      chopdotAction: 'REJECT H05: Telegram export alone — no structured chapter.',
      stateExpectation: 'Finance cannot ingest chat scroll.',
    },
    {
      id: 'h-gate',
      beat: 'end',
      historySolutionId: 'H01',
      historyMock: 'close-gate',
      botReply: '✅ All legs confirmed · ready to close',
      chopdotAction: '/close only when Management openLegCount === 0.',
      stateExpectation: 'P3 gate satisfied.',
    },
    {
      id: 'h-export',
      beat: 'end',
      historySolutionId: 'H01',
      historyMock: 'export-json',
      persona: 'alex',
      message: '/close',
      botReply:
        '📦 Chapter closed\nsummer-trip-2026.chopdot.json\n[Download] · shared with group',
      chopdotAction: 'H01+H17: versioned JSON in thread. L1: PDF + CSV.',
      stateExpectation: 'Portable handoff for next trip / finance.',
    },
    {
      id: 'h-seal',
      beat: 'end',
      historySolutionId: 'H07',
      historyMock: 'optional-seal',
      chopdotAction: 'H07 PVM or H06 EAS — organizer opt-in, default off.',
      stateExpectation: 'Trust when stakes high; not every coffee.',
    },
    {
      id: 'h-exit',
      beat: 'end',
      systemNote: 'P4 + full loop exit',
      chopdotAction:
        'Would you send this pack to finance / future self? Full loop P1–P4 friction log.',
      stateExpectation: 'Operator Y/N: beats Sheet+chat for next chapter?',
    },
  ],
};
