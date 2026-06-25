import type { GroupMoneyScenario } from '../types';

export const managementInvestigationV1: GroupMoneyScenario = {
  id: 'management-investigation-v1',
  title: 'P2 Management — state spine',
  chapter: 'Summer trip · management lab',
  skin: 'telegram',
  personas: {
    alex: { name: 'Alex', role: 'Organizer (you)', color: '#2AABEE' },
    sam: { name: 'Sam', role: 'Member', color: '#53bdeb' },
    jordan: { name: 'Jordan', role: 'Slow payer', color: '#8696a0' },
  },
  steps: [
    {
      id: 'm-trap',
      beat: 'show',
      managementSolutionId: 'M15',
      managementMock: 'balance-only-trap',
      systemNote: 'Anti-pattern — balance-only UI',
      chopdotAction: 'REJECT: net balance hides stuck legs. Splitwise stops here.',
      stateExpectation: '"Sam owes €40" while Jordan unconfirmed — false calm.',
    },
    {
      id: 'm-open-legs',
      beat: 'show',
      managementSolutionId: 'M03',
      managementMock: 'open-legs-board',
      botReply:
        '📊 Summer trip · 2 open\n• Jordan → Alex €40 · claimed\n• Sam → Alex €20 · open\nNext: Alex confirm Jordan',
      chopdotAction: 'Status board: open items first, not net balance (M03 + L0 SM).',
      stateExpectation: 'Operator sees blockers in one glance — pain C answered.',
    },
    {
      id: 'm-claimed',
      beat: 'show',
      managementSolutionId: 'M01',
      managementMock: 'claimed-not-confirmed',
      persona: 'jordan',
      message: 'Sent you my share on Venmo already',
      chopdotAction: 'Do NOT treat chat claim as confirmed. Leg stays claimed.',
      stateExpectation: 'claimed ≠ confirmed visible to whole group.',
    },
    {
      id: 'm-pin',
      beat: 'show',
      managementSolutionId: 'M02',
      managementMock: 'status-pin',
      botReply: '📌 Pinned: 2 open · Alex acts next · /status',
      chopdotAction: 'M02: pin live status in group. /status matches pin.',
      stateExpectation: '"Check the bot" beats scrolling chat.',
    },
    {
      id: 'm-nudge',
      beat: 'move',
      managementSolutionId: 'M01',
      managementMock: 'next-actor-nudge',
      botReply: '@Jordan confirm €40 to Alex? Reply /confirm or /dispute',
      chopdotAction: 'M01 delta + named next actor — Move without DM archaeology.',
      stateExpectation: 'Group-visible accountability, not shame-DM.',
    },
    {
      id: 'm-exit',
      beat: 'show',
      systemNote: 'P2 Management exit proof',
      chopdotAction: 'Timer: answer "where are we?" via /status in <5s. Log vs Sheet scroll.',
      stateExpectation: 'Ready for P3 — legs have state; payout can bind to leg IDs.',
    },
  ],
};
