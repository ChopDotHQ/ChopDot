import {
  addDotObligation,
  createDotChapter,
  type DotChapter,
  type DotChapterMode,
  type DotParticipant,
} from '../../chopdot-dot/commitmentKernel';
import {
  createTestTokenRail,
  type TestTokenBalance,
  type TestTokenCurrency,
  type TestTokenRailState,
} from '../../chopdot-dot/testTokenRail';

export type DotLabMode = Extract<
  DotChapterMode,
  'savings_circle' | 'emergency_pot' | 'community_fund'
>;

export type DotLabAgent = {
  id: string;
  participantId: string;
  name: string;
  job: string;
  canDo: string[];
  cannotDo: string[];
  visibility: string;
};

export type ReleaseTemplate = {
  title: string;
  requesterId: string;
  recipientId: string;
  amount: number;
  currency: string;
  requiredApproverIds: string[];
};

export type DotLabScenario = {
  mode: DotLabMode;
  label: string;
  job: string;
  accent: string;
  chapter: DotChapter;
  agents: DotLabAgent[];
  releaseTemplate: ReleaseTemplate;
  tokenCurrency: TestTokenCurrency;
  tokenRail: TestTokenRailState;
};

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

function balances(participants: DotParticipant[], currency: TestTokenCurrency): TestTokenBalance[] {
  return participants.map((participant) => ({
    participantId: participant.id,
    currency,
    available: participant.roles.includes('viewer') ? 0 : 1_000,
  }));
}

export function modeFromQuery(value: string | null): DotLabMode | null {
  if (value === 'savings_circle' || value === 'emergency_pot' || value === 'community_fund') {
    return value;
  }
  return null;
}

export function createDotLabScenario(mode: DotLabMode): DotLabScenario {
  if (mode === 'savings_circle') {
    let chapter = createDotChapter({
      id: 'dot-lab-savings',
      name: 'Friday savings circle - round 1',
      mode,
      currency: 'TEST_USD',
      policySummary: 'Members contribute 100 TEST_USD. Leo receives round 1 payout. Missed payments need annotation.',
      participants: savingsParticipants,
      privacyLevel: 'sensitive',
    });
    chapter = addDotObligation(chapter, {
      kind: 'circle_contribution',
      title: 'Leo contribution',
      fromParticipantId: 'leo',
      toParticipantId: 'mina',
      amount: 100,
      currency: 'TEST_USD',
      required: true,
    });
    chapter = addDotObligation(chapter, {
      kind: 'circle_contribution',
      title: 'Nina contribution',
      fromParticipantId: 'nia',
      toParticipantId: 'mina',
      amount: 100,
      currency: 'TEST_USD',
      required: true,
    });
    chapter = addDotObligation(chapter, {
      kind: 'circle_contribution',
      title: 'Omar contribution',
      fromParticipantId: 'omar',
      toParticipantId: 'mina',
      amount: 100,
      currency: 'TEST_USD',
      required: true,
    });
    return {
      mode,
      label: 'Run a savings circle',
      job: 'Track round contributions, missed payments, payout order, and private closeout.',
      accent: '#2f7d68',
      chapter,
      tokenCurrency: 'TEST_USD',
      tokenRail: createTestTokenRail(balances(savingsParticipants, 'TEST_USD')),
      releaseTemplate: {
        title: 'Round 1 payout to Leo',
        requesterId: 'mina',
        recipientId: 'leo',
        amount: 200,
        currency: 'TEST_USD',
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
      id: 'dot-lab-emergency',
      name: 'Medical bridge support for Jordan',
      mode,
      currency: 'TEST_USD',
      policySummary: 'Strict privacy pot. Riley and Taylor approve release readiness.',
      participants: emergencyParticipants,
      privacyLevel: 'strict',
      reasonCategory: 'medical',
      sensitiveReason: 'Private medical details must stay out of exported receipts.',
    });
    chapter = addDotObligation(chapter, {
      kind: 'emergency_contribution',
      title: 'Casey support contribution',
      fromParticipantId: 'casey',
      toParticipantId: 'riley',
      amount: 150,
      currency: 'TEST_USD',
      required: true,
    });
    chapter = addDotObligation(chapter, {
      kind: 'emergency_contribution',
      title: 'Morgan support contribution',
      fromParticipantId: 'morgan',
      toParticipantId: 'riley',
      amount: 100,
      currency: 'TEST_USD',
      required: true,
    });
    return {
      mode,
      label: 'Coordinate emergency help',
      job: 'Collect private support, approve release readiness, and close with redaction.',
      accent: '#9b4d56',
      chapter,
      tokenCurrency: 'TEST_USD',
      tokenRail: createTestTokenRail(balances(emergencyParticipants, 'TEST_USD')),
      releaseTemplate: {
        title: 'Release emergency support',
        requesterId: 'riley',
        recipientId: 'jordan',
        amount: 250,
        currency: 'TEST_USD',
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
    id: 'dot-lab-fund',
    name: 'Builder house community fund - June',
    mode,
    currency: 'TEST_USDC',
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
    currency: 'TEST_USDC',
    required: true,
  });
  chapter = addDotObligation(chapter, {
    kind: 'fund_contribution',
    title: 'Noor June contribution',
    fromParticipantId: 'noor',
    toParticipantId: 'alex',
    amount: 200,
    currency: 'TEST_USDC',
    required: true,
  });
  return {
    mode,
    label: 'Manage a community fund',
    job: 'Track contributions, approvals, releases, and handoff without custody.',
    accent: '#6f5f2f',
    chapter,
    tokenCurrency: 'TEST_USDC',
    tokenRail: createTestTokenRail(balances(fundParticipants, 'TEST_USDC')),
    releaseTemplate: {
      title: 'Pay workshop supplier',
      requesterId: 'alex',
      recipientId: 'jordan',
      amount: 180,
      currency: 'TEST_USDC',
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
