import type {ProductionAuthorityAction} from '../core/authority/productionAuthority.ts';
import type {CanonicalGroupStateV1} from '../core/moneyEventKernel.ts';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {GroupMode} from '../types.ts';

const STORAGE_KEY = 'chopdot-group-creation-draft-v1';
const GROUP_MODES = new Set<GroupMode>([
  'normal_pot',
  'trip',
  'couple',
  'spend_card',
  'savings_circle',
  'emergency_pot',
  'community_fund',
]);

export type PendingGroupCreationStageV1 =
  | 'local_private_draft'
  | 'account_setup_required'
  | 'shared_append_pending'
  | 'shared_created';

/**
 * A pending draft is intentionally not a group, membership record, or second
 * authority. It remembers private input until the same
 * one-member CREATE_GROUP proposal can be signed by an attached Product
 * Account and accepted by ProductionAuthority.
 */
export interface PendingGroupCreationDraftV1 {
  v: 1;
  draftId: string;
  candidateGroupId: string;
  name: string;
  mode: GroupMode;
  intent: 'local_private' | 'shared';
  stage: PendingGroupCreationStageV1;
  createdAt: string;
  updatedAt: string;
}

export interface GroupCreationInputV1 {
  draftId: string;
  candidateGroupId: string;
  name: string;
  mode: GroupMode;
  intent: 'local_private' | 'shared';
}

export interface SharedGroupCreationReadiness {
  /** Resolves only when this exact participant has an attached account identity
   * and the runtime has an account-bound group-access provisioner. */
  sharedGroupCreationAccount(participantId: string): {accountPublicKeyHex: string} | null;
}

export interface GroupCreationAuthoritySink {
  appendShared(input: {
    actorId: string;
    action: ProductionAuthorityAction;
  }): Promise<boolean>;
  readCanonicalGroup(groupId: string): Promise<CanonicalGroupStateV1 | null>;
}

export type GroupCreationEntryResultV1 =
  | {status: 'local_private_draft_saved'; draft: PendingGroupCreationDraftV1}
  | {status: 'account_setup_required'; draft: PendingGroupCreationDraftV1}
  | {status: 'shared_creation_failed'; draft: PendingGroupCreationDraftV1}
  | {status: 'shared_group_created'; draft: PendingGroupCreationDraftV1};

export interface GroupCreationEntryServiceOptions {
  participantId: string;
  storage: KeyValueStorage;
  readiness: SharedGroupCreationReadiness;
  authority: GroupCreationAuthoritySink;
  storageKey?: string;
}

export class GroupCreationEntryService {
  private readonly storageKey: string;
  private readonly participantId: string;

  constructor(private readonly options: GroupCreationEntryServiceOptions) {
    this.participantId = requiredIdentifier(options.participantId, 'Participant identifier');
    this.storageKey = `${options.storageKey?.trim() || STORAGE_KEY}:${this.participantId}`;
  }

  async createOrResume(
    input: GroupCreationInputV1,
    now = new Date().toISOString(),
  ): Promise<GroupCreationEntryResultV1> {
    const canonical = canonicalInput(input);
    const timestamp = canonicalTimestamp(now);
    const records = this.list();
    const existing = records.find(record => record.draftId === canonical.draftId);
    if (existing && !sameCreation(existing, canonical)) {
      throw new Error('This draft identifier is already in use.');
    }
    if (existing?.stage === 'shared_append_pending' && canonical.intent === 'local_private') {
      throw new Error('This draft already has a shared creation attempt waiting for confirmation.');
    }

    const createdAt = existing?.createdAt ?? timestamp;
    if (canonical.intent === 'local_private') {
      const draft = this.persist(records, {
        v: 1,
        ...canonical,
        stage: 'local_private_draft',
        createdAt,
        updatedAt: timestamp,
      });
      return {status: 'local_private_draft_saved', draft};
    }

    const sharedAccount = this.options.readiness.sharedGroupCreationAccount(this.participantId);
    if (!sharedAccount) {
      const draft = this.persist(records, {
        v: 1,
        ...canonical,
        stage: 'account_setup_required',
        createdAt,
        updatedAt: timestamp,
      });
      return {status: 'account_setup_required', draft};
    }

    if (existing?.stage === 'shared_created'
      && await this.wasAccepted(existing, sharedAccount.accountPublicKeyHex)) {
      return {status: 'shared_group_created', draft: clone(existing)};
    }

    const pending = this.persist(records, {
      v: 1,
      ...canonical,
      stage: 'shared_append_pending',
      createdAt,
      updatedAt: timestamp,
    });
    if (await this.wasAccepted(pending, sharedAccount.accountPublicKeyHex)) {
      const completed = this.complete(pending, timestamp);
      return {status: 'shared_group_created', draft: completed};
    }
    let accepted = false;
    try {
      accepted = await this.options.authority.appendShared({
        actorId: this.participantId,
        action: {
          type: 'CREATE_GROUP',
          payload: {group: {
            id: canonical.candidateGroupId,
            name: canonical.name,
            memberIds: [this.participantId],
            mode: canonical.mode,
          }},
        },
      });
    } catch {
      // The local record is already durable. The authority implementation owns
      // its user-facing error and a later exact retry starts from this record.
      accepted = await this.wasAccepted(pending, sharedAccount.accountPublicKeyHex);
    }
    // A successful append response is delivery evidence, not canonical group
    // evidence. Never let a local return value or persisted stage impersonate
    // the signed journal readback.
    accepted = await this.wasAccepted(pending, sharedAccount.accountPublicKeyHex);
    if (!accepted) return {status: 'shared_creation_failed', draft: pending};

    const completed = this.complete(pending, timestamp);
    return {status: 'shared_group_created', draft: completed};
  }

  read(draftId: string): PendingGroupCreationDraftV1 | null {
    const draft = requiredIdentifier(draftId, 'Draft identifier');
    const record = this.list().find(candidate => candidate.draftId === draft);
    return record ? clone(record) : null;
  }

  list(): PendingGroupCreationDraftV1[] {
    return this.readAll().map(clone);
  }

  private persist(records: PendingGroupCreationDraftV1[], next: PendingGroupCreationDraftV1): PendingGroupCreationDraftV1 {
    const canonical = canonicalRecord(next);
    const updated = records.filter(record => record.draftId !== canonical.draftId);
    updated.push(canonical);
    updated.sort((left, right) => left.draftId.localeCompare(right.draftId));
    this.options.storage.write(this.storageKey, JSON.stringify(updated));
    const readBack = this.readAll().find(record => record.draftId === canonical.draftId);
    if (!readBack || stableSerialize(readBack) !== stableSerialize(canonical)) {
      throw new Error('The group draft could not be remembered safely.');
    }
    return clone(readBack);
  }

  private complete(pending: PendingGroupCreationDraftV1, timestamp: string): PendingGroupCreationDraftV1 {
    return this.persist(this.list(), {...pending, stage: 'shared_created', updatedAt: timestamp});
  }

  private async wasAccepted(draft: PendingGroupCreationDraftV1, accountPublicKeyHex: string): Promise<boolean> {
    const state = await this.options.authority.readCanonicalGroup(draft.candidateGroupId);
    if (!state
      || state.groupId !== draft.candidateGroupId
      || state.name !== draft.name
      || (state.mode ?? 'normal_pot') !== draft.mode
      || state.organizerId !== this.participantId) return false;
    const active = Object.values(state.members).filter(member => member.active !== false);
    const organizer = state.members[this.participantId];
    return active.length === 1
      && active[0]?.participantId === this.participantId
      && organizer?.role === 'organizer'
      && organizer.accountPublicKeyHex.toLowerCase() === accountPublicKeyHex.toLowerCase()
      && Boolean(organizer.acceptedAt)
      && Boolean(organizer.invitationId)
      && Boolean(organizer.keyVersion && organizer.keyVersion > 0)
      && Boolean(organizer.groupKeyEnvelopeId);
  }

  private readAll(): PendingGroupCreationDraftV1[] {
    const raw = this.options.storage.read(this.storageKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      const records = new Map<string, PendingGroupCreationDraftV1>();
      for (const candidate of parsed) {
        try {
          const record = canonicalRecord(candidate as PendingGroupCreationDraftV1);
          if (!records.has(record.draftId)) records.set(record.draftId, record);
        } catch {
          // One malformed local sibling cannot erase other safe local work.
        }
      }
      return [...records.values()].sort((left, right) => left.draftId.localeCompare(right.draftId));
    } catch {
      return [];
    }
  }
}

function canonicalInput(value: GroupCreationInputV1): GroupCreationInputV1 {
  const mode = value.mode;
  if (!GROUP_MODES.has(mode)) throw new Error('Group mode is unsupported.');
  if (!['local_private', 'shared'].includes(value.intent)) throw new Error('Group creation intent is unsupported.');
  return {
    draftId: requiredIdentifier(value.draftId, 'Draft identifier'),
    candidateGroupId: requiredIdentifier(value.candidateGroupId, 'Group identifier'),
    name: requiredName(value.name),
    mode,
    intent: value.intent,
  };
}

function canonicalRecord(value: PendingGroupCreationDraftV1): PendingGroupCreationDraftV1 {
  if (value?.v !== 1 || ![
    'local_private_draft',
    'account_setup_required',
    'shared_append_pending',
    'shared_created',
  ].includes(value.stage)) throw new Error('Group creation draft is invalid.');
  const mode = value.mode;
  if (!GROUP_MODES.has(mode)) throw new Error('Group mode is unsupported.');
  const createdAt = canonicalTimestamp(value.createdAt);
  const updatedAt = canonicalTimestamp(value.updatedAt);
  if (Date.parse(updatedAt) < Date.parse(createdAt)) throw new Error('Group draft timestamps are invalid.');
  return {
    v: 1,
    draftId: requiredIdentifier(value.draftId, 'Draft identifier'),
    candidateGroupId: requiredIdentifier(value.candidateGroupId, 'Group identifier'),
    name: requiredName(value.name),
    mode,
    intent: value.intent === 'local_private' || value.intent === 'shared'
      ? value.intent
      : (() => { throw new Error('Group creation intent is unsupported.'); })(),
    stage: value.stage,
    createdAt,
    updatedAt,
  };
}

function sameCreation(left: PendingGroupCreationDraftV1, right: GroupCreationInputV1): boolean {
  return left.draftId === right.draftId
    && left.candidateGroupId === right.candidateGroupId
    && left.name === right.name
    && left.mode === right.mode;
}

function requiredIdentifier(value: string, label: string): string {
  const normalized = value?.trim();
  if (!normalized || normalized.length > 128 || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    throw new Error(`${label} is invalid.`);
  }
  return normalized;
}

function requiredName(value: string): string {
  const normalized = value?.trim();
  if (!normalized || normalized.length > 100 || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    throw new Error('Group name is invalid.');
  }
  return normalized;
}

function canonicalTimestamp(value: string): string {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error('Group timestamp is invalid.');
  return new Date(value).toISOString();
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
