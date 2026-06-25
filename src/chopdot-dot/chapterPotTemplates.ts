import type {
  ChapterPotAgent,
  ChapterPotEvent,
  ChapterPotMode,
  ChapterPotReleaseTemplate,
  Pot,
} from '../types/app';
import {
  addDotObligation,
  createDotChapter,
  type DotChapter,
  type DotParticipant,
} from './commitmentKernel';
import {
  createTestTokenRail,
  type TestTokenBalance,
  type TestTokenCurrency,
  type TestTokenRailState,
} from './testTokenRail';

type ChapterPotTemplate = {
  mode: ChapterPotMode;
  label: string;
  name: string;
  type: Pot['type'];
  baseCurrency: Pot['baseCurrency'];
  chapter: DotChapter;
  agents: ChapterPotAgent[];
  releaseTemplate: ChapterPotReleaseTemplate;
  tokenCurrency: TestTokenCurrency;
  rail: TestTokenRailState;
};

const now = () => new Date().toISOString();

const initialEvents = (label: string): ChapterPotEvent[] => [
  {
    id: 'dot_event_1',
    actor: 'ChopDot',
    label: 'Opened',
    detail: label,
    kind: 'info',
  },
];

function balances(participants: DotParticipant[], currency: TestTokenCurrency): TestTokenBalance[] {
  return participants.map((participant) => ({
    participantId: participant.id,
    currency,
    available: participant.roles.includes('viewer') ? 0 : 1_000,
  }));
}

const sharedExpenseParticipants: DotParticipant[] = [
  { id: 'mina', name: 'Mina', roles: ['organizer', 'treasurer', 'approver', 'receiver'] },
  { id: 'leo', name: 'Leo', roles: ['contributor', 'payer'] },
  { id: 'nia', name: 'Nina', roles: ['contributor'] },
  { id: 'omar', name: 'Omar', roles: ['contributor'] },
  { id: 'vera', name: 'Vera', roles: ['viewer'] },
];

const savingsParticipants: DotParticipant[] = [
  { id: 'mina', name: 'Mina', roles: ['organizer', 'treasurer', 'approver'] },
  { id: 'leo', name: 'Leo', roles: ['contributor', 'receiver'] },
  { id: 'nia', name: 'Nina', roles: ['contributor'] },
  { id: 'omar', name: 'Omar', roles: ['contributor', 'payer'] },
  { id: 'vera', name: 'Vera', roles: ['viewer'] },
];

const emergencyParticipants: DotParticipant[] = [
  { id: 'riley', name: 'Riley', roles: ['organizer', 'treasurer', 'approver'] },
  { id: 'taylor', name: 'Taylor', roles: ['approver'] },
  { id: 'casey', name: 'Casey', roles: ['contributor', 'payer'] },
  { id: 'morgan', name: 'Morgan', roles: ['contributor'] },
  { id: 'jordan', name: 'Jordan', roles: ['receiver'] },
  { id: 'lee', name: 'Lee', roles: ['viewer'] },
];

const fundParticipants: DotParticipant[] = [
  { id: 'alex', name: 'Alex', roles: ['organizer', 'treasurer', 'approver'] },
  { id: 'priya', name: 'Priya', roles: ['approver'] },
  { id: 'sam', name: 'Sam', roles: ['contributor', 'payer'] },
  { id: 'jordan', name: 'Jordan', roles: ['receiver'] },
  { id: 'noor', name: 'Noor', roles: ['contributor'] },
  { id: 'vera', name: 'Vera', roles: ['viewer'] },
];

function potMembers(participants: DotParticipant[]): Pot['members'] {
  return participants.map((participant, index) => ({
    id: participant.id,
    name: participant.name,
    role: index === 0 ? 'Owner' : 'Member',
    status: 'active',
  }));
}

export function createChapterPotTemplate(mode: ChapterPotMode): ChapterPotTemplate {
  if (mode === 'shared_expense') {
    let chapter = createDotChapter({
      id: 'dot-shared-expense-chapter',
      name: 'Dinner split - June',
      mode,
      currency: 'USD',
      policySummary: 'Friends split dinner. Each person marks paid and Mina confirms what arrived.',
      participants: sharedExpenseParticipants,
      privacyLevel: 'standard',
    });
    chapter = addDotObligation(chapter, {
      kind: 'expense_leg',
      title: 'Leo dinner share',
      fromParticipantId: 'leo',
      toParticipantId: 'mina',
      amount: 80,
      currency: 'USD',
      required: true,
    });
    chapter = addDotObligation(chapter, {
      kind: 'expense_leg',
      title: 'Nina dinner share',
      fromParticipantId: 'nia',
      toParticipantId: 'mina',
      amount: 75,
      currency: 'USD',
      required: true,
    });
    chapter = addDotObligation(chapter, {
      kind: 'expense_leg',
      title: 'Omar dinner share',
      fromParticipantId: 'omar',
      toParticipantId: 'mina',
      amount: 70,
      currency: 'USD',
      required: true,
    });
    return {
      mode,
      label: 'Split a group expense',
      name: 'Dinner split',
      type: 'expense',
      baseCurrency: 'USD',
      chapter,
      tokenCurrency: 'TEST_USD',
      rail: createTestTokenRail(balances(sharedExpenseParticipants, 'TEST_USD')),
      releaseTemplate: {
        title: 'Release dinner reimbursement to Mina',
        requesterId: 'mina',
        recipientId: 'mina',
        amount: 225,
        currency: 'USD',
        requiredApproverIds: ['mina'],
      },
      agents: [
        { id: 'payer-leo', participantId: 'leo', name: 'Leo', job: 'Dinner payer', canDo: ['claim contribution'], cannotDo: ['confirm own payment'], visibility: 'own dinner share' },
        { id: 'organizer', participantId: 'mina', name: 'Mina', job: 'Organizer / receiver', canDo: ['confirm', 'approve', 'close'], cannotDo: ['pretend payment happened'], visibility: 'full split status' },
        { id: 'payer-nina', participantId: 'nia', name: 'Nina', job: 'Dinner payer', canDo: ['claim contribution'], cannotDo: ['release funds'], visibility: 'own dinner share' },
        { id: 'payer-omar', participantId: 'omar', name: 'Omar', job: 'Dinner payer', canDo: ['claim contribution'], cannotDo: ['close split'], visibility: 'own dinner share' },
        { id: 'viewer', participantId: 'vera', name: 'Vera', job: 'Viewer / reviewer', canDo: ['read status'], cannotDo: ['mutate split'], visibility: 'group status' },
      ],
    };
  }

  if (mode === 'savings_circle') {
    let chapter = createDotChapter({
      id: 'dot-savings-circle-chapter',
      name: 'Friday savings circle - round 1',
      mode,
      currency: 'USD',
      policySummary: 'Members contribute $100. Leo receives round 1 payout. Missed payments need a note.',
      participants: savingsParticipants,
      privacyLevel: 'sensitive',
    });
    chapter = addDotObligation(chapter, {
      kind: 'circle_contribution',
      title: 'Leo contribution',
      fromParticipantId: 'leo',
      toParticipantId: 'mina',
      amount: 100,
      currency: 'USD',
      required: true,
    });
    chapter = addDotObligation(chapter, {
      kind: 'circle_contribution',
      title: 'Nina contribution',
      fromParticipantId: 'nia',
      toParticipantId: 'mina',
      amount: 100,
      currency: 'USD',
      required: true,
    });
    chapter = addDotObligation(chapter, {
      kind: 'circle_contribution',
      title: 'Omar contribution',
      fromParticipantId: 'omar',
      toParticipantId: 'mina',
      amount: 100,
      currency: 'USD',
      required: true,
    });
    return {
      mode,
      label: 'Run a savings circle',
      name: 'Friday savings circle',
      type: 'expense',
      baseCurrency: 'USD',
      chapter,
      tokenCurrency: 'TEST_USD',
      rail: createTestTokenRail(balances(savingsParticipants, 'TEST_USD')),
      releaseTemplate: {
        title: 'Round 1 payout to Leo',
        requesterId: 'mina',
        recipientId: 'leo',
        amount: 200,
        currency: 'USD',
        requiredApproverIds: ['mina'],
      },
      agents: [
        { id: 'on-time-member', participantId: 'leo', name: 'Leo', job: 'On-time member / receiver', canDo: ['claim contribution', 'confirm payout'], cannotDo: ['close round'], visibility: 'own contribution and payout' },
        { id: 'organizer', participantId: 'mina', name: 'Mina', job: 'Organizer / treasurer', canDo: ['confirm', 'approve', 'annotate', 'close'], cannotDo: ['pretend payment happened'], visibility: 'full round status' },
        { id: 'missed-member', participantId: 'nia', name: 'Nina', job: 'Missed-payment member', canDo: ['claim contribution'], cannotDo: ['hide miss'], visibility: 'own contribution' },
        { id: 'payer', participantId: 'omar', name: 'Omar', job: 'Payer member', canDo: ['claim contribution', 'record release'], cannotDo: ['confirm own release'], visibility: 'round status' },
        { id: 'viewer', participantId: 'vera', name: 'Vera', job: 'Viewer / auditor', canDo: ['read status'], cannotDo: ['approve or close'], visibility: 'scoped status only' },
      ],
    };
  }

  if (mode === 'emergency_pot') {
    let chapter = createDotChapter({
      id: 'dot-emergency-pot-chapter',
      name: 'Emergency support for Jordan',
      mode,
      currency: 'USD',
      policySummary: 'Private support pot. Riley and Taylor approve release readiness.',
      participants: emergencyParticipants,
      privacyLevel: 'strict',
      reasonCategory: 'medical',
      sensitiveReason: 'Private medical details must stay out of exported receipts.',
    });
    chapter = addDotObligation(chapter, {
      kind: 'emergency_contribution',
      title: 'Casey support',
      fromParticipantId: 'casey',
      toParticipantId: 'riley',
      amount: 150,
      currency: 'USD',
      required: true,
    });
    chapter = addDotObligation(chapter, {
      kind: 'emergency_contribution',
      title: 'Morgan support',
      fromParticipantId: 'morgan',
      toParticipantId: 'riley',
      amount: 100,
      currency: 'USD',
      required: true,
    });
    return {
      mode,
      label: 'Coordinate emergency help',
      name: 'Emergency support for Jordan',
      type: 'expense',
      baseCurrency: 'USD',
      chapter,
      tokenCurrency: 'TEST_USD',
      rail: createTestTokenRail(balances(emergencyParticipants, 'TEST_USD')),
      releaseTemplate: {
        title: 'Release emergency support',
        requesterId: 'riley',
        recipientId: 'jordan',
        amount: 250,
        currency: 'USD',
        requiredApproverIds: ['riley', 'taylor'],
      },
      agents: [
        { id: 'contributor', participantId: 'casey', name: 'Casey', job: 'Contributor', canDo: ['claim contribution'], cannotDo: ['approve release'], visibility: 'own contribution' },
        { id: 'organizer', participantId: 'riley', name: 'Riley', job: 'Organizer', canDo: ['confirm', 'approve', 'close'], cannotDo: ['publish private reason'], visibility: 'private operational status' },
        { id: 'contributor-two', participantId: 'morgan', name: 'Morgan', job: 'Contributor', canDo: ['claim contribution'], cannotDo: ['see recipient private details'], visibility: 'own contribution' },
        { id: 'approver', participantId: 'taylor', name: 'Taylor', job: 'Approver', canDo: ['approve release'], cannotDo: ['claim recipient confirmation'], visibility: 'release readiness' },
        { id: 'recipient', participantId: 'jordan', name: 'Jordan', job: 'Recipient', canDo: ['confirm release'], cannotDo: ['see donor wall'], visibility: 'minimum necessary status' },
        { id: 'viewer', participantId: 'lee', name: 'Lee', job: 'Privacy viewer', canDo: ['read redacted status'], cannotDo: ['see sensitive reason'], visibility: 'redacted status' },
      ],
    };
  }

  let chapter = createDotChapter({
    id: 'dot-community-fund-chapter',
    name: 'Builder house fund - June',
    mode,
    currency: 'USDC',
    policySummary: 'Two approvers required. External payments need receiver confirmation.',
    participants: fundParticipants,
    privacyLevel: 'sensitive',
  });
  chapter = addDotObligation(chapter, {
    kind: 'fund_contribution',
    title: 'Sam June contribution',
    fromParticipantId: 'sam',
    toParticipantId: 'alex',
    amount: 300,
    currency: 'USDC',
    required: true,
  });
  chapter = addDotObligation(chapter, {
    kind: 'fund_contribution',
    title: 'Noor June contribution',
    fromParticipantId: 'noor',
    toParticipantId: 'alex',
    amount: 200,
    currency: 'USDC',
    required: true,
  });
  return {
    mode,
    label: 'Manage a community fund',
    name: 'Builder house community fund',
    type: 'expense',
    baseCurrency: 'USDC',
    chapter,
    tokenCurrency: 'TEST_USDC',
    rail: createTestTokenRail(balances(fundParticipants, 'TEST_USDC')),
    releaseTemplate: {
      title: 'Pay workshop supplier',
      requesterId: 'alex',
      recipientId: 'jordan',
      amount: 180,
      currency: 'USDC',
      requiredApproverIds: ['alex', 'priya'],
    },
    agents: [
      { id: 'payer', participantId: 'sam', name: 'Sam', job: 'Contributor / payer', canDo: ['claim contribution', 'record release'], cannotDo: ['approve for Priya'], visibility: 'own contribution and payment claim' },
      { id: 'admin', participantId: 'alex', name: 'Alex', job: 'Admin / approver', canDo: ['confirm', 'approve', 'close'], cannotDo: ['skip receiver confirmation'], visibility: 'fund period status' },
      { id: 'approver-two', participantId: 'priya', name: 'Priya', job: 'Second approver', canDo: ['approve release'], cannotDo: ['record payment claim'], visibility: 'approval status' },
      { id: 'contributor', participantId: 'noor', name: 'Noor', job: 'Contributor', canDo: ['claim contribution'], cannotDo: ['close period'], visibility: 'own contribution' },
      { id: 'receiver', participantId: 'jordan', name: 'Jordan', job: 'Receiver', canDo: ['confirm release'], cannotDo: ['approve spend'], visibility: 'receiver confirmation' },
      { id: 'viewer', participantId: 'vera', name: 'Vera', job: 'Next treasurer / reviewer', canDo: ['read handoff'], cannotDo: ['mutate period'], visibility: 'handoff status' },
    ],
  };
}

export function createChapterPot(mode: ChapterPotMode, id?: string): Pot {
  const template = createChapterPotTemplate(mode);
  return {
    id: id ?? `dot-${mode}`,
    name: template.name,
    type: template.type,
    baseCurrency: template.baseCurrency,
    members: potMembers(template.chapter.participants),
    expenses: [],
    budgetEnabled: false,
    checkpointEnabled: false,
    mode: 'auditable',
    confirmationsEnabled: true,
    archived: false,
    history: [],
    closeouts: [],
    chapterMode: mode,
    dotChapter: template.chapter,
    dotAgents: template.agents,
    dotActiveAgentId: template.agents[0]?.id,
    dotRail: template.rail,
    dotEvents: initialEvents(template.label),
    dotReleaseTemplate: template.releaseTemplate,
    createdAt: now(),
    lastEditAt: now(),
  };
}

export function createDefaultChapterPots(): Pot[] {
  return [
    createChapterPot('shared_expense', 'dot-shared-expense'),
    createChapterPot('savings_circle', 'dot-savings-circle'),
    createChapterPot('emergency_pot', 'dot-emergency-pot'),
    createChapterPot('community_fund', 'dot-community-fund'),
  ];
}

export function ensureChapterPots(pots: Pot[]): Pot[] {
  const defaults = createDefaultChapterPots();
  const existing = new Set(pots.map((pot) => pot.id));
  const missing = defaults.filter((pot) => !existing.has(pot.id));
  return missing.length > 0 ? [...pots, ...missing] : pots;
}
