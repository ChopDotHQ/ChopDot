import type {AppState, Expense, Split} from '../types.ts';
import {canonicalJson, sha256Hex} from './canonical.ts';
import {
  addMoney, assertConservation, assertMoney, moneyEquals, moneyFromDecimal, moneyFromMinorUnits, type MoneyV1,
} from './money.ts';

export const LEGACY_SUPPORTED_CURRENCY_EXPONENTS_V1 = Object.freeze({
  CHF: 2,
  EUR: 2,
  GBP: 2,
  USD: 2,
  PAS: 12,
} as const);

export type LegacyAssessmentVerdictV1 = 'ready_for_review' | 'quarantined' | 'superseded_by_authority';
export type LegacyAssessmentReasonCodeV1 =
  | 'authority_journal_exists'
  | 'currency_missing'
  | 'currency_unsupported'
  | 'closed_record_missing'
  | 'closed_record_group_mismatch'
  | 'expense_id_mismatch'
  | 'expense_orphaned'
  | 'group_id_mismatch'
  | 'group_member_duplicate'
  | 'group_member_missing'
  | 'group_name_missing'
  | 'money_ambiguous'
  | 'money_not_conserved'
  | 'number_nonfinite'
  | 'payer_not_member'
  | 'payer_allocation_missing'
  | 'saved_record_id_mismatch'
  | 'saved_record_orphaned'
  | 'saved_record_split_duplicate'
  | 'saved_record_split_mismatch'
  | 'split_id_mismatch'
  | 'split_orphaned'
  | 'split_participant_not_member'
  | 'split_participant_duplicate'
  | 'status_unknown'
  | 'user_id_mismatch';

export interface LegacyGroupAssessmentV1 {
  v: 1;
  groupId: string;
  verdict: LegacyAssessmentVerdictV1;
  reasonCodes: LegacyAssessmentReasonCodeV1[];
  findings: Array<{code: LegacyAssessmentReasonCodeV1; path: string}>;
  sourceClaims: {
    name: string;
    memberIds: string[];
    publicKeyStringsPresent: string[];
    legacyStatuses: Array<{splitId: string; status: string}>;
    closedRecordId?: string;
  };
  observations: {
    expenses: Record<string, MigratedLegacyExpenseV1>;
    shares: Record<string, MigratedLegacyShareV1>;
    currencyTotals: Record<string, MoneyV1>;
  };
  authorityClaims: 'unproven';
}

export interface LegacyMigrationAssessmentV1 {
  v: 1;
  kind: 'legacy-migration-assessment';
  source: 'legacy-portable-shell';
  digestDomain: 'chopdot:legacy-assessment:v1';
  sourcePacket: unknown;
  sourceDigest: string;
  authorityGroupIds: string[];
  authorityContextDigest: string;
  assessmentDigest: string;
  sourceReasonCodes: LegacyAssessmentReasonCodeV1[];
  sourceFindings: Array<{code: LegacyAssessmentReasonCodeV1; path: string}>;
  overallVerdict: 'ready_for_review' | 'quarantined' | 'contains_superseded_groups';
  sourceEvidence: {userIds: string[]; groupIds: string[]; expenseIds: string[]; splitIds: string[]; savedRecordIds: string[]};
  groups: Record<string, LegacyGroupAssessmentV1>;
  createsAuthority: false;
}

export interface LegacyAssessmentPersistence {
  readLegacyAssessment(recordId: string): Promise<unknown | null>;
  putLegacyAssessmentIfAbsent(recordId: string, value: LegacyMigrationAssessmentV1): Promise<'stored' | 'exists'>;
}

export interface LegacyAssessmentBootstrapStore extends LegacyAssessmentPersistence {
  listGroupIds(): Promise<string[]>;
}

export interface LegacyAssessmentBootstrapResultV1 {
  assessment: LegacyMigrationAssessmentV1;
  outcome: 'persisted' | 'duplicate';
  authorityGroupIds: string[];
}

export interface LegacyAssessmentSummaryV1 {
  sourceDigest: string;
  authorityContextDigest: string;
  assessmentDigest: string;
  overallVerdict: LegacyMigrationAssessmentV1['overallVerdict'];
  groupVerdicts: Record<string, LegacyAssessmentVerdictV1>;
  createsAuthority: false;
}

export interface MigratedLegacyShareV1 {
  shareId: string;
  expenseId: string;
  participantId: string;
  amount: MoneyV1;
  status: 'open' | 'requested' | 'marked_paid' | 'cleared' | 'received';
}
export interface MigratedLegacyExpenseV1 {expenseId: string; description: string; paidBy: string; total: MoneyV1}
export interface MigratedLegacyGroupV1 {
  v: 1;
  source: 'legacy-portable-shell';
  groupId: string;
  name: string;
  memberIds: string[];
  needsAccountBinding: boolean;
  expenses: Record<string, MigratedLegacyExpenseV1>;
  shares: Record<string, MigratedLegacyShareV1>;
  currencyTotals: Record<string, MoneyV1>;
  closedRecordId?: string;
}
export interface LegacyMigrationResultV1 {
  v: 1;
  groups: Record<string, MigratedLegacyGroupV1>;
  quarantined: Array<{groupId: string; reason: string}>;
  stateHash: string;
}

export interface MainAppExpenseRowV1 {
  id: string;
  pot_id: string;
  amount_minor: string;
  currency_code: string;
  paid_by: string;
  description?: string | null;
}

export interface MainAppSplitRowV1 {
  id: string;
  expense_id: string;
  member_id: string;
  amount_minor: string;
}

export interface MainAppMoneyMigrationV1 {
  v: 1;
  source: 'main-app-normalized-supabase';
  expenses: Record<string, {expenseId: string; potId: string; paidBy: string; description: string; total: MoneyV1; allocations: Array<{participantId: string; amount: MoneyV1}>}>;
  quarantined: Array<{expenseId: string; reason: string}>;
  stateHash: string;
}

export async function assessLegacyAppState(
  stateValue: AppState,
  authorityGroupIds: readonly string[] = [],
): Promise<LegacyMigrationAssessmentV1> {
  const state = structuredClone(stateValue);
  if (authorityGroupIds.some(value => !isCanonicalOpaqueIdentifier(value))) {
    throw new Error('Legacy assessment authority identifiers are invalid.');
  }
  const canonicalAuthorityIds = [...new Set(authorityGroupIds)].sort(compareStrings);
  const authorityIds = new Set(canonicalAuthorityIds);
  const relevantSource = migrationRelevantSourcePacket(state);
  const sourcePacket = encodeLegacySourceValue(relevantSource);
  const sourceDigest = await sha256Hex(canonicalJson(sourcePacket));
  const authorityContextDigest = await sha256Hex(canonicalJson({domain: 'chopdot:legacy-authority-context:v1', groupIds: canonicalAuthorityIds}));
  const sourceReasons = new Set<LegacyAssessmentReasonCodeV1>();
  const sourceFindingPaths = new Map<LegacyAssessmentReasonCodeV1, Set<string>>();
  const groupReasons = new Map<string, Set<LegacyAssessmentReasonCodeV1>>();
  const groupFindingPaths = new Map<string, Map<LegacyAssessmentReasonCodeV1, Set<string>>>();
  const addSourceReason = (reason: LegacyAssessmentReasonCodeV1, path: string) => {
    sourceReasons.add(reason);
    addFindingPath(sourceFindingPaths, reason, path);
  };
  const addReason = (groupId: string | undefined, reason: LegacyAssessmentReasonCodeV1, path: string) => {
    if (!groupId || !state.groups[groupId]) {
      addSourceReason(reason, path);
      return;
    }
    const reasons = groupReasons.get(groupId) ?? new Set<LegacyAssessmentReasonCodeV1>();
    reasons.add(reason);
    groupReasons.set(groupId, reasons);
    const paths = groupFindingPaths.get(groupId) ?? new Map<LegacyAssessmentReasonCodeV1, Set<string>>();
    addFindingPath(paths, reason, path);
    groupFindingPaths.set(groupId, paths);
  };
  if (containsNonFiniteNumber(relevantSource)) addSourceReason('number_nonfinite', '/');

  for (const [key, user] of sortedEntries(state.users)) {
    if (!isCanonicalOpaqueIdentifier(key) || user.id !== key) addSourceReason('user_id_mismatch', `/users/${jsonPointer(key)}/id`);
  }
  for (const [key, group] of sortedEntries(state.groups)) {
    if (!isCanonicalOpaqueIdentifier(key) || group.id !== key) addReason(key, 'group_id_mismatch', `/groups/${jsonPointer(key)}/id`);
    if (!group.name?.trim()) addReason(key, 'group_name_missing', `/groups/${jsonPointer(key)}/name`);
    if (group.memberIds.some(value => !isCanonicalOpaqueIdentifier(value) || !state.users[value])) {
      addReason(key, 'group_member_missing', `/groups/${jsonPointer(key)}/memberIds`);
    }
    if (new Set(group.memberIds).size !== group.memberIds.length) {
      addReason(key, 'group_member_duplicate', `/groups/${jsonPointer(key)}/memberIds`);
    }
  }
  for (const [key, expense] of sortedEntries(state.expenses)) {
    const root = `/expenses/${jsonPointer(key)}`;
    if (!isCanonicalOpaqueIdentifier(key) || expense.id !== key) addReason(expense.groupId, 'expense_id_mismatch', `${root}/id`);
    if (!isCanonicalOpaqueIdentifier(expense.groupId) || !state.groups[expense.groupId]) addReason(undefined, 'expense_orphaned', `${root}/groupId`);
  }
  for (const [key, split] of sortedEntries(state.splits)) {
    const root = `/splits/${jsonPointer(key)}`;
    if (!isCanonicalOpaqueIdentifier(key) || split.id !== key) {
      addReason(state.expenses[split.expenseId]?.groupId, 'split_id_mismatch', `${root}/id`);
    }
    if (!isCanonicalOpaqueIdentifier(split.expenseId) || !state.expenses[split.expenseId]) addReason(undefined, 'split_orphaned', `${root}/expenseId`);
  }
  for (const [key, record] of sortedEntries(state.savedRecords)) {
    const root = `/savedRecords/${jsonPointer(key)}`;
    if (!isCanonicalOpaqueIdentifier(key) || record.id !== key) addReason(record.groupId, 'saved_record_id_mismatch', `${root}/id`);
    if (!isCanonicalOpaqueIdentifier(record.groupId) || !state.groups[record.groupId]) addReason(undefined, 'saved_record_orphaned', `${root}/groupId`);
    if (new Set(record.splits.map(split => split.id)).size !== record.splits.length) addReason(record.groupId, 'saved_record_split_duplicate', `${root}/splits`);
    if (record.splits.some(split => !state.splits[split.id]
      || state.splits[split.id].expenseId !== split.expenseId
      || state.expenses[split.expenseId]?.groupId !== record.groupId)) {
      addReason(record.groupId, 'saved_record_split_mismatch', `${root}/splits`);
    }
  }
  for (const [groupKey, group] of sortedEntries(state.groups)) {
    if (!group.closedRecordId) continue;
    const record = state.savedRecords[group.closedRecordId];
    const path = `/groups/${jsonPointer(groupKey)}/closedRecordId`;
    if (!record) addReason(groupKey, 'closed_record_missing', path);
    else if (record.groupId !== groupKey) addReason(groupKey, 'closed_record_group_mismatch', path);
  }

  const groups: Record<string, LegacyGroupAssessmentV1> = {};
  for (const [groupKey, group] of sortedEntries(state.groups)) {
    const reasons = groupReasons.get(groupKey) ?? new Set<LegacyAssessmentReasonCodeV1>();
    groupReasons.set(groupKey, reasons);
    const expenses = Object.values(state.expenses)
      .filter(expense => expense.groupId === groupKey)
      .sort((left, right) => compareStrings(left.id, right.id));
    const migratedExpenses: Record<string, MigratedLegacyExpenseV1> = {};
    const migratedShares: Record<string, MigratedLegacyShareV1> = {};
    const currencyTotals: Record<string, MoneyV1> = {};
    const statuses: Array<{splitId: string; status: string}> = [];
    for (const expense of expenses) {
      const expenseRoot = `/expenses/${jsonPointer(expense.id)}`;
      const currency = expense.currency;
      const exponent = supportedLegacyExponent(currency);
      if (typeof currency !== 'string' || currency.length === 0) addReason(groupKey, 'currency_missing', `${expenseRoot}/currency`);
      else if (exponent === undefined) addReason(groupKey, 'currency_unsupported', `${expenseRoot}/currency`);
      if (!isCanonicalOpaqueIdentifier(expense.paidByUserId) || !group.memberIds.includes(expense.paidByUserId)) {
        addReason(groupKey, 'payer_not_member', `${expenseRoot}/paidByUserId`);
      }
      const splits = Object.values(state.splits)
        .filter(split => split.expenseId === expense.id)
        .sort((left, right) => compareStrings(left.id, right.id));
      const splitParticipants = splits.map(split => split.userId);
      if (new Set(splitParticipants).size !== splitParticipants.length) {
        addReason(groupKey, 'split_participant_duplicate', `${expenseRoot}/splits`);
      }
      if (!splits.some(split => split.userId === expense.paidByUserId)) {
        addReason(groupKey, 'payer_allocation_missing', `${expenseRoot}/paidByUserId`);
      }
      for (const split of splits) {
        statuses.push({splitId: split.id, status: String(split.status)});
        const splitRoot = `/splits/${jsonPointer(split.id)}`;
        if (!isCanonicalOpaqueIdentifier(split.userId) || !group.memberIds.includes(split.userId)) {
          addReason(groupKey, 'split_participant_not_member', `${splitRoot}/userId`);
        }
        if (!isLegacyStatus(split.status)) addReason(groupKey, 'status_unknown', `${splitRoot}/status`);
      }
      if (typeof currency !== 'string' || exponent === undefined) continue;
      try {
        const total = exactLegacyMoney(expense.amount, currency, exponent);
        const allocations = splits.map(split => ({participantId: split.userId, amount: exactLegacyMoney(split.amount, currency, exponent)}));
        try {
          assertConservation(total, allocations);
        } catch {
          addReason(groupKey, 'money_not_conserved', `${expenseRoot}/amount`);
          continue;
        }
        migratedExpenses[expense.id] = {expenseId: expense.id, description: expense.description, paidBy: expense.paidByUserId, total};
        for (const split of splits) migratedShares[split.id] = migrateSplit(split, currency, exponent);
        currencyTotals[currency] = currencyTotals[currency] ? addMoney(currencyTotals[currency], total) : total;
      } catch {
        addReason(groupKey, 'money_ambiguous', `${expenseRoot}/amount`);
      }
    }
    const collision = authorityIds.has(groupKey);
    if (collision) addReason(groupKey, 'authority_journal_exists', `/groups/${jsonPointer(groupKey)}`);
    for (const sourceReason of sourceReasons) reasons.add(sourceReason);
    const reasonCodes = [...reasons].sort(compareStrings);
    const verdict: LegacyAssessmentVerdictV1 = collision
      ? 'superseded_by_authority'
      : reasonCodes.length > 0 || sourceReasons.size > 0
        ? 'quarantined'
        : 'ready_for_review';
    groups[groupKey] = {
      v: 1,
      groupId: groupKey,
      verdict,
      reasonCodes,
      findings: findingsForReasons(
        reasonCodes,
        code => groupFindingPaths.get(groupKey)?.get(code) ?? sourceFindingPaths.get(code),
        `/groups/${jsonPointer(groupKey)}`,
      ),
      sourceClaims: {
        name: group.name,
        memberIds: [...group.memberIds].sort(compareStrings),
        publicKeyStringsPresent: group.memberIds.filter(id => Boolean(state.users[id]?.accountPublicKeyHex)).sort(compareStrings),
        legacyStatuses: statuses.sort((left, right) => compareStrings(left.splitId, right.splitId)),
        ...(group.closedRecordId ? {closedRecordId: group.closedRecordId} : {}),
      },
      observations: verdict === 'ready_for_review'
        ? {expenses: migratedExpenses, shares: migratedShares, currencyTotals}
        : {expenses: {}, shares: {}, currencyTotals: {}},
      authorityClaims: 'unproven',
    };
  }
  const unsigned = {
    v: 1 as const,
    kind: 'legacy-migration-assessment' as const,
    source: 'legacy-portable-shell' as const,
    digestDomain: 'chopdot:legacy-assessment:v1' as const,
    sourcePacket,
    sourceDigest,
    authorityGroupIds: canonicalAuthorityIds,
    authorityContextDigest,
    sourceReasonCodes: [...sourceReasons].sort(compareStrings),
    sourceFindings: findingsForReasons([...sourceReasons].sort(compareStrings), code => sourceFindingPaths.get(code), '/'),
    overallVerdict: (Object.values(groups).some(group => group.verdict === 'quarantined') || sourceReasons.size > 0
      ? 'quarantined'
      : Object.values(groups).some(group => group.verdict === 'superseded_by_authority')
        ? 'contains_superseded_groups'
        : 'ready_for_review') as LegacyMigrationAssessmentV1['overallVerdict'],
    sourceEvidence: {
      userIds: Object.keys(state.users).sort(compareStrings),
      groupIds: Object.keys(state.groups).sort(compareStrings),
      expenseIds: Object.keys(state.expenses).sort(compareStrings),
      splitIds: Object.keys(state.splits).sort(compareStrings),
      savedRecordIds: Object.keys(state.savedRecords).sort(compareStrings),
    },
    groups,
    createsAuthority: false as const,
  };
  return {...unsigned, assessmentDigest: await sha256Hex(canonicalJson(unsigned))};
}

export async function persistLegacyAssessment(
  store: LegacyAssessmentPersistence,
  assessment: LegacyMigrationAssessmentV1,
): Promise<{assessment: LegacyMigrationAssessmentV1; outcome: 'persisted' | 'duplicate'}> {
  const acceptedAssessment = await verifyLegacyMigrationAssessment(assessment);
  const recordId = `${acceptedAssessment.sourceDigest}:${acceptedAssessment.authorityContextDigest}`;
  const existingValue = await store.readLegacyAssessment(recordId);
  if (existingValue !== null) {
    const existing = await verifyLegacyMigrationAssessment(existingValue);
    if (existing.sourceDigest === acceptedAssessment.sourceDigest && existing.assessmentDigest === acceptedAssessment.assessmentDigest) {
      return {assessment: existing, outcome: 'duplicate'};
    }
  }
  const writeOutcome = await store.putLegacyAssessmentIfAbsent(recordId, structuredClone(acceptedAssessment));
  const readback = await verifyLegacyMigrationAssessment(await store.readLegacyAssessment(recordId));
  if (`${readback.sourceDigest}:${readback.authorityContextDigest}` !== recordId) {
    throw new Error('Legacy assessment storage identity does not match its record.');
  }
  if (canonicalJson(readback) !== canonicalJson(acceptedAssessment)) throw new Error('Legacy assessment encrypted readback does not match.');
  return {assessment: acceptedAssessment, outcome: writeOutcome === 'stored' ? 'persisted' : 'duplicate'};
}

export async function bootstrapLegacyAssessment(
  state: AppState,
  store: LegacyAssessmentBootstrapStore,
): Promise<LegacyAssessmentBootstrapResultV1> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const first = [...new Set(await store.listGroupIds())].sort(compareStrings);
    const second = [...new Set(await store.listGroupIds())].sort(compareStrings);
    if (canonicalJson(first) !== canonicalJson(second)) continue;
    const result = await persistLegacyAssessment(store, await assessLegacyAppState(state, second));
    const final = [...new Set(await store.listGroupIds())].sort(compareStrings);
    if (canonicalJson(second) !== canonicalJson(final)) continue;
    return {...result, authorityGroupIds: final};
  }
  throw new Error('Legacy assessment authority context was unstable during startup.');
}

export function summarizeLegacyAssessment(assessment: LegacyMigrationAssessmentV1): LegacyAssessmentSummaryV1 {
  return {
    sourceDigest: assessment.sourceDigest,
    authorityContextDigest: assessment.authorityContextDigest,
    assessmentDigest: assessment.assessmentDigest,
    overallVerdict: assessment.overallVerdict,
    groupVerdicts: Object.fromEntries(Object.entries(assessment.groups).map(([groupId, group]) => [groupId, group.verdict])),
    createsAuthority: false,
  };
}

function assertLegacyMigrationAssessmentStructure(value: unknown): asserts value is LegacyMigrationAssessmentV1 {
  if (!value || typeof value !== 'object') throw new Error('Stored legacy assessment is corrupt.');
  const row = value as Partial<LegacyMigrationAssessmentV1>;
  if (row.v !== 1 || row.kind !== 'legacy-migration-assessment' || row.source !== 'legacy-portable-shell'
    || row.digestDomain !== 'chopdot:legacy-assessment:v1'
    || row.createsAuthority !== false || !/^0x[0-9a-f]{64}$/u.test(row.sourceDigest ?? '')
    || !/^0x[0-9a-f]{64}$/u.test(row.authorityContextDigest ?? '')
    || !/^0x[0-9a-f]{64}$/u.test(row.assessmentDigest ?? '') || !row.groups || !Array.isArray(row.sourceReasonCodes)
    || !['ready_for_review', 'quarantined', 'contains_superseded_groups'].includes(row.overallVerdict ?? '')
    || !row.sourceEvidence || !Array.isArray(row.sourceFindings) || !Array.isArray(row.authorityGroupIds)) {
    throw new Error('Stored legacy assessment is corrupt.');
  }
  const sourcePacket = assertLegacySourcePacket(row.sourcePacket);
  if (!isCanonicalStringArray(row.authorityGroupIds)) throw new Error('Stored legacy assessment is corrupt.');
  assertReasonCodes(row.sourceReasonCodes);
  assertFindingsMatch(row.sourceReasonCodes, row.sourceFindings);
  for (const [groupId, group] of sortedEntries(row.groups)) {
    if (!group || group.v !== 1 || group.groupId !== groupId
      || !['ready_for_review', 'quarantined', 'superseded_by_authority'].includes(group.verdict)
      || group.authorityClaims !== 'unproven' || !Array.isArray(group.reasonCodes)
      || !Array.isArray(group.findings) || !group.sourceClaims || !group.observations) {
      throw new Error('Stored legacy assessment is corrupt.');
    }
    assertReasonCodes(group.reasonCodes);
    assertFindingsMatch(group.reasonCodes, group.findings);
    if (row.sourceReasonCodes.some(code => !group.reasonCodes.includes(code))) throw new Error('Stored legacy assessment is corrupt.');
    if (group.verdict === 'ready_for_review' && group.reasonCodes.length !== 0) throw new Error('Stored legacy assessment is corrupt.');
    if (group.verdict === 'quarantined' && group.reasonCodes.length === 0) throw new Error('Stored legacy assessment is corrupt.');
    if (group.verdict === 'superseded_by_authority' && !group.reasonCodes.includes('authority_journal_exists')) {
      throw new Error('Stored legacy assessment is corrupt.');
    }
    if (typeof group.sourceClaims.name !== 'string'
      || !isStringArray(group.sourceClaims.memberIds)
      || !isStringArray(group.sourceClaims.publicKeyStringsPresent)
      || !Array.isArray(group.sourceClaims.legacyStatuses)
      || group.sourceClaims.legacyStatuses.some(item => !item || typeof item.splitId !== 'string' || typeof item.status !== 'string')
      || (group.sourceClaims.closedRecordId !== undefined && typeof group.sourceClaims.closedRecordId !== 'string')) {
      throw new Error('Stored legacy assessment is corrupt.');
    }
    const observation = group.observations;
    if (!isPlainRecord(observation.expenses) || !isPlainRecord(observation.shares) || !isPlainRecord(observation.currencyTotals)) {
      throw new Error('Stored legacy assessment is corrupt.');
    }
    if (group.verdict !== 'ready_for_review'
      && (Object.keys(observation.expenses).length || Object.keys(observation.shares).length || Object.keys(observation.currencyTotals).length)) {
      throw new Error('Stored legacy assessment is corrupt.');
    }
    const computedTotals: Record<string, MoneyV1> = {};
    for (const [expenseId, expense] of Object.entries(observation.expenses)) {
      if (!expense || !isCanonicalOpaqueIdentifier(expenseId) || expense.expenseId !== expenseId || typeof expense.description !== 'string'
        || !isCanonicalOpaqueIdentifier(expense.paidBy) || !group.sourceClaims.memberIds.includes(expense.paidBy)
        || !isSupportedStoredMoney(expense.total)) throw new Error('Stored legacy assessment is corrupt.');
    }
    for (const [shareId, share] of Object.entries(observation.shares)) {
      if (!share || !isCanonicalOpaqueIdentifier(shareId) || share.shareId !== shareId
        || !isCanonicalOpaqueIdentifier(share.expenseId) || !observation.expenses[share.expenseId]
        || !isCanonicalOpaqueIdentifier(share.participantId) || !group.sourceClaims.memberIds.includes(share.participantId)
        || !['open', 'requested', 'marked_paid', 'cleared', 'received'].includes(share.status)
        || !isSupportedStoredMoney(share.amount)) {
        throw new Error('Stored legacy assessment is corrupt.');
      }
    }
    if (group.verdict === 'ready_for_review') {
      if (!isCanonicalStringArray(group.sourceClaims.memberIds)) throw new Error('Stored legacy assessment is corrupt.');
      for (const expense of Object.values(observation.expenses)) {
        const shares = Object.values(observation.shares).filter(share => share.expenseId === expense.expenseId);
        if (shares.filter(share => share.participantId === expense.paidBy).length !== 1) throw new Error('Stored legacy assessment is corrupt.');
        try {
          assertConservation(expense.total, shares.map(share => ({participantId: share.participantId, amount: share.amount})));
        } catch {
          throw new Error('Stored legacy assessment is corrupt.');
        }
        computedTotals[expense.total.currency] = computedTotals[expense.total.currency]
          ? addMoney(computedTotals[expense.total.currency], expense.total)
          : expense.total;
      }
      if (!sameMoneyRecord(computedTotals, observation.currencyTotals)) throw new Error('Stored legacy assessment is corrupt.');
    }
    for (const [currency, total] of Object.entries(observation.currencyTotals)) {
      if (!isSupportedStoredMoney(total) || total.currency !== currency) throw new Error('Stored legacy assessment is corrupt.');
    }
  }
  for (const field of ['userIds', 'groupIds', 'expenseIds', 'splitIds', 'savedRecordIds'] as const) {
    if (!isSortedUniqueStringArray(row.sourceEvidence[field])) throw new Error('Stored legacy assessment is corrupt.');
  }
  if (!sameStrings(row.sourceEvidence.userIds, sourcePacket.users.map(item => item.key).sort(compareStrings))
    || !sameStrings(row.sourceEvidence.groupIds, sourcePacket.groups.map(item => item.key).sort(compareStrings))
    || !sameStrings(row.sourceEvidence.expenseIds, sourcePacket.expenses.map(item => item.key).sort(compareStrings))
    || !sameStrings(row.sourceEvidence.splitIds, sourcePacket.splits.map(item => item.key).sort(compareStrings))
    || !sameStrings(row.sourceEvidence.savedRecordIds, sourcePacket.savedRecords.map(item => item.key).sort(compareStrings))) {
    throw new Error('Stored legacy assessment is corrupt.');
  }
  const expectedOverall = Object.values(row.groups).some(group => group.verdict === 'quarantined') || row.sourceReasonCodes.length > 0
    ? 'quarantined'
    : Object.values(row.groups).some(group => group.verdict === 'superseded_by_authority')
      ? 'contains_superseded_groups'
      : 'ready_for_review';
  if (row.overallVerdict !== expectedOverall) throw new Error('Stored legacy assessment is corrupt.');
}

export async function verifyLegacyMigrationAssessment(value: unknown): Promise<LegacyMigrationAssessmentV1> {
  assertLegacyMigrationAssessmentStructure(value);
  await verifyAssessmentDigest(value);
  return structuredClone(value);
}

async function verifyAssessmentDigest(value: LegacyMigrationAssessmentV1): Promise<void> {
  const {assessmentDigest, ...unsigned} = value;
  if (value.sourceDigest !== await sha256Hex(canonicalJson(value.sourcePacket))) throw new Error('Stored legacy assessment is corrupt.');
  const expectedAuthorityContextDigest = await sha256Hex(canonicalJson({
    domain: 'chopdot:legacy-authority-context:v1',
    groupIds: value.authorityGroupIds,
  }));
  if (value.authorityContextDigest !== expectedAuthorityContextDigest) throw new Error('Stored legacy assessment is corrupt.');
  if (assessmentDigest !== await sha256Hex(canonicalJson(unsigned))) throw new Error('Stored legacy assessment is corrupt.');
  const replayed = await assessLegacyAppState(appStateFromLegacySourcePacket(assertLegacySourcePacket(value.sourcePacket)), value.authorityGroupIds);
  if (canonicalJson(replayed) !== canonicalJson(value)) throw new Error('Stored legacy assessment is corrupt.');
}

export async function migrateLegacyAppState(state: AppState): Promise<LegacyMigrationResultV1> {
  const groups: Record<string, MigratedLegacyGroupV1> = {};
  const quarantined: Array<{groupId: string; reason: string}> = [];
  for (const group of Object.values(state.groups).sort((left, right) => compareStrings(left.id, right.id))) {
    try {
      const expenses = Object.values(state.expenses).filter(expense => expense.groupId === group.id).sort((left, right) => compareStrings(left.id, right.id));
      const migratedExpenses: Record<string, MigratedLegacyExpenseV1> = {};
      const migratedShares: Record<string, MigratedLegacyShareV1> = {};
      const currencyTotals: Record<string, MoneyV1> = {};
      for (const expense of expenses) {
        const total = legacyMoney(expense.amount, expense.currency ?? state.currency);
        const splits = Object.values(state.splits).filter(split => split.expenseId === expense.id).sort((left, right) => compareStrings(left.id, right.id));
        const allocations = splits.map(split => ({participantId: split.userId, amount: legacyMoney(split.amount, total.currency)}));
        assertConservation(total, allocations);
        migratedExpenses[expense.id] = {expenseId: expense.id, description: expense.description, paidBy: expense.paidByUserId, total};
        for (const split of splits) migratedShares[split.id] = migrateSplit(split, total.currency);
        currencyTotals[total.currency] = currencyTotals[total.currency] ? addMoney(currencyTotals[total.currency], total) : total;
      }
      groups[group.id] = {
        v: 1, source: 'legacy-portable-shell', groupId: group.id, name: group.name,
        memberIds: [...new Set(group.memberIds)].sort(compareStrings),
        needsAccountBinding: group.memberIds.some(id => !state.users[id]?.accountPublicKeyHex),
        expenses: migratedExpenses, shares: migratedShares, currencyTotals,
        ...(group.closedRecordId ? {closedRecordId: group.closedRecordId} : {}),
      };
    } catch (reason) {
      quarantined.push({groupId: group.id, reason: reason instanceof Error ? reason.message : String(reason)});
    }
  }
  const result = {v: 1 as const, groups, quarantined};
  return {...result, stateHash: await sha256Hex(canonicalJson(result))};
}

/**
 * Characterizes the year-long app's normalized Supabase boundary without
 * making Supabase authoritative. Rows already use bigint minor units; the
 * adapter validates them and emits the same provider-neutral MoneyV1 values.
 */
export async function migrateMainAppMoneyRows(
  expenseRows: MainAppExpenseRowV1[],
  splitRows: MainAppSplitRowV1[],
): Promise<MainAppMoneyMigrationV1> {
  const expenses: MainAppMoneyMigrationV1['expenses'] = {};
  const quarantined: MainAppMoneyMigrationV1['quarantined'] = [];
  for (const row of [...expenseRows].sort((left, right) => compareStrings(left.id, right.id))) {
    try {
      if (!row.id.trim() || !row.pot_id.trim() || !row.paid_by.trim()) throw new Error('Main-app expense identity is invalid.');
      const total=moneyFromMinorUnits(row.amount_minor,row.currency_code,2);
      const rows = splitRows.filter(split => split.expense_id === row.id).sort((left, right) => compareStrings(left.id, right.id));
      const allocations=rows.map(split=>{
        if (!split.id.trim() || !split.member_id.trim()) throw new Error('Main-app split identity is invalid.');
        return {participantId:split.member_id,amount:moneyFromMinorUnits(split.amount_minor,total.currency,total.exponent)};
      });
      assertConservation(total,allocations);
      expenses[row.id]={expenseId:row.id,potId:row.pot_id,paidBy:row.paid_by,description:row.description?.trim()??'',total,allocations};
    } catch (reason) {
      quarantined.push({expenseId:row.id,reason:reason instanceof Error?reason.message:String(reason)});
    }
  }
  const result={v:1 as const,source:'main-app-normalized-supabase' as const,expenses,quarantined};
  return {...result,stateHash:await sha256Hex(canonicalJson(result))};
}

function legacyMoney(value: number, currency: string, exponent = 2): MoneyV1 {
  if (!Number.isFinite(value) || value < 0) throw new Error('Legacy amount cannot become exact money.');
  const decimal = String(value);
  if (/e/iu.test(decimal)) throw new Error('Legacy amount cannot become exact money.');
  try {
    return moneyFromDecimal(decimal, currency, exponent);
  } catch {
    throw new Error('Legacy amount cannot become exact money.');
  }
}

function migrateSplit(split: Split, currency: string, exponent = 2): MigratedLegacyShareV1 {
  const status = split.status === 'request_sent' ? 'requested' : split.status === 'confirmed' ? 'received' : split.status;
  return {shareId: split.id, expenseId: split.expenseId, participantId: split.userId, amount: legacyMoney(split.amount, currency, exponent), status};
}

function exactLegacyMoney(value: number, currency: string, exponent: number): MoneyV1 {
  return legacyMoney(value, currency, exponent);
}

function isLegacyStatus(value: unknown): value is Split['status'] {
  return ['open', 'request_sent', 'marked_paid', 'cleared', 'confirmed'].includes(String(value));
}

function migrationRelevantSourcePacket(state: AppState): unknown {
  return {
    domain: 'chopdot:legacy-projection:v1',
    v: '1',
    users: Object.entries(state.users).map(([key, value]) => ({
      key,
      id: value.id,
      accountPublicKeyPresent: typeof value.accountPublicKeyHex === 'string' && value.accountPublicKeyHex.length > 0,
    })).sort(compareKey),
    groups: Object.entries(state.groups).map(([key, value]) => ({
      key,
      id: value.id,
      name: value.name,
      memberIds: [...value.memberIds],
      ...(value.mode ? {mode: value.mode} : {}),
      ...(value.closedRecordId ? {closedRecordId: value.closedRecordId} : {}),
      ...(value.closedAt ? {closedAt: value.closedAt} : {}),
    })).sort(compareKey),
    expenses: Object.entries(state.expenses).map(([key, value]) => ({
      key, id: value.id, groupId: value.groupId, description: value.description, amount: value.amount,
      ...(value.currency !== undefined ? {currency: value.currency} : {}),
      paidByUserId: value.paidByUserId, date: value.date,
    })).sort(compareKey),
    splits: Object.entries(state.splits).map(([key, value]) => ({
      key, id: value.id, expenseId: value.expenseId, userId: value.userId, amount: value.amount, status: value.status,
    })).sort(compareKey),
    savedRecords: Object.entries(state.savedRecords).map(([key, value]) => ({
      key, id: value.id, groupId: value.groupId, dateSaved: value.dateSaved,
      totalAmount: value.totalAmount, openAmount: value.openAmount,
      splits: value.splits.map(split => ({
        id: split.id, expenseId: split.expenseId, userId: split.userId, amount: split.amount, status: split.status,
      })),
    })).sort(compareKey),
  };
}

function compareKey(left: {key: string}, right: {key: string}): number {
  return compareStrings(left.key, right.key);
}

function encodeLegacySourceValue(value: unknown): unknown {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return {number: Number.isNaN(value) ? 'nan' : value > 0 ? 'positive_infinity' : 'negative_infinity'};
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setFloat64(0, value, false);
    return {number: [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')};
  }
  if (Array.isArray(value)) return value.map(encodeLegacySourceValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => compareStrings(left, right))
      .map(([key, item]) => [key, encodeLegacySourceValue(item)]));
  }
  return value;
}

function containsNonFiniteNumber(value: unknown): boolean {
  if (typeof value === 'number') return !Number.isFinite(value);
  if (Array.isArray(value)) return value.some(containsNonFiniteNumber);
  return Boolean(value && typeof value === 'object' && Object.values(value as Record<string, unknown>).some(containsNonFiniteNumber));
}

const LEGACY_REASON_CODES = new Set<LegacyAssessmentReasonCodeV1>([
  'authority_journal_exists', 'currency_missing', 'currency_unsupported', 'closed_record_missing',
  'closed_record_group_mismatch', 'expense_id_mismatch', 'expense_orphaned', 'group_id_mismatch',
  'group_member_duplicate', 'group_member_missing', 'group_name_missing', 'money_ambiguous',
  'money_not_conserved', 'number_nonfinite', 'payer_not_member', 'payer_allocation_missing', 'saved_record_id_mismatch',
  'saved_record_orphaned', 'saved_record_split_duplicate', 'saved_record_split_mismatch',
  'split_id_mismatch', 'split_orphaned', 'split_participant_not_member', 'split_participant_duplicate', 'status_unknown', 'user_id_mismatch',
]);

function assertReasonCodes(value: unknown[]): asserts value is LegacyAssessmentReasonCodeV1[] {
  if (value.some(code => typeof code !== 'string' || !LEGACY_REASON_CODES.has(code as LegacyAssessmentReasonCodeV1))) {
    throw new Error('Stored legacy assessment is corrupt.');
  }
  if (!isCanonicalStringArray(value)) throw new Error('Stored legacy assessment is corrupt.');
}

function assertFindingsMatch(reasonCodes: LegacyAssessmentReasonCodeV1[], value: unknown[]): void {
  if (value.some(item => !item || typeof item !== 'object'
    || !LEGACY_REASON_CODES.has((item as {code?: LegacyAssessmentReasonCodeV1}).code as LegacyAssessmentReasonCodeV1)
    || typeof (item as {path?: unknown}).path !== 'string'
    || !(item as {path: string}).path.startsWith('/'))) throw new Error('Stored legacy assessment is corrupt.');
  const findings = value as Array<{code: LegacyAssessmentReasonCodeV1; path: string}>;
  const findingCodes = [...new Set(findings.map(finding => finding.code))].sort(compareStrings);
  if (!sameStrings(findingCodes, reasonCodes)
    || findings.some((finding, index) => index > 0 && compareFindings(findings[index - 1], finding) >= 0)) {
    throw new Error('Stored legacy assessment is corrupt.');
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isCanonicalStringArray(value: unknown): value is string[] {
  return isStringArray(value) && value.every(isCanonicalOpaqueIdentifier)
    && new Set(value).size === value.length
    && value.every((item, index) => index === 0 || compareStrings(value[index - 1], item) < 0);
}

function isSortedUniqueStringArray(value: unknown): value is string[] {
  return isStringArray(value) && new Set(value).size === value.length
    && value.every((item, index) => index === 0 || compareStrings(value[index - 1], item) < 0);
}

function isPlainRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isSupportedStoredMoney(value: unknown): value is MoneyV1 {
  try {
    assertMoney(value);
    return supportedLegacyExponent(value.currency) === value.exponent;
  } catch {
    return false;
  }
}

function supportedLegacyExponent(currency: unknown): number | undefined {
  return typeof currency === 'string'
    ? (LEGACY_SUPPORTED_CURRENCY_EXPONENTS_V1 as Readonly<Record<string, number>>)[currency]
    : undefined;
}

function sameMoneyRecord(left: Record<string, MoneyV1>, right: Record<string, MoneyV1>): boolean {
  const leftKeys = Object.keys(left).sort(compareStrings);
  const rightKeys = Object.keys(right).sort(compareStrings);
  return sameStrings(leftKeys, rightKeys) && leftKeys.every(key => moneyEquals(left[key], right[key]));
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedEntries<T>(value: Record<string, T>): Array<[string, T]> {
  return Object.entries(value).sort(([left], [right]) => compareStrings(left, right));
}

function isCanonicalOpaqueIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.trim() === value;
}

function jsonPointer(value: string): string {
  return value.replace(/~/gu, '~0').replace(/\//gu, '~1');
}

function addFindingPath(
  paths: Map<LegacyAssessmentReasonCodeV1, Set<string>>,
  reason: LegacyAssessmentReasonCodeV1,
  path: string,
): void {
  const values = paths.get(reason) ?? new Set<string>();
  values.add(path);
  paths.set(reason, values);
}

function findingsForReasons(
  reasons: LegacyAssessmentReasonCodeV1[],
  pathsFor: (reason: LegacyAssessmentReasonCodeV1) => Set<string> | undefined,
  fallback: string,
): Array<{code: LegacyAssessmentReasonCodeV1; path: string}> {
  return reasons.flatMap(code => {
    const paths = [...(pathsFor(code) ?? new Set<string>())].sort(compareStrings);
    return (paths.length > 0 ? paths : [fallback]).map(path => ({code, path}));
  }).sort(compareFindings);
}

function compareFindings(
  left: {code: LegacyAssessmentReasonCodeV1; path: string},
  right: {code: LegacyAssessmentReasonCodeV1; path: string},
): number {
  return compareStrings(left.code, right.code) || compareStrings(left.path, right.path);
}

interface EncodedLegacySourcePacketV1 {
  domain: 'chopdot:legacy-projection:v1';
  v: '1';
  users: Array<{key: string; id: string; accountPublicKeyPresent: boolean}>;
  groups: Array<{key: string; id: string; name: string; memberIds: string[]; mode?: string; closedRecordId?: string; closedAt?: string}>;
  expenses: Array<{key: string; id: string; groupId: string; description: string; amount: EncodedLegacyNumber; currency?: string; paidByUserId: string; date: string}>;
  splits: Array<{key: string; id: string; expenseId: string; userId: string; amount: EncodedLegacyNumber; status: string}>;
  savedRecords: Array<{
    key: string;
    id: string;
    groupId: string;
    dateSaved: string;
    totalAmount: EncodedLegacyNumber;
    openAmount: EncodedLegacyNumber;
    splits: Array<{id: string; expenseId: string; userId: string; amount: EncodedLegacyNumber; status: string}>;
  }>;
}

type EncodedLegacyNumber = {number: string};

function assertLegacySourcePacket(value: unknown): EncodedLegacySourcePacketV1 {
  if (!isPlainRecord(value) || value.domain !== 'chopdot:legacy-projection:v1' || value.v !== '1'
    || !hasOnlyKeys(value, ['domain', 'v', 'users', 'groups', 'expenses', 'splits', 'savedRecords'])
    || !Array.isArray(value.users) || !Array.isArray(value.groups) || !Array.isArray(value.expenses)
    || !Array.isArray(value.splits) || !Array.isArray(value.savedRecords)) throw new Error('Stored legacy assessment is corrupt.');
  const packet = value as unknown as EncodedLegacySourcePacketV1;
  if (!isCanonicalPacketRows(packet.users) || packet.users.some(row => !hasOnlyKeys(row, ['key', 'id', 'accountPublicKeyPresent'])
    || typeof row.id !== 'string' || typeof row.accountPublicKeyPresent !== 'boolean')) throw new Error('Stored legacy assessment is corrupt.');
  if (!isCanonicalPacketRows(packet.groups) || packet.groups.some(row => !hasOnlyKeys(row, ['key', 'id', 'name', 'memberIds', 'mode', 'closedRecordId', 'closedAt'])
    || typeof row.id !== 'string' || typeof row.name !== 'string' || !isStringArray(row.memberIds)
    || (row.mode !== undefined && typeof row.mode !== 'string')
    || (row.closedRecordId !== undefined && typeof row.closedRecordId !== 'string')
    || (row.closedAt !== undefined && typeof row.closedAt !== 'string'))) throw new Error('Stored legacy assessment is corrupt.');
  if (!isCanonicalPacketRows(packet.expenses) || packet.expenses.some(row => !hasOnlyKeys(row, ['key', 'id', 'groupId', 'description', 'amount', 'currency', 'paidByUserId', 'date'])
    || typeof row.id !== 'string' || typeof row.groupId !== 'string' || typeof row.description !== 'string'
    || !isEncodedLegacyNumber(row.amount) || (row.currency !== undefined && typeof row.currency !== 'string')
    || typeof row.paidByUserId !== 'string' || typeof row.date !== 'string')) throw new Error('Stored legacy assessment is corrupt.');
  if (!isCanonicalPacketRows(packet.splits) || packet.splits.some(row => !hasOnlyKeys(row, ['key', 'id', 'expenseId', 'userId', 'amount', 'status'])
    || typeof row.id !== 'string' || typeof row.expenseId !== 'string' || typeof row.userId !== 'string'
    || !isEncodedLegacyNumber(row.amount) || typeof row.status !== 'string')) throw new Error('Stored legacy assessment is corrupt.');
  if (!isCanonicalPacketRows(packet.savedRecords) || packet.savedRecords.some(row => !hasOnlyKeys(row, ['key', 'id', 'groupId', 'dateSaved', 'totalAmount', 'openAmount', 'splits'])
    || typeof row.id !== 'string' || typeof row.groupId !== 'string' || typeof row.dateSaved !== 'string'
    || !isEncodedLegacyNumber(row.totalAmount) || !isEncodedLegacyNumber(row.openAmount) || !Array.isArray(row.splits)
    || row.splits.some(split => !hasOnlyKeys(split, ['id', 'expenseId', 'userId', 'amount', 'status'])
      || typeof split.id !== 'string' || typeof split.expenseId !== 'string' || typeof split.userId !== 'string'
      || !isEncodedLegacyNumber(split.amount) || typeof split.status !== 'string'))) throw new Error('Stored legacy assessment is corrupt.');
  return packet;
}

function appStateFromLegacySourcePacket(packet: EncodedLegacySourcePacketV1): AppState {
  return {
    mode: 'clean',
    theme: 'light',
    currency: 'USD',
    preferredPaymentMethod: null,
    currentUserId: null,
    users: Object.fromEntries(packet.users.map(row => [row.key, {
      id: row.id,
      name: '',
      ...(row.accountPublicKeyPresent ? {accountPublicKeyHex: 'present'} : {}),
    }])),
    groups: Object.fromEntries(packet.groups.map(row => [row.key, {
      id: row.id,
      name: row.name,
      memberIds: [...row.memberIds],
      ...(row.mode !== undefined ? {mode: row.mode as AppState['groups'][string]['mode']} : {}),
      ...(row.closedRecordId !== undefined ? {closedRecordId: row.closedRecordId} : {}),
      ...(row.closedAt !== undefined ? {closedAt: row.closedAt} : {}),
    }])),
    expenses: Object.fromEntries(packet.expenses.map(row => [row.key, {
      id: row.id,
      groupId: row.groupId,
      description: row.description,
      amount: decodeLegacyNumber(row.amount),
      ...(row.currency !== undefined ? {currency: row.currency} : {}),
      paidByUserId: row.paidByUserId,
      date: row.date,
    }])),
    splits: Object.fromEntries(packet.splits.map(row => [row.key, {
      id: row.id,
      expenseId: row.expenseId,
      userId: row.userId,
      amount: decodeLegacyNumber(row.amount),
      status: row.status as Split['status'],
    }])),
    paymentMethods: {},
    activityEvents: {},
    savedRecords: Object.fromEntries(packet.savedRecords.map(row => [row.key, {
      id: row.id,
      groupId: row.groupId,
      dateSaved: row.dateSaved,
      totalAmount: decodeLegacyNumber(row.totalAmount),
      openAmount: decodeLegacyNumber(row.openAmount),
      splits: row.splits.map(split => ({
        id: split.id,
        expenseId: split.expenseId,
        userId: split.userId,
        amount: decodeLegacyNumber(split.amount),
        status: split.status as Split['status'],
      })),
    }])),
  };
}

function decodeLegacyNumber(value: EncodedLegacyNumber): number {
  if (value.number === 'nan') return Number.NaN;
  if (value.number === 'positive_infinity') return Number.POSITIVE_INFINITY;
  if (value.number === 'negative_infinity') return Number.NEGATIVE_INFINITY;
  const bytes = Uint8Array.from(value.number.match(/../gu) ?? [], byte => Number.parseInt(byte, 16));
  if (bytes.length !== 8) throw new Error('Stored legacy assessment is corrupt.');
  return new DataView(bytes.buffer).getFloat64(0, false);
}

function isCanonicalPacketRows(value: unknown[]): value is Array<{key: string}> {
  return value.every(row => isPlainRecord(row) && typeof row.key === 'string')
    && value.every((row, index) => index === 0 || compareStrings((value[index - 1] as {key: string}).key, (row as {key: string}).key) < 0);
}

function isEncodedLegacyNumber(value: unknown): value is EncodedLegacyNumber {
  return isPlainRecord(value) && hasOnlyKeys(value, ['number']) && typeof value.number === 'string'
    && (/^[0-9a-f]{16}$/u.test(value.number) || ['nan', 'positive_infinity', 'negative_infinity'].includes(value.number));
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedSet = new Set(allowed);
  return Object.keys(value).every(key => allowedSet.has(key));
}
