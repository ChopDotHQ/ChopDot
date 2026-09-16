const STORAGE_KEY = 'chopdot.integrated-preview.v1';

export const seedState = Object.freeze({
  schemaVersion: 1,
  participant: {
    id: 'participant-devinson-001',
    displayName: 'Devinson',
    mode: 'guest',
    accountLinked: false,
    accountLabel: null,
  },
  selectedGroupId: 'ski-weekend',
  groups: [
    {
      id: 'ski-weekend',
      name: 'Ski Weekend',
      currency: 'CHF',
      archived: false,
      savingsBalance: 240,
      savingsGoal: 600,
      members: [
        { id: 'participant-devinson-001', name: 'Devinson', role: 'Member', status: 'active' },
        { id: 'participant-jeanine-001', name: 'Jeanine', role: 'Member', status: 'active' },
        { id: 'participant-marc-001', name: 'Marc', role: 'Member', status: 'active' },
        { id: 'participant-lea-001', name: 'Lea', role: 'Member', status: 'active' },
      ],
    },
  ],
  expenses: [
    {
      id: 'exp-dinner-001',
      groupId: 'ski-weekend',
      title: 'Dinner',
      amount: 128,
      currency: 'CHF',
      paidBy: 'participant-devinson-001',
      splitWith: ['participant-devinson-001','participant-jeanine-001','participant-marc-001','participant-lea-001'],
      status: 'needs-review',
      createdAt: '2026-09-16T18:00:00+02:00',
    },
    {
      id: 'exp-lift-001',
      groupId: 'ski-weekend',
      title: 'Lift passes',
      amount: 214,
      currency: 'CHF',
      paidBy: 'participant-jeanine-001',
      splitWith: ['participant-devinson-001','participant-jeanine-001'],
      status: 'agreed',
      createdAt: '2026-09-16T17:00:00+02:00',
    },
  ],
  requests: [],
  settlements: [],
  paymentMethods: [
    { id: 'bank-ch', type: 'bank', label: 'Swiss bank', detail: 'CH93 •••• 0000', preferred: true },
    { id: 'polkadot-wallet', type: 'crypto', label: 'Polkadot wallet', detail: '1xF4…9Kq', preferred: false },
  ],
  wallet: { connected: false, address: null, network: 'Polkadot' },
  activity: [
    { id: 'act-1', kind: 'review', title: 'Dinner needs review', detail: 'Ski Weekend · CHF 128', createdAt: '18:02' },
    { id: 'act-2', kind: 'expense', title: 'Jeanine added Lift passes', detail: 'Ski Weekend · CHF 214', createdAt: '17:05' },
  ],
  notifications: [
    { id: 'n-1', title: 'Dinner needs review', read: false },
    { id: 'n-2', title: 'Ski Weekend updated', read: false },
  ],
  imports: [],
  backups: [],
  lastExportAt: null,
  failure: null,
  reviewerMode: false,
  lastJourneyId: '01',
  platformEvents: [],
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(seedState);
    const parsed = JSON.parse(raw);
    if (parsed.schemaVersion !== seedState.schemaVersion) return clone(seedState);
    return parsed;
  } catch {
    return clone(seedState);
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function resetState() {
  const next = clone(seedState);
  saveState(next);
  return next;
}

export function updateState(state, mutator) {
  const next = clone(state);
  mutator(next);
  saveState(next);
  return next;
}

export function selectedGroup(state) {
  return state.groups.find((group) => group.id === state.selectedGroupId) ?? state.groups[0] ?? null;
}

export function selectedGroupExpenses(state) {
  const group = selectedGroup(state);
  if (!group) return [];
  return state.expenses.filter((expense) => expense.groupId === group.id);
}

export function peopleForSelectedGroup(state) {
  return selectedGroup(state)?.members ?? [];
}

export function overallPosition(state) {
  // Deterministic prototype projection, intentionally simple and auditable.
  const group = selectedGroup(state);
  if (!group) return { owedToYou: 0, youOwe: 0, net: 0 };
  let owedToYou = 0;
  let youOwe = 0;
  for (const expense of selectedGroupExpenses(state)) {
    if (!expense.splitWith?.length) continue;
    const share = expense.amount / expense.splitWith.length;
    if (expense.paidBy === state.participant.id) {
      owedToYou += Math.max(0, expense.amount - share);
    } else if (expense.splitWith.includes(state.participant.id)) {
      youOwe += share;
    }
  }
  const settledOut = state.settlements
    .filter((s) => s.groupId === group.id && s.status === 'completed' && s.direction === 'out')
    .reduce((sum, s) => sum + s.amount, 0);
  const settledIn = state.settlements
    .filter((s) => s.groupId === group.id && s.status === 'completed' && s.direction === 'in')
    .reduce((sum, s) => sum + s.amount, 0);
  youOwe = Math.max(0, youOwe - settledOut);
  owedToYou = Math.max(0, owedToYou - settledIn);
  return { owedToYou, youOwe, net: owedToYou - youOwe };
}

export function addActivity(state, entry) {
  state.activity.unshift({
    id: `act-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ...entry,
  });
}

export function markJourney(state, journeyId) {
  state.lastJourneyId = journeyId;
}

export function injectFailure(state, kind, returnRoute = 'home') {
  state.failure = {
    kind,
    returnRoute,
    createdAt: new Date().toISOString(),
    attempt: 1,
  };
  addActivity(state, {
    kind: 'recovery',
    title: 'Something needs reconciliation',
    detail: kind.replaceAll('-', ' '),
  });
}
