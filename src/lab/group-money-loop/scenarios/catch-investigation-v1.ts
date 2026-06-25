import type { GroupMoneyScenario } from '../types';

/** P1 Catch scoring — mock paths C01, C02, C04, C07 vs C20 anti-pattern */
export const catchInvestigationV1: GroupMoneyScenario = {
  id: 'catch-investigation-v1',
  title: 'P1 Catch — solution paths',
  chapter: 'Summer trip · catch lab',
  skin: 'telegram',
  personas: {
    alex: { name: 'Alex', role: 'Organizer (you)', color: '#2AABEE' },
    sam: { name: 'Sam', role: 'Prompt payer', color: '#53bdeb' },
    jordan: { name: 'Jordan', role: 'Member', color: '#8696a0' },
  },
  steps: [
    {
      id: 'c01-nl',
      beat: 'catch',
      catchSolutionId: 'C01',
      catchMock: 'bot-nl-parse',
      persona: 'sam',
      message: 'I paid €120 for dinner — split 3 ways',
      botReply:
        '📝 Dinner · €120 · paid by Sam · split 3 ways\n[Confirm] [Edit split] [Cancel]',
      chopdotAction:
        'Bot parses NL → pending expense. Tap Confirm in thread (no app open).',
      stateExpectation:
        'Expense pending_confirm → confirmed. Group sees bot reply, not Sheet.',
    },
    {
      id: 'c02-receipt',
      beat: 'catch',
      catchSolutionId: 'C02',
      catchMock: 'bot-receipt-parse',
      persona: 'alex',
      message: '[Photo: receipt €84.50 — trattoria]',
      botReply:
        '🧾 Trattoria · €84.50 total · paid by Alex\nSplit 3? [Confirm] [Edit]',
      chopdotAction:
        'Vision extract total + merchant. Store image ref on expense row.',
      stateExpectation:
        'No manual keying of €84.50. Receipt anchor on record.',
    },
    {
      id: 'c04-email',
      beat: 'catch',
      catchSolutionId: 'C04',
      catchMock: 'email-ingest',
      systemNote: 'Airbnb confirmation email forwarded to pot inbox',
      botReply:
        '📧 Airbnb · €480 · check-in Jun 12\nFrom: booking@airbnb.com · [Add to trip pot]',
      chopdotAction:
        'Forward to expenses+trip@… OR L1 inbox poll. Dedup by message-id.',
      stateExpectation:
        'Large trip expense captured without chat retype. Workshop/flat bills same pipe.',
    },
    {
      id: 'c07-card',
      beat: 'catch',
      catchSolutionId: 'C07',
      catchMock: 'card-group-picker',
      systemNote: 'Card authorized — push before you forget',
      botReply:
        '💳 €47.00 · Coop · just now\nAttach to: [Roommates] [Summer trip] [Personal]',
      chopdotAction:
        'L3: observe card auth webhook → group picker. Untagged = personal only.',
      stateExpectation:
        'Swipe moment captured. Tx ref id on expense when trip selected.',
    },
    {
      id: 'c20-sheet',
      beat: 'catch',
      catchSolutionId: 'C20',
      catchMock: 'sheet-retype',
      persona: 'alex',
      message: '… hang on let me update the Sheet',
      systemNote: 'Anti-pattern — friction + drift',
      chopdotAction:
        'REJECT path: receipt in chat → open Sheet → retype → someone misses update.',
      stateExpectation:
        'Two truths diverge. This is what L0 must eliminate.',
    },
    {
      id: 'catch-exit',
      beat: 'catch',
      systemNote: 'P1 Catch exit proof',
      chopdotAction:
        'Count catch events this chapter. Target: 0 Sheet retypes. Log which path (C01/C02/…) you used.',
      stateExpectation:
        'Ready for P2 Management L0 — facts exist with source refs.',
    },
  ],
};
