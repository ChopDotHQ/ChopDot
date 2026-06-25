import { cryptoWaitReady, encodeAddress, sr25519PairFromSeed, sr25519Sign } from '@polkadot/util-crypto';
import type { ReceivedStatement } from '@parity/product-sdk-statement-store';
import { describe, expect, it } from 'vitest';
import {
  addDotObligation,
  buildDotStatus,
  createDotChapter,
  exportDotReceipt,
  type DotChapter,
  type DotReceipt,
} from './commitmentKernel';
import { createChapterPotTemplate } from './chapterPotTemplates';
import {
  DOT_SESSION_GENESIS_HASH,
  AssetHubReferenceAdapter,
  DemoDotSessionSignerAdapter,
  ProductAccountDotSessionSignerAdapter,
  ProductSdkAssetHubEvidenceAdapter,
  ProductSdkCloseoutProofAdapter,
  ProductSdkCloudStorageReceiptAdapter,
  ProductSdkPrivatePayloadAdapter,
  ProductSdkStatementStoreSessionAdapter,
  ProofAnchorAdapter,
  StatementStoreSessionAdapter,
  acceptDotChapterInvitation,
  createDemoDotInvitationAccess,
  createDemoDotInviteKeyPair,
  createDemoDotMembershipGrants,
  createDotChapterInvitation,
  createDotInviteAccessEvent,
  createDotMembershipGrant,
  createDotSessionEventAsync,
  createDotSessionEvent,
  dotInviteAccessEventHash,
  dotSessionEventHash,
  getDemoDotSessionSigner,
  reduceDotInviteAccessEvents,
  reduceDotSessionEvents,
  runDotNativeHostPreflight,
  sessionCloseoutReady,
  verifyDotChapterInvitation,
  verifyDotInviteAccessEvent,
  LocalSignedSessionAdapter,
  type DotInviteAccessEvent,
  type DotAssetHubEvidenceAdapter,
  type DotAssetHubEvidenceInput,
  type DotAssetHubReference,
  type DotSessionAction,
  type DotSessionEvent,
  type DotSessionSigner,
  type DotSessionTransportAdapter,
  type DotReceiptArchiveAdapter,
} from './polkadotSession';

function savingsChapter(): DotChapter {
  return createChapterPotTemplate('savings_circle').chapter;
}

function sharedExpenseChapter(): DotChapter {
  let chapter = createDotChapter({
    id: 'dot-shared-expense-chapter',
    name: 'Dinner split',
    mode: 'shared_expense',
    currency: 'PAS',
    policySummary: 'Friends split dinner. Payment evidence still needs receiver confirmation.',
    participants: [
      { id: 'mina', name: 'Mina', roles: ['organizer', 'treasurer', 'approver', 'receiver'] },
      { id: 'leo', name: 'Leo', roles: ['contributor', 'payer'] },
      { id: 'nia', name: 'Nina', roles: ['contributor'] },
      { id: 'omar', name: 'Omar', roles: ['contributor'] },
    ],
    privacyLevel: 'standard',
  });
  chapter = addDotObligation(chapter, {
    kind: 'expense_leg',
    title: 'Leo dinner share',
    fromParticipantId: 'leo',
    toParticipantId: 'mina',
    amount: 1,
    currency: 'PAS',
    required: true,
  });
  return chapter;
}

function signedEvent(
  events: DotSessionEvent[],
  participantId: string,
  action: DotSessionAction,
  index = events.length + 1,
): DotSessionEvent {
  return createDotSessionEvent({
    id: `event_${index}`,
    chapterId: 'dot-savings-circle-chapter',
    participantId,
    deviceId: `device_${participantId}`,
    action,
    previousEventHash: events.length ? dotSessionEventHash(events[events.length - 1] as DotSessionEvent) : DOT_SESSION_GENESIS_HASH,
    signer: getDemoDotSessionSigner(participantId),
    timestamp: `2026-06-09T12:00:0${index}.000Z`,
  });
}

function fakeStatementStoreHostAdapter(): DotSessionTransportAdapter {
  let events: DotSessionEvent[] = [];
  return {
    kind: 'fake_statement_store_host',
    loadEvents: async () => events,
    appendEvent: async (chapter, signer, deviceId, action) => {
      const event = await createDotSessionEventAsync({
        chapterId: chapter.id,
        participantId: signer.participantId,
        deviceId,
        action,
        previousEventHash: events.length ? dotSessionEventHash(events[events.length - 1] as DotSessionEvent) : DOT_SESSION_GENESIS_HASH,
        signer,
      });
      events = [...events, event];
      return events;
    },
    subscribe: () => () => undefined,
  };
}

function productSdkStatementStoreHostSimClientFactory() {
  type StoredStatement<T = unknown> = ReceivedStatement<T>;
  const statements: StoredStatement[] = [];
  const subscribers: Array<{
    topic2?: string;
    callback: (statement: StoredStatement) => void;
  }> = [];
  return () => ({
    connect: async () => undefined,
    isConnected: () => true,
    publish: async <T,>(data: T, options?: { topic2?: string }) => {
      const statement: StoredStatement<T> = {
        data,
        topics: options?.topic2 ? [options.topic2] : [],
        raw: {},
      };
      statements.push(statement);
      for (const subscriber of subscribers) {
        if (!subscriber.topic2 || subscriber.topic2 === options?.topic2) {
          subscriber.callback(statement as StoredStatement);
        }
      }
      return true;
    },
    query: async <T,>(options?: { topic2?: string }) =>
      statements.filter((statement) => !options?.topic2 || statement.topics.includes(options.topic2)) as Array<StoredStatement<T>>,
    subscribe: <T,>(callback: (statement: StoredStatement<T>) => void, options?: { topic2?: string }) => {
      const subscriber = {
        topic2: options?.topic2,
        callback: callback as (statement: StoredStatement) => void,
      };
      subscribers.push(subscriber);
      for (const statement of statements) {
        if (!options?.topic2 || statement.topics.includes(options.topic2)) {
          callback(statement as StoredStatement<T>);
        }
      }
      return {
        unsubscribe: () => {
          const index = subscribers.indexOf(subscriber);
          if (index >= 0) subscribers.splice(index, 1);
        },
      };
    },
    destroy: () => undefined,
  });
}

function fakeCloudStorageReceiptAdapter(receipt: DotReceipt, retrievedReceipt: DotReceipt = receipt): DotReceiptArchiveAdapter {
  return new ProductSdkCloudStorageReceiptAdapter({
    shouldAttemptCloudStorage: () => true,
    requireCloudStorage: true,
    storeReceipt: async () => ({
      cid: 'bafy-chopdot-receipt',
      blockNumber: 123,
      extrinsicIndex: 4,
    }),
    retrieveReceipt: async () => retrievedReceipt,
  });
}

function fakeAssetHubEvidenceAdapter(
  build?: (input: DotAssetHubEvidenceInput) => Partial<DotAssetHubReference>,
): DotAssetHubEvidenceAdapter {
  return {
    kind: 'fake_asset_hub_host',
    evidenceForClaim: async (input) => ({
      subjectId: input.subjectId,
      txHash: '0xasset-hub-tx',
      lifecycle: 'finalized',
      amount: input.amount,
      currency: input.currency,
      ...build?.(input),
    }),
  };
}

describe('Polkadot-native signed session replay', () => {
  it('rejects an unsigned or tampered session event', () => {
    const chapter = savingsChapter();
    const event = signedEvent([], 'leo', { type: 'claim_contribution', obligationId: 'obligation_1' });

    expect(() =>
      reduceDotSessionEvents(chapter, [
        {
          ...event,
          signature: '',
        },
      ]),
    ).toThrow(/signature/i);

    expect(() =>
      reduceDotSessionEvents(chapter, [
        {
          ...event,
          action: { type: 'claim_contribution', obligationId: 'obligation_2' },
        },
      ]),
    ).toThrow(/signature/i);
  });

  it('rejects a participant trying to claim another person payment', () => {
    const chapter = savingsChapter();
    const event = signedEvent([], 'leo', { type: 'claim_contribution', obligationId: 'obligation_2' });

    expect(() => reduceDotSessionEvents(chapter, [event])).toThrow(/obligated participant/i);
  });

  it('does not let a contributor confirm their own payment', () => {
    const chapter = savingsChapter();
    const events: DotSessionEvent[] = [];
    events.push(signedEvent(events, 'leo', { type: 'claim_contribution', obligationId: 'obligation_1' }));
    events.push(signedEvent(events, 'leo', { type: 'confirm_contribution', obligationId: 'obligation_1' }));

    expect(() => reduceDotSessionEvents(chapter, events)).toThrow(/receiver, organizer, or treasurer/i);
  });

  it('accepts a signed event when the signer has a valid membership grant', async () => {
    const chapter = savingsChapter();
    const grants = await createDemoDotMembershipGrants(chapter);
    const event = signedEvent([], 'leo', { type: 'claim_contribution', obligationId: 'obligation_1' });

    const result = reduceDotSessionEvents(chapter, [event], { membershipGrants: grants });

    expect(result.chapter.obligations[0]?.state).toBe('claimed');
  });

  it('rejects a signed event when the signer has no membership grant for that participant', async () => {
    const chapter = savingsChapter();
    const grants = (await createDemoDotMembershipGrants(chapter)).filter((grant) => grant.participantId !== 'leo');
    const event = signedEvent([], 'leo', { type: 'claim_contribution', obligationId: 'obligation_1' });

    expect(() => reduceDotSessionEvents(chapter, [event], { membershipGrants: grants })).toThrow(/no membership grant/i);
  });

  it('rejects expired or revoked membership grants before applying the event', async () => {
    const chapter = savingsChapter();
    const leo = chapter.participants.find((participant) => participant.id === 'leo');
    if (!leo) throw new Error('Missing Leo participant');
    const issuerSigner = getDemoDotSessionSigner('mina');
    const leoSigner = getDemoDotSessionSigner('leo');
    const event = signedEvent([], 'leo', { type: 'claim_contribution', obligationId: 'obligation_1' });
    const expiredGrant = await createDotMembershipGrant({
      id: 'grant_expired_leo',
      chapterId: chapter.id,
      participantId: 'leo',
      signerAddress: leoSigner.signerAddress,
      roles: leo.roles,
      issuedByParticipantId: 'mina',
      issuerSigner,
      issuedAt: '2026-06-09T10:00:00.000Z',
      expiresAt: '2026-06-09T11:00:00.000Z',
    });
    const revokedGrant = await createDotMembershipGrant({
      id: 'grant_revoked_leo',
      chapterId: chapter.id,
      participantId: 'leo',
      signerAddress: leoSigner.signerAddress,
      roles: leo.roles,
      issuedByParticipantId: 'mina',
      issuerSigner,
      issuedAt: '2026-06-09T10:00:00.000Z',
      revokedAt: '2026-06-09T11:00:00.000Z',
    });

    expect(() =>
      reduceDotSessionEvents(chapter, [event], {
        membershipGrants: [expiredGrant],
        now: '2026-06-09T12:00:00.000Z',
      }),
    ).toThrow(/membership grant/i);
    expect(() =>
      reduceDotSessionEvents(chapter, [event], {
        membershipGrants: [revokedGrant],
        now: '2026-06-09T12:00:00.000Z',
      }),
    ).toThrow(/membership grant/i);
  });

  it('accepts an invite-derived membership grant and chapter key for the right participant', async () => {
    const chapter = savingsChapter();
    const access = await createDemoDotInvitationAccess(chapter, 'leo');
    const event = signedEvent([], 'leo', { type: 'claim_contribution', obligationId: 'obligation_1' });
    const privatePayloadAdapter = new ProductSdkPrivatePayloadAdapter({ chapterId: chapter.id, key: access.chapterKey });
    const privatePayloadRef = await privatePayloadAdapter.encryptPayload({
      subjectId: 'obligation_1',
      kind: 'payment_reference',
      visibility: 'counterparty_visible',
      recipients: ['leo', 'mina'],
      payload: { txHash: '0xinvite-derived-private-ref' },
    });

    const result = reduceDotSessionEvents(chapter, [event], { membershipGrants: access.membershipGrants });
    const decrypted = await privatePayloadAdapter.decryptPayload(privatePayloadRef);

    expect(access.acceptedInvitation?.participantId).toBe('leo');
    expect(result.chapter.obligations[0]?.state).toBe('claimed');
    expect(decrypted).toEqual({ txHash: '0xinvite-derived-private-ref' });
  });

  it('rejects expired, revoked, or forwarded chapter invitations', async () => {
    const chapter = savingsChapter();
    const issuerSigner = getDemoDotSessionSigner('mina');
    const leoSigner = getDemoDotSessionSigner('leo');
    const ninaSigner = getDemoDotSessionSigner('nia');
    const leoKey = await createDemoDotInviteKeyPair('leo');
    const ninaKey = await createDemoDotInviteKeyPair('nia');
    const expiredInvite = await createDotChapterInvitation({
      id: 'invite_expired_leo',
      chapter,
      inviteeParticipantId: 'leo',
      inviteeSignerAddress: leoSigner.signerAddress,
      inviteeEncryptionPublicKeyHex: leoKey.publicKeyHex,
      issuedByParticipantId: 'mina',
      issuerSigner,
      issuedAt: '2026-06-09T10:00:00.000Z',
      expiresAt: '2026-06-09T11:00:00.000Z',
    });
    const revokedInvite = await createDotChapterInvitation({
      id: 'invite_revoked_leo',
      chapter,
      inviteeParticipantId: 'leo',
      inviteeSignerAddress: leoSigner.signerAddress,
      inviteeEncryptionPublicKeyHex: leoKey.publicKeyHex,
      issuedByParticipantId: 'mina',
      issuerSigner,
      issuedAt: '2026-06-09T10:00:00.000Z',
      revokedAt: '2026-06-09T11:00:00.000Z',
    });
    const validInvite = await createDotChapterInvitation({
      id: 'invite_valid_leo',
      chapter,
      inviteeParticipantId: 'leo',
      inviteeSignerAddress: leoSigner.signerAddress,
      inviteeEncryptionPublicKeyHex: leoKey.publicKeyHex,
      issuedByParticipantId: 'mina',
      issuerSigner,
      issuedAt: '2026-06-09T10:00:00.000Z',
      expiresAt: '2026-06-09T13:00:00.000Z',
    });

    expect(verifyDotChapterInvitation(chapter, expiredInvite, '2026-06-09T12:00:00.000Z')).toBe(false);
    expect(verifyDotChapterInvitation(chapter, revokedInvite, '2026-06-09T12:00:00.000Z')).toBe(false);
    await expect(acceptDotChapterInvitation({
      chapter,
      invitation: expiredInvite,
      inviteeParticipantId: 'leo',
      inviteeSignerAddress: leoSigner.signerAddress,
      inviteeSecretKeyHex: leoKey.secretKeyHex,
      now: '2026-06-09T12:00:00.000Z',
    })).rejects.toThrow(/invalid, expired, or revoked/i);
    await expect(acceptDotChapterInvitation({
      chapter,
      invitation: validInvite,
      inviteeParticipantId: 'nia',
      inviteeSignerAddress: ninaSigner.signerAddress,
      inviteeSecretKeyHex: ninaKey.secretKeyHex,
      now: '2026-06-09T12:00:00.000Z',
    })).rejects.toThrow(/cannot be accepted/i);
  });

  it('derives membership from durable invite access events and removes it on revocation', async () => {
    const chapter = savingsChapter();
    const issuerSigner = getDemoDotSessionSigner('mina');
    const leoSigner = getDemoDotSessionSigner('leo');
    const leoKey = await createDemoDotInviteKeyPair('leo');
    const invitation = await createDotChapterInvitation({
      id: 'invite_access_leo',
      chapter,
      inviteeParticipantId: 'leo',
      inviteeSignerAddress: leoSigner.signerAddress,
      inviteeEncryptionPublicKeyHex: leoKey.publicKeyHex,
      issuedByParticipantId: 'mina',
      issuerSigner,
      issuedAt: '2026-06-09T10:00:00.000Z',
      expiresAt: '2026-06-09T13:00:00.000Z',
    });
    const acceptEvent = await createDotInviteAccessEvent({
      id: 'access_accept_leo',
      chapterId: chapter.id,
      participantId: 'leo',
      deviceId: 'device_leo',
      action: { type: 'accept_invitation', invitation },
      previousEventHash: DOT_SESSION_GENESIS_HASH,
      signer: leoSigner,
      timestamp: '2026-06-09T10:05:00.000Z',
    });
    const revokeEvent = await createDotInviteAccessEvent({
      id: 'access_revoke_leo',
      chapterId: chapter.id,
      participantId: 'mina',
      deviceId: 'device_mina',
      action: {
        type: 'revoke_invitation',
        invitation,
        revokedAt: '2026-06-09T10:10:00.000Z',
        reason: 'Invite revoked by organizer.',
      },
      previousEventHash: dotInviteAccessEventHash(acceptEvent),
      signer: issuerSigner,
      timestamp: '2026-06-09T10:10:00.000Z',
    });

    expect(verifyDotInviteAccessEvent(chapter, acceptEvent, '2026-06-09T12:00:00.000Z')).toBe(true);
    expect(reduceDotInviteAccessEvents(chapter, [acceptEvent], '2026-06-09T12:00:00.000Z').membershipGrants).toHaveLength(1);
    const revokedAccess = reduceDotInviteAccessEvents(chapter, [acceptEvent, revokeEvent], '2026-06-09T12:00:00.000Z');

    expect(revokedAccess.membershipGrants).toHaveLength(0);
    expect(revokedAccess.revokedInvitationIds).toEqual(['invite_access_leo']);
  });

  it('persists invite access events through the local no-Supabase transport adapter', async () => {
    const chapter = savingsChapter();
    const access = await createDemoDotInvitationAccess(chapter, 'leo');
    const adapter = new LocalSignedSessionAdapter();
    const leoInvitation = access.invitations.find((invitation) => invitation.inviteeParticipantId === 'leo');
    if (!leoInvitation) throw new Error('Missing Leo invitation');

    const events = await adapter.appendAccessEvent(
      chapter,
      getDemoDotSessionSigner('leo'),
      'device_leo',
      { type: 'accept_invitation', invitation: leoInvitation },
    );
    const derivedAccess = reduceDotInviteAccessEvents(chapter, events);

    expect(events).toHaveLength(1);
    expect(derivedAccess.membershipGrants[0]?.participantId).toBe('leo');
  });

  it('treats parallel Statement Store access seeding as idempotent when the same event already landed', async () => {
    const chapter = savingsChapter();
    const access = await createDemoDotInvitationAccess(chapter, 'leo');
    const adapter = new StatementStoreSessionAdapter('/statement-store-test', 'parallel-access');
    const leoInvitation = access.invitations.find((invitation) => invitation.inviteeParticipantId === 'leo');
    if (!leoInvitation) throw new Error('Missing Leo invitation');
    const originalFetch = globalThis.fetch;
    let loadCount = 0;
    let committedEvent: DotInviteAccessEvent | undefined;

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'POST') {
        committedEvent = JSON.parse(String(init?.body ?? '{}')).event as DotInviteAccessEvent;
        return new Response(JSON.stringify({ error: 'access event chain is out of order' }), {
          status: 409,
          headers: { 'content-type': 'application/json' },
        });
      }

      loadCount += 1;
      return new Response(JSON.stringify({ events: loadCount === 1 ? [] : [committedEvent] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const events = await adapter.appendAccessEvent(
        chapter,
        getDemoDotSessionSigner('leo'),
        'device_leo',
        { type: 'accept_invitation', invitation: leoInvitation },
      );
      const derivedAccess = reduceDotInviteAccessEvents(chapter, events);

      expect(events).toHaveLength(1);
      expect(events[0]?.id).toBe(committedEvent?.id);
      expect(derivedAccess.membershipGrants[0]?.participantId).toBe('leo');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('treats a finalized Asset Hub reference as evidence, not receipt confirmation', () => {
    const chapter = savingsChapter();
    const event = signedEvent([], 'leo', {
      type: 'claim_contribution',
      obligationId: 'obligation_1',
      assetHubReference: {
        subjectId: 'obligation_1',
        txHash: '0xasset-hub-lab',
        lifecycle: 'finalized',
        amount: 100,
        currency: 'TEST_USD',
      },
    });

    const result = reduceDotSessionEvents(chapter, [event]);

    expect(result.assetHubReferences[0]?.lifecycle).toBe('finalized');
    expect(result.chapter.obligations[0]?.state).toBe('claimed');
    expect(result.chapter.contributionClaims[0]?.state).toBe('claimed');
    expect(buildDotStatus(result.chapter).closeoutReadiness).toBe('blocked');
  });

  it('treats the real Paseo Asset Hub PAS transfer trial as evidence only', () => {
    const chapter = savingsChapter();
    const event = signedEvent([], 'leo', {
      type: 'claim_contribution',
      obligationId: 'obligation_1',
      assetHubReference: {
        subjectId: 'obligation_1',
        txHash: '0xd1e2abdc6c64c7d14d8d1e1a3dbd93fb4cc4cb73f910a284ccc9e80b5c59d8be',
        lifecycle: 'finalized',
        amount: 1,
        currency: 'PAS',
        blockNumber: 10247538,
        extrinsicIndex: 2,
      },
    });

    const result = reduceDotSessionEvents(chapter, [event]);
    const status = buildDotStatus(result.chapter);

    expect(result.assetHubReferences[0]).toMatchObject({
      txHash: '0xd1e2abdc6c64c7d14d8d1e1a3dbd93fb4cc4cb73f910a284ccc9e80b5c59d8be',
      lifecycle: 'finalized',
      currency: 'PAS',
      blockNumber: 10247538,
      extrinsicIndex: 2,
    });
    expect(result.chapter.obligations[0]?.state).toBe('claimed');
    expect(result.chapter.contributionClaims[0]?.state).toBe('claimed');
    expect(result.chapter.confirmations).toHaveLength(0);
    expect(status.blockers).toContain('Leo must complete Leo contribution');
    expect(status.closeoutReadiness).toBe('blocked');
  });

  it('keeps escrow deposit evidence from creating claims or confirmations across modes', () => {
    const cases = [
      { chapter: sharedExpenseChapter(), actorId: 'leo', subjectId: 'obligation_1', currency: 'PAS' as const },
      { chapter: savingsChapter(), actorId: 'leo', subjectId: 'obligation_1', currency: 'PAS' as const },
      { chapter: createChapterPotTemplate('emergency_pot').chapter, actorId: 'casey', subjectId: 'obligation_1', currency: 'TEST_USDC' as const },
      { chapter: createChapterPotTemplate('community_fund').chapter, actorId: 'sam', subjectId: 'obligation_1', currency: 'TEST_USDC' as const },
    ];

    for (const item of cases) {
      const event = createDotSessionEvent({
        id: `event_${item.chapter.mode}`,
        chapterId: item.chapter.id,
        participantId: item.actorId,
        deviceId: `device_${item.actorId}`,
        action: {
          type: 'escrow_evidence',
          reference: {
            subjectId: item.subjectId,
            caseId: `case_${item.chapter.mode}`,
            contractAddress: '0x000000000000000000000000000000000000c0de',
            txHash: `0xescrow${item.chapter.mode}`,
            lifecycle: 'deposited',
            eventName: 'Deposited',
            amount: 1,
            currency: item.currency,
            blockNumber: 42,
            extrinsicIndex: 1,
          },
        },
        previousEventHash: DOT_SESSION_GENESIS_HASH,
        signer: getDemoDotSessionSigner(item.actorId),
        timestamp: '2026-06-20T12:00:00.000Z',
      });

      const result = reduceDotSessionEvents(item.chapter, [event]);

      expect(result.escrowEvidenceRefs).toHaveLength(1);
      expect(result.escrowEvidenceRefs[0]?.lifecycle).toBe('deposited');
      expect(result.chapter.obligations[0]?.state).toBe('open');
      expect(result.chapter.contributionClaims).toHaveLength(0);
      expect(result.chapter.confirmations).toHaveLength(0);
      expect(buildDotStatus(result.chapter).closeoutReadiness).toBe('blocked');
    }
  });

  it('keeps escrow release evidence from confirming the recipient or closing the chapter', () => {
    const chapter = savingsChapter();
    const events: DotSessionEvent[] = [];
    events.push(signedEvent(events, 'leo', { type: 'claim_contribution', obligationId: 'obligation_1' }));
    events.push(signedEvent(events, 'mina', { type: 'confirm_contribution', obligationId: 'obligation_1' }));
    events.push(signedEvent(events, 'mina', {
      type: 'create_release',
      release: {
        title: 'Round 1 payout to Leo',
        requesterId: 'mina',
        recipientId: 'leo',
        amount: 1,
        currency: 'PAS',
        requiredApproverIds: ['mina'],
      },
    }));
    events.push(signedEvent(events, 'mina', { type: 'approve_release', releaseRequestId: 'release_1' }));
    events.push(signedEvent(events, 'mina', {
      type: 'escrow_evidence',
      reference: {
        subjectId: 'release_1',
        caseId: 'case_savings_circle_round_1',
        contractAddress: '0x000000000000000000000000000000000000c0de',
        txHash: '0xescrowreleased',
        lifecycle: 'released',
        eventName: 'Released',
        amount: 1,
        currency: 'PAS',
        blockNumber: 43,
        extrinsicIndex: 2,
      },
    }));

    const result = reduceDotSessionEvents(chapter, events);

    expect(result.escrowEvidenceRefs.at(-1)).toMatchObject({
      lifecycle: 'released',
      eventName: 'Released',
      currency: 'PAS',
    });
    expect(result.chapter.releaseRequests[0]?.state).toBe('approved');
    expect(result.chapter.confirmations.some((item) => item.subjectType === 'release_request')).toBe(false);
    expect(result.chapter.state).toBe('open');
    expect(buildDotStatus(result.chapter).blockers).toContain('Mina must record release outside ChopDot');
  });

  it('keeps emergency escrow evidence out of the redacted receipt', () => {
    const chapter = createChapterPotTemplate('emergency_pot').chapter;
    const event = createDotSessionEvent({
      id: 'event_emergency_escrow_privacy',
      chapterId: chapter.id,
      participantId: 'casey',
      deviceId: 'device_casey',
      action: {
        type: 'escrow_evidence',
        reference: {
          subjectId: 'obligation_1',
          caseId: 'case_emergency_private_support',
          contractAddress: '0x000000000000000000000000000000000000c0de',
          txHash: '0xescrowemergencyprivate',
          lifecycle: 'deposited',
          eventName: 'Deposited',
          amount: 100,
          currency: 'TEST_USDC',
          blockNumber: 44,
          extrinsicIndex: 3,
        },
      },
      previousEventHash: DOT_SESSION_GENESIS_HASH,
      signer: getDemoDotSessionSigner('casey'),
      timestamp: '2026-06-20T12:01:00.000Z',
    });

    const result = reduceDotSessionEvents(chapter, [event]);
    const receipt = exportDotReceipt(result.chapter, { redaction: 'redacted' });
    const serialized = JSON.stringify(receipt);

    expect(result.escrowEvidenceRefs).toHaveLength(1);
    expect(receipt.chapterName).toBe('Emergency pot');
    expect(serialized).not.toContain('Jordan');
    expect(serialized).not.toContain('Private medical details');
    expect(serialized).not.toContain('0x000000000000000000000000000000000000c0de');
    expect(serialized).not.toContain('0xescrowemergencyprivate');
  });

  it('encrypts private payment details so shared session events do not expose raw payment refs', async () => {
    const chapter = savingsChapter();
    const adapter = new ProductSdkPrivatePayloadAdapter({ chapterId: chapter.id });
    const privatePayloadRef = await adapter.encryptPayload({
      subjectId: 'obligation_1',
      kind: 'payment_reference',
      visibility: 'counterparty_visible',
      recipients: ['leo', 'mina'],
      payload: {
        note: 'Leo paid Mina outside ChopDot.',
        assetHubReference: {
          subjectId: 'obligation_1',
          txHash: '0xprivate-asset-hub-ref',
          lifecycle: 'finalized',
          amount: 100,
          currency: 'TEST_USDC',
        },
      },
    });
    const event = signedEvent([], 'leo', {
      type: 'claim_contribution',
      obligationId: 'obligation_1',
      note: 'Marked paid. Receiver still needs to confirm.',
      privatePayloadRef,
    });
    const serializedEvent = JSON.stringify(event);
    const result = reduceDotSessionEvents(chapter, [event]);
    const decrypted = await adapter.decryptPayload(privatePayloadRef);

    expect(serializedEvent).not.toContain('0xprivate-asset-hub-ref');
    expect(serializedEvent).not.toContain('Leo paid Mina outside ChopDot.');
    expect(result.assetHubReferences).toEqual([]);
    expect(result.privatePayloadRefs).toHaveLength(1);
    expect(decrypted).toMatchObject({
      note: 'Leo paid Mina outside ChopDot.',
      assetHubReference: {
        txHash: '0xprivate-asset-hub-ref',
        lifecycle: 'finalized',
      },
    });
    expect(result.chapter.obligations[0]?.state).toBe('claimed');
    expect(buildDotStatus(result.chapter).closeoutReadiness).toBe('blocked');
  });

  it('rejects private contribution events that also leak direct Asset Hub refs', async () => {
    const chapter = savingsChapter();
    const adapter = new ProductSdkPrivatePayloadAdapter({ chapterId: chapter.id });
    const privatePayloadRef = await adapter.encryptPayload({
      subjectId: 'obligation_1',
      kind: 'payment_reference',
      visibility: 'counterparty_visible',
      recipients: ['leo', 'mina'],
      payload: {
        assetHubReference: {
          subjectId: 'obligation_1',
          txHash: '0xprivateasset00000001',
          lifecycle: 'finalized',
          amount: 100,
          currency: 'TEST_USDC',
        },
      },
    });
    const event = signedEvent([], 'leo', {
      type: 'claim_contribution',
      obligationId: 'obligation_1',
      note: 'Marked paid. Receiver still needs to confirm.',
      privatePayloadRef,
      assetHubReference: {
        subjectId: 'obligation_1',
        txHash: '0xprivateasset00000001',
        lifecycle: 'finalized',
        amount: 100,
        currency: 'TEST_USDC',
      },
    });

    expect(() => reduceDotSessionEvents(chapter, [event])).toThrow(/private payment reference/i);
  });

  it('rejects private release events that also leak direct Asset Hub refs', async () => {
    const chapter = savingsChapter();
    const adapter = new ProductSdkPrivatePayloadAdapter({ chapterId: chapter.id });
    const privatePayloadRef = await adapter.encryptPayload({
      subjectId: 'release_1',
      kind: 'release_reference',
      visibility: 'counterparty_visible',
      recipients: ['leo', 'mina'],
      payload: {
        assetHubReference: {
          subjectId: 'release_1',
          txHash: '0xprivaterelease0001',
          lifecycle: 'finalized',
          amount: 300,
          currency: 'TEST_USDC',
        },
      },
    });
    const event = signedEvent([], 'mina', {
      type: 'claim_release',
      releaseRequestId: 'release_1',
      privatePayloadRef,
      assetHubReference: {
        subjectId: 'release_1',
        txHash: '0xprivaterelease0001',
        lifecycle: 'finalized',
        amount: 300,
        currency: 'TEST_USDC',
      },
    });

    expect(() => reduceDotSessionEvents(chapter, [event])).toThrow(/private release reference/i);
  });

  it('rejects private exception events that leak sensitive note text into the shared log', async () => {
    const chapter = savingsChapter();
    const adapter = new ProductSdkPrivatePayloadAdapter({ chapterId: chapter.id });
    const privatePayloadRef = await adapter.encryptPayload({
      subjectId: 'obligation_2',
      kind: 'exception_note',
      visibility: 'organizer_operational',
      recipients: ['mina'],
      payload: {
        note: 'Nia sent a private medical account note to Mina.',
      },
    });
    const event = signedEvent([], 'mina', {
      type: 'record_exception',
      subjectType: 'obligation',
      subjectId: 'obligation_2',
      note: 'Private medical account note: IBAN CH00 0000 0000 0000 0000 0',
      visibility: 'organizer_operational',
      privatePayloadRef,
    });

    expect(() => reduceDotSessionEvents(chapter, [event])).toThrow(/private exception note/i);
  });

  it('falls back to local Asset Hub evidence when Product SDK tx cannot run', async () => {
    const adapter = new ProductSdkAssetHubEvidenceAdapter({
      fallback: new AssetHubReferenceAdapter(),
      shouldAttemptProductSdkTx: () => false,
    });

    const reference = await adapter.evidenceForClaim({
      subjectId: 'obligation_1',
      txHash: '0xasset-hub-fallback',
      amount: 100,
      currency: 'TEST_USDC',
    });

    expect(reference).toEqual({
      subjectId: 'obligation_1',
      txHash: '0xasset-hub-fallback',
      lifecycle: 'finalized',
      amount: 100,
      currency: 'TEST_USDC',
    });
  });

  it('does not fall back when Asset Hub host tx evidence is required', async () => {
    const unavailableAdapter = new ProductSdkAssetHubEvidenceAdapter({
      fallback: new AssetHubReferenceAdapter(),
      shouldAttemptProductSdkTx: () => false,
      requireProductSdkTx: true,
    });
    const missingTxAdapter = new ProductSdkAssetHubEvidenceAdapter({
      fallback: new AssetHubReferenceAdapter(),
      shouldAttemptProductSdkTx: () => true,
      requireProductSdkTx: true,
    });
    const failingAdapter = new ProductSdkAssetHubEvidenceAdapter({
      fallback: new AssetHubReferenceAdapter(),
      shouldAttemptProductSdkTx: () => true,
      requireProductSdkTx: true,
      submitTx: async () => {
        throw new Error('host tx evidence unavailable');
      },
    });
    const evidence = {
      subjectId: 'obligation_1',
      txHash: '0xasset-hub-required',
      amount: 100,
      currency: 'USDC' as const,
    };

    await expect(unavailableAdapter.evidenceForClaim(evidence)).rejects.toThrow(/host path is unavailable/i);
    await expect(missingTxAdapter.evidenceForClaim(evidence)).rejects.toThrow(/requires a tx and signer/i);
    await expect(failingAdapter.evidenceForClaim({
      ...evidence,
      tx: {},
      signer: {},
    })).rejects.toThrow(/host tx evidence unavailable/i);
  });

  it('maps Product SDK tx lifecycle into evidence without confirming receipt', async () => {
    const chapter = savingsChapter();
    const adapter = new ProductSdkAssetHubEvidenceAdapter({
      shouldAttemptProductSdkTx: () => true,
      requireProductSdkTx: true,
      submitTx: async (_input, onStatus) => {
        onStatus('signing');
        onStatus('broadcasting');
        onStatus('in-block');
        onStatus('finalized');
        return {
          txHash: '0xasset-hub-product-sdk',
          ok: true,
          block: { number: 42, index: 3 },
        };
      },
    });
    const assetHubReference = await adapter.evidenceForClaim({
      subjectId: 'obligation_1',
      txHash: '0xpending-product-sdk',
      tx: {},
      signer: {},
      amount: 100,
      currency: 'USDC',
    });
    const event = signedEvent([], 'leo', {
      type: 'claim_contribution',
      obligationId: 'obligation_1',
      assetHubReference,
    });

    const result = reduceDotSessionEvents(chapter, [event]);

    expect(assetHubReference).toMatchObject({
      txHash: '0xasset-hub-product-sdk',
      lifecycle: 'finalized',
      blockNumber: 42,
      extrinsicIndex: 3,
    });
    expect(result.chapter.obligations[0]?.state).toBe('claimed');
    expect(result.chapter.contributionClaims[0]?.state).toBe('claimed');
    expect(buildDotStatus(result.chapter).closeoutReadiness).toBe('blocked');
  });

  it('rejects duplicate session events so a payment cannot double-count', () => {
    const chapter = savingsChapter();
    const event = signedEvent([], 'leo', { type: 'claim_contribution', obligationId: 'obligation_1' });

    expect(() => reduceDotSessionEvents(chapter, [event, event])).toThrow(/duplicate/i);
  });

  it('replays to the same derived state after reload', () => {
    const chapter = savingsChapter();
    const events: DotSessionEvent[] = [];
    events.push(signedEvent(events, 'leo', { type: 'claim_contribution', obligationId: 'obligation_1' }));
    events.push(signedEvent(events, 'mina', { type: 'confirm_contribution', obligationId: 'obligation_1' }));
    events.push(signedEvent(events, 'mina', {
      type: 'record_exception',
      subjectType: 'obligation',
      subjectId: 'obligation_2',
      note: 'Nina is delayed and the round will close with this note.',
      visibility: 'organizer_operational',
    }));

    const firstReplay = reduceDotSessionEvents(chapter, events);
    const secondReplay = reduceDotSessionEvents(savingsChapter(), JSON.parse(JSON.stringify(events)) as DotSessionEvent[]);

    expect(secondReplay.chapter.obligations.map((item) => item.state)).toEqual(firstReplay.chapter.obligations.map((item) => item.state));
    expect(secondReplay.chapter.contributionClaims).toEqual(firstReplay.chapter.contributionClaims);
    expect(secondReplay.chapter.exceptions).toEqual(firstReplay.chapter.exceptions);
  });

  it('does not allow closeout while required blockers remain', () => {
    const chapter = savingsChapter();
    const event = signedEvent([], 'mina', { type: 'close_chapter' });

    expect(sessionCloseoutReady([], chapter)).toBe(false);
    expect(() => reduceDotSessionEvents(chapter, [event])).toThrow(/blocker/i);
  });

  it('keeps receipt archive as an explicit replayed event after closeout', () => {
    const chapter = savingsChapter();
    const events: DotSessionEvent[] = [];
    events.push(signedEvent(events, 'mina', {
      type: 'close_chapter',
      allowOpenItems: true,
      annotation: 'Closing with unresolved items for archive test.',
    }));
    events.push(signedEvent(events, 'mina', {
      type: 'save_receipt',
      receiptHash: '0xreceipt-hash',
      storage: 'bulletin_lab',
    }));

    const result = reduceDotSessionEvents(chapter, events);

    expect(result.receipt?.state).toBe('closed_with_open_items');
    expect(result.savedReceiptRefs).toEqual([{ receiptHash: '0xreceipt-hash', storage: 'bulletin_lab' }]);
  });

  it('keeps closeout proof anchoring as explicit evidence after closeout', () => {
    const chapter = savingsChapter();
    const receipt = exportDotReceipt(chapter, { redaction: 'redacted' });
    const proof = new ProofAnchorAdapter().anchorReceipt(receipt);
    const events: DotSessionEvent[] = [];
    events.push(signedEvent(events, 'mina', {
      type: 'close_chapter',
      allowOpenItems: true,
      annotation: 'Closing with unresolved items for proof anchor test.',
    }));
    events.push(signedEvent(events, 'mina', {
      type: 'anchor_receipt',
      proof,
    }));

    const result = reduceDotSessionEvents(chapter, events);

    expect(result.receipt?.state).toBe('closed_with_open_items');
    expect(result.closeoutProofRefs).toEqual([proof]);
    expect(result.chapter.state).toBe('closed_with_open_items');
  });

  it('falls back to the local receipt archive when cloud storage is unavailable', async () => {
    const receipt = exportDotReceipt(savingsChapter(), { redaction: 'redacted' });
    const adapter = new ProductSdkCloudStorageReceiptAdapter({
      shouldAttemptCloudStorage: () => false,
    });

    const saved = await adapter.saveReceipt(receipt);
    const loaded = await adapter.loadReceipt(saved);

    expect(saved.storage).toBe('bulletin_lab');
    expect(saved.receiptHash).toMatch(/^0x/);
    expect(loaded).toEqual(receipt);
  });

  it('does not fall back when Cloud Storage host archive is required', async () => {
    const receipt = exportDotReceipt(savingsChapter(), { redaction: 'redacted' });
    const unavailableAdapter = new ProductSdkCloudStorageReceiptAdapter({
      shouldAttemptCloudStorage: () => false,
      requireCloudStorage: true,
    });
    const failingAdapter = new ProductSdkCloudStorageReceiptAdapter({
      shouldAttemptCloudStorage: () => true,
      requireCloudStorage: true,
      storeReceipt: async () => {
        throw new Error('host archive unavailable');
      },
    });

    await expect(unavailableAdapter.saveReceipt(receipt)).rejects.toThrow(/Cloud Storage host archive is unavailable/i);
    await expect(unavailableAdapter.loadReceipt({
      receiptHash: '0xmissing',
      storage: 'product_sdk_cloud_storage',
      cid: 'bafy-missing',
    })).rejects.toThrow(/Cloud Storage host archive retrieval is unavailable/i);
    await expect(failingAdapter.saveReceipt(receipt)).rejects.toThrow(/host archive unavailable/i);
  });

  it('can return and retrieve a Product SDK cloud-storage receipt through the archive boundary', async () => {
    const receipt = exportDotReceipt(savingsChapter(), { redaction: 'redacted' });
    const adapter = new ProductSdkCloudStorageReceiptAdapter({
      shouldAttemptCloudStorage: () => true,
      storeReceipt: async (payload) => ({
        cid: `cid-${payload.length}`,
        blockNumber: 123,
        extrinsicIndex: 4,
      }),
      retrieveReceipt: async () => receipt,
    });

    const saved = await adapter.saveReceipt(receipt);
    const loaded = await adapter.loadReceipt(saved);

    expect(saved.storage).toBe('product_sdk_cloud_storage');
    expect(saved.cid).toMatch(/^cid-/);
    expect(saved.blockNumber).toBe(123);
    expect(saved.extrinsicIndex).toBe(4);
    expect(loaded).toEqual(receipt);
  });

  it('rejects cloud-storage receipt retrieval when the returned payload hash does not match', async () => {
    const receipt = exportDotReceipt(savingsChapter(), { redaction: 'redacted' });
    const adapter = new ProductSdkCloudStorageReceiptAdapter({
      shouldAttemptCloudStorage: () => true,
      requireCloudStorage: true,
      storeReceipt: async () => ({ cid: 'cid-mismatch' }),
      retrieveReceipt: async () => ({
        ...receipt,
        chapterName: 'Different receipt',
      }),
    });

    const saved = await adapter.saveReceipt(receipt);

    await expect(adapter.loadReceipt(saved)).rejects.toThrow(/hash mismatch/i);
  });

  it('falls back to hash-only closeout proof when host anchoring is unavailable', async () => {
    const receipt = exportDotReceipt(savingsChapter(), { redaction: 'redacted' });
    const adapter = new ProductSdkCloseoutProofAdapter({
      shouldAttemptHostProof: () => false,
    });

    const proof = await adapter.anchorReceipt(receipt);

    expect(proof.storage).toBe('hash_only_lab');
    expect(proof.receiptHash).toMatch(/^0x/);
    expect(proof.anchorHash).toMatch(/^0x/);
  });

  it('does not fall back when native closeout host proof is required', async () => {
    const receipt = exportDotReceipt(savingsChapter(), { redaction: 'redacted' });
    const unavailableAdapter = new ProductSdkCloseoutProofAdapter({
      shouldAttemptHostProof: () => false,
      requireHostProof: true,
    });
    const missingSubmitterAdapter = new ProductSdkCloseoutProofAdapter({
      shouldAttemptHostProof: () => true,
      requireHostProof: true,
    });
    const failingAdapter = new ProductSdkCloseoutProofAdapter({
      shouldAttemptHostProof: () => true,
      requireHostProof: true,
      submitAnchor: async () => {
        throw new Error('host closeout anchor unavailable');
      },
    });

    await expect(unavailableAdapter.anchorReceipt(receipt)).rejects.toThrow(/host anchor is unavailable/i);
    await expect(missingSubmitterAdapter.anchorReceipt(receipt)).rejects.toThrow(/requires a host submitter/i);
    await expect(failingAdapter.anchorReceipt(receipt)).rejects.toThrow(/host closeout anchor unavailable/i);
  });

  it('can return a Product SDK closeout proof reference through the proof boundary', async () => {
    const receipt = exportDotReceipt(savingsChapter(), { redaction: 'redacted' });
    const adapter = new ProductSdkCloseoutProofAdapter({
      shouldAttemptHostProof: () => true,
      submitAnchor: async (_receipt, anchorHash) => ({
        txHash: `0xanchor-${anchorHash.slice(2, 10)}`,
        lifecycle: 'finalized',
        blockNumber: 222,
        extrinsicIndex: 7,
      }),
    });

    const proof = await adapter.anchorReceipt(receipt);

    expect(proof.storage).toBe('product_sdk_tx_anchor');
    expect(proof.txHash).toMatch(/^0xanchor-/);
    expect(proof.lifecycle).toBe('finalized');
    expect(proof.blockNumber).toBe(222);
    expect(proof.extrinsicIndex).toBe(7);
  });

  it('can verify a Polkadot raw signature without trusting a demo secret', async () => {
    await cryptoWaitReady();
    const chapter = savingsChapter();
    const pair = sr25519PairFromSeed(new Uint8Array(32).fill(7));
    const signer: DotSessionSigner = {
      participantId: 'leo',
      signerAddress: encodeAddress(pair.publicKey, 42),
      signatureScheme: 'polkadot-raw',
      signerSource: 'product_sdk_dev',
      signRaw: (payload) => sr25519Sign(payload, pair),
    };
    const event = await createDotSessionEventAsync({
      id: 'event_raw_1',
      chapterId: 'dot-savings-circle-chapter',
      participantId: 'leo',
      deviceId: 'device_leo',
      action: { type: 'claim_contribution', obligationId: 'obligation_1' },
      previousEventHash: DOT_SESSION_GENESIS_HASH,
      signer,
      timestamp: '2026-06-09T12:00:08.000Z',
    });

    const result = reduceDotSessionEvents(chapter, [event]);

    expect(event.signatureScheme).toBe('polkadot-raw');
    expect(result.chapter.obligations[0]?.state).toBe('claimed');
  });

  it('keeps signer participant mismatch blocked before transport append', async () => {
    const signer = getDemoDotSessionSigner('leo');

    await expect(createDotSessionEventAsync({
      id: 'event_bad_participant',
      chapterId: 'dot-savings-circle-chapter',
      participantId: 'mina',
      deviceId: 'device_leo',
      action: { type: 'confirm_contribution', obligationId: 'obligation_1' },
      previousEventHash: DOT_SESSION_GENESIS_HASH,
      signer,
    })).rejects.toThrow(/signer does not match/i);
  });

  it('falls back to the demo signer when Product Account host signing is unavailable', async () => {
    const adapter = new ProductAccountDotSessionSignerAdapter({
      providerType: 'host',
      fallback: new DemoDotSessionSignerAdapter(),
      shouldAttemptHost: () => false,
    });

    const signer = await adapter.getSigner('leo');

    expect(signer.signerSource).toBe('demo');
    expect(signer.signatureScheme).toBe('demo-blake2');
    adapter.destroy?.();
  });

  it('does not fall back when Product Account host signing is required', async () => {
    const adapter = new ProductAccountDotSessionSignerAdapter({
      providerType: 'host',
      fallback: new DemoDotSessionSignerAdapter(),
      requireProductAccount: true,
      shouldAttemptHost: () => false,
    });

    await expect(adapter.getSigner('leo')).rejects.toThrow(/host is unavailable/i);
    adapter.destroy?.();
  });

  it('does not fall back when Statement Store host transport is required', async () => {
    const chapter = savingsChapter();
    const adapter = new ProductSdkStatementStoreSessionAdapter({
      shouldAttemptHost: () => false,
    });
    const signer = getDemoDotSessionSigner('leo');

    await expect(adapter.loadEvents(chapter.id)).rejects.toThrow(/Statement Store host transport is unavailable/i);
    await expect(adapter.loadAccessEvents(chapter.id)).rejects.toThrow(/Statement Store host transport is unavailable/i);
    await expect(adapter.appendEvent(chapter, signer, 'device_leo', {
      type: 'claim_contribution',
      obligationId: 'obligation_1',
    })).rejects.toThrow(/Statement Store host transport is unavailable/i);
  });

  it('replays savings-circle events through Product SDK Statement Store host-sim transport', async () => {
    const clientFactory = productSdkStatementStoreHostSimClientFactory();
    const chapter = savingsChapter();
    const leoTransport = new ProductSdkStatementStoreSessionAdapter({ shouldAttemptHost: () => true, clientFactory });
    const ninaTransport = new ProductSdkStatementStoreSessionAdapter({ shouldAttemptHost: () => true, clientFactory });
    const omarTransport = new ProductSdkStatementStoreSessionAdapter({ shouldAttemptHost: () => true, clientFactory });
    const minaTransport = new ProductSdkStatementStoreSessionAdapter({ shouldAttemptHost: () => true, clientFactory });
    const verifierTransport = new ProductSdkStatementStoreSessionAdapter({ shouldAttemptHost: () => true, clientFactory });

    await leoTransport.appendEvent(chapter, getDemoDotSessionSigner('leo'), 'device_leo', {
      type: 'claim_contribution',
      obligationId: 'obligation_1',
    });
    await ninaTransport.appendEvent(chapter, getDemoDotSessionSigner('nia'), 'device_nia', {
      type: 'claim_contribution',
      obligationId: 'obligation_2',
    });
    await omarTransport.appendEvent(chapter, getDemoDotSessionSigner('omar'), 'device_omar', {
      type: 'claim_contribution',
      obligationId: 'obligation_3',
    });

    let replayed = reduceDotSessionEvents(chapter, await minaTransport.loadEvents(chapter.id)).chapter;
    expect(replayed.obligations.map((obligation) => obligation.state)).toEqual(['claimed', 'claimed', 'claimed']);

    await minaTransport.appendEvent(replayed, getDemoDotSessionSigner('mina'), 'device_mina', {
      type: 'confirm_contribution',
      obligationId: 'obligation_1',
    });
    replayed = reduceDotSessionEvents(chapter, await minaTransport.loadEvents(chapter.id)).chapter;
    await minaTransport.appendEvent(replayed, getDemoDotSessionSigner('mina'), 'device_mina', {
      type: 'confirm_contribution',
      obligationId: 'obligation_2',
    });
    replayed = reduceDotSessionEvents(chapter, await minaTransport.loadEvents(chapter.id)).chapter;
    await minaTransport.appendEvent(replayed, getDemoDotSessionSigner('mina'), 'device_mina', {
      type: 'confirm_contribution',
      obligationId: 'obligation_3',
    });

    const loadedEvents = await verifierTransport.loadEvents(chapter.id);
    const result = reduceDotSessionEvents(chapter, loadedEvents);

    expect(loadedEvents).toHaveLength(6);
    expect(result.chapter.obligations.map((obligation) => obligation.state)).toEqual(['confirmed', 'confirmed', 'confirmed']);
    expect(buildDotStatus(result.chapter).closeoutReadiness).toBe('ready');

    leoTransport.destroy();
    ninaTransport.destroy();
    omarTransport.destroy();
    minaTransport.destroy();
    verifierTransport.destroy();
  });

  it('reports every strict native host gate instead of hiding failures behind one fallback path', async () => {
    const chapter = savingsChapter();
    const receipt = exportDotReceipt(chapter, { redaction: 'redacted' });
    const results = await runDotNativeHostPreflight({
      chapter,
      receipt,
      participantId: 'leo',
      deviceId: 'device_leo',
      signerAdapter: new ProductAccountDotSessionSignerAdapter({
        providerType: 'host',
        requireProductAccount: true,
        shouldAttemptHost: () => false,
      }),
      transportAdapter: new ProductSdkStatementStoreSessionAdapter({
        shouldAttemptHost: () => false,
      }),
      receiptAdapter: new ProductSdkCloudStorageReceiptAdapter({
        shouldAttemptCloudStorage: () => false,
        requireCloudStorage: true,
      }),
      closeoutProofAdapter: new ProductSdkCloseoutProofAdapter({
        shouldAttemptHostProof: () => false,
        requireHostProof: true,
      }),
      assetHubEvidenceAdapter: new ProductSdkAssetHubEvidenceAdapter({
        shouldAttemptProductSdkTx: () => false,
        requireProductSdkTx: true,
      }),
    });

    expect(results.map((result) => result.id)).toEqual([
      'identity',
      'transport',
      'archive',
      'closeout_proof',
      'payout_evidence',
    ]);
    expect(results.every((result) => result.status === 'fail')).toBe(true);
    expect(results.find((result) => result.id === 'identity')?.detail).toMatch(/Product Account host is unavailable/i);
    expect(results.find((result) => result.id === 'transport')?.detail).toMatch(/Statement Store host transport is unavailable/i);
    expect(results.find((result) => result.id === 'archive')?.detail).toMatch(/Cloud Storage host archive is unavailable/i);
    expect(results.find((result) => result.id === 'closeout_proof')?.detail).toMatch(/closeout proof host anchor is unavailable/i);
    expect(results.find((result) => result.id === 'payout_evidence')?.detail).toMatch(/tx evidence host path is unavailable/i);
  });

  it('passes native host preflight only when host-shaped evidence is returned', async () => {
    const chapter = savingsChapter();
    const receipt = exportDotReceipt(chapter, { redaction: 'redacted' });
    const results = await runDotNativeHostPreflight({
      chapter,
      receipt,
      participantId: 'leo',
      deviceId: 'device_leo',
      signerAdapter: {
        kind: 'fake_product_account_host',
        getSigner: async (participantId) => ({
          participantId,
          signerAddress: '5FakeProductAccountHost',
          signatureScheme: 'polkadot-raw',
          signerSource: 'product_account_host',
          signRaw: async () => new Uint8Array([1, 2, 3]),
        }),
      },
      transportAdapter: fakeStatementStoreHostAdapter(),
      receiptAdapter: fakeCloudStorageReceiptAdapter(receipt),
      closeoutProofAdapter: {
        kind: 'fake_closeout_anchor_host',
        anchorReceipt: async () => ({
          receiptHash: '0xreceipt',
          anchorHash: '0xanchor',
          storage: 'product_sdk_tx_anchor',
          txHash: '0xanchor-tx',
          lifecycle: 'finalized',
        }),
      },
      assetHubEvidenceAdapter: {
        kind: 'fake_asset_hub_host',
        evidenceForClaim: async (input) => ({
          subjectId: input.subjectId,
          txHash: '0xasset-hub-tx',
          lifecycle: 'finalized',
          amount: input.amount,
          currency: input.currency,
        }),
      },
    });

    expect(results.every((result) => result.status === 'pass')).toBe(true);
  });

  it('fails Statement Store preflight when load does not return the appended probe event', async () => {
    const chapter = savingsChapter();
    const receipt = exportDotReceipt(chapter, { redaction: 'redacted' });
    const transportAdapter: DotSessionTransportAdapter = {
      kind: 'fake_statement_store_host_missing_probe',
      loadEvents: async () => [],
      appendEvent: async (targetChapter, signer, deviceId, action) => [
        await createDotSessionEventAsync({
          chapterId: targetChapter.id,
          participantId: signer.participantId,
          deviceId,
          action,
          previousEventHash: DOT_SESSION_GENESIS_HASH,
          signer,
        }),
      ],
      subscribe: () => () => undefined,
    };
    const results = await runDotNativeHostPreflight({
      chapter,
      receipt,
      participantId: 'leo',
      deviceId: 'device_leo',
      signerAdapter: {
        kind: 'fake_product_account_host',
        getSigner: async (participantId) => ({
          participantId,
          signerAddress: '5FakeProductAccountHost',
          signatureScheme: 'polkadot-raw',
          signerSource: 'product_account_host',
          signRaw: async () => new Uint8Array([1, 2, 3]),
        }),
      },
      transportAdapter,
      receiptAdapter: fakeCloudStorageReceiptAdapter(receipt),
      closeoutProofAdapter: {
        kind: 'fake_closeout_anchor_host',
        anchorReceipt: async () => ({
          receiptHash: '0xreceipt',
          anchorHash: '0xanchor',
          storage: 'product_sdk_tx_anchor',
          txHash: '0xanchor-tx',
          lifecycle: 'finalized',
        }),
      },
      assetHubEvidenceAdapter: {
        kind: 'fake_asset_hub_host',
        evidenceForClaim: async (input) => ({
          subjectId: input.subjectId,
          txHash: '0xasset-hub-tx',
          lifecycle: 'finalized',
          amount: input.amount,
          currency: input.currency,
        }),
      },
    });

    expect(results.find((result) => result.id === 'transport')?.status).toBe('fail');
    expect(results.find((result) => result.id === 'transport')?.detail).toMatch(/load did not return the preflight probe/i);
    expect(results.filter((result) => result.id !== 'transport').every((result) => result.status === 'pass')).toBe(true);
  });

  it('fails Statement Store preflight when loaded events cannot replay deterministically', async () => {
    const chapter = savingsChapter();
    const receipt = exportDotReceipt(chapter, { redaction: 'redacted' });
    let storedEvents: DotSessionEvent[] = [];
    const transportAdapter: DotSessionTransportAdapter = {
      kind: 'fake_statement_store_host_corrupt_replay',
      loadEvents: async () => [...storedEvents, ...storedEvents],
      appendEvent: async (targetChapter, signer, deviceId, action) => {
        const event = await createDotSessionEventAsync({
          chapterId: targetChapter.id,
          participantId: signer.participantId,
          deviceId,
          action,
          previousEventHash: DOT_SESSION_GENESIS_HASH,
          signer,
        });
        storedEvents = [event];
        return storedEvents;
      },
      subscribe: () => () => undefined,
    };
    const results = await runDotNativeHostPreflight({
      chapter,
      receipt,
      participantId: 'leo',
      deviceId: 'device_leo',
      signerAdapter: {
        kind: 'fake_product_account_host',
        getSigner: async (participantId) => ({
          participantId,
          signerAddress: '5FakeProductAccountHost',
          signatureScheme: 'polkadot-raw',
          signerSource: 'product_account_host',
          signRaw: async () => new Uint8Array([1, 2, 3]),
        }),
      },
      transportAdapter,
      receiptAdapter: fakeCloudStorageReceiptAdapter(receipt),
      closeoutProofAdapter: {
        kind: 'fake_closeout_anchor_host',
        anchorReceipt: async () => ({
          receiptHash: '0xreceipt',
          anchorHash: '0xanchor',
          storage: 'product_sdk_tx_anchor',
          txHash: '0xanchor-tx',
          lifecycle: 'finalized',
        }),
      },
      assetHubEvidenceAdapter: {
        kind: 'fake_asset_hub_host',
        evidenceForClaim: async (input) => ({
          subjectId: input.subjectId,
          txHash: '0xasset-hub-tx',
          lifecycle: 'finalized',
          amount: input.amount,
          currency: input.currency,
        }),
      },
    });

    expect(results.find((result) => result.id === 'transport')?.status).toBe('fail');
    expect(results.find((result) => result.id === 'transport')?.detail).toMatch(/duplicate session event/i);
    expect(results.filter((result) => result.id !== 'transport').every((result) => result.status === 'pass')).toBe(true);
  });

  it('fails archive preflight when the saved receipt cannot be retrieved', async () => {
    const chapter = savingsChapter();
    const receipt = exportDotReceipt(chapter, { redaction: 'redacted' });
    const results = await runDotNativeHostPreflight({
      chapter,
      receipt,
      participantId: 'leo',
      deviceId: 'device_leo',
      signerAdapter: {
        kind: 'fake_product_account_host',
        getSigner: async (participantId) => ({
          participantId,
          signerAddress: '5FakeProductAccountHost',
          signatureScheme: 'polkadot-raw',
          signerSource: 'product_account_host',
          signRaw: async () => new Uint8Array([1, 2, 3]),
        }),
      },
      transportAdapter: fakeStatementStoreHostAdapter(),
      receiptAdapter: new ProductSdkCloudStorageReceiptAdapter({
        shouldAttemptCloudStorage: () => true,
        requireCloudStorage: true,
        storeReceipt: async () => ({ cid: 'bafy-chopdot-receipt' }),
        retrieveReceipt: async () => {
          throw new Error('host archive retrieval unavailable');
        },
      }),
      closeoutProofAdapter: {
        kind: 'fake_closeout_anchor_host',
        anchorReceipt: async () => ({
          receiptHash: '0xreceipt',
          anchorHash: '0xanchor',
          storage: 'product_sdk_tx_anchor',
          txHash: '0xanchor-tx',
          lifecycle: 'finalized',
        }),
      },
      assetHubEvidenceAdapter: {
        kind: 'fake_asset_hub_host',
        evidenceForClaim: async (input) => ({
          subjectId: input.subjectId,
          txHash: '0xasset-hub-tx',
          lifecycle: 'finalized',
          amount: input.amount,
          currency: input.currency,
        }),
      },
    });

    expect(results.find((result) => result.id === 'archive')?.status).toBe('fail');
    expect(results.find((result) => result.id === 'archive')?.detail).toMatch(/retrieval unavailable/i);
    expect(results.filter((result) => result.id !== 'archive').every((result) => result.status === 'pass')).toBe(true);
  });

  it('fails archive preflight when the retrieved receipt hash differs', async () => {
    const chapter = savingsChapter();
    const receipt = exportDotReceipt(chapter, { redaction: 'redacted' });
    const results = await runDotNativeHostPreflight({
      chapter,
      receipt,
      participantId: 'leo',
      deviceId: 'device_leo',
      signerAdapter: {
        kind: 'fake_product_account_host',
        getSigner: async (participantId) => ({
          participantId,
          signerAddress: '5FakeProductAccountHost',
          signatureScheme: 'polkadot-raw',
          signerSource: 'product_account_host',
          signRaw: async () => new Uint8Array([1, 2, 3]),
        }),
      },
      transportAdapter: fakeStatementStoreHostAdapter(),
      receiptAdapter: fakeCloudStorageReceiptAdapter(receipt, {
        ...receipt,
        chapterName: 'Different receipt',
      }),
      closeoutProofAdapter: {
        kind: 'fake_closeout_anchor_host',
        anchorReceipt: async () => ({
          receiptHash: '0xreceipt',
          anchorHash: '0xanchor',
          storage: 'product_sdk_tx_anchor',
          txHash: '0xanchor-tx',
          lifecycle: 'finalized',
        }),
      },
      assetHubEvidenceAdapter: {
        kind: 'fake_asset_hub_host',
        evidenceForClaim: async (input) => ({
          subjectId: input.subjectId,
          txHash: '0xasset-hub-tx',
          lifecycle: 'finalized',
          amount: input.amount,
          currency: input.currency,
        }),
      },
    });

    expect(results.find((result) => result.id === 'archive')?.status).toBe('fail');
    expect(results.find((result) => result.id === 'archive')?.detail).toMatch(/hash mismatch/i);
    expect(results.filter((result) => result.id !== 'archive').every((result) => result.status === 'pass')).toBe(true);
  });

  it('fails payout evidence preflight when Asset Hub evidence is not finalized', async () => {
    const chapter = savingsChapter();
    const receipt = exportDotReceipt(chapter, { redaction: 'redacted' });
    const results = await runDotNativeHostPreflight({
      chapter,
      receipt,
      participantId: 'leo',
      deviceId: 'device_leo',
      signerAdapter: {
        kind: 'fake_product_account_host',
        getSigner: async (participantId) => ({
          participantId,
          signerAddress: '5FakeProductAccountHost',
          signatureScheme: 'polkadot-raw',
          signerSource: 'product_account_host',
          signRaw: async () => new Uint8Array([1, 2, 3]),
        }),
      },
      transportAdapter: fakeStatementStoreHostAdapter(),
      receiptAdapter: fakeCloudStorageReceiptAdapter(receipt),
      closeoutProofAdapter: {
        kind: 'fake_closeout_anchor_host',
        anchorReceipt: async () => ({
          receiptHash: '0xreceipt',
          anchorHash: '0xanchor',
          storage: 'product_sdk_tx_anchor',
          txHash: '0xanchor-tx',
          lifecycle: 'finalized',
        }),
      },
      assetHubEvidenceAdapter: fakeAssetHubEvidenceAdapter(() => ({ lifecycle: 'in_block' })),
    });

    expect(results.find((result) => result.id === 'payout_evidence')?.status).toBe('fail');
    expect(results.find((result) => result.id === 'payout_evidence')?.detail).toMatch(/finalized/i);
    expect(results.filter((result) => result.id !== 'payout_evidence').every((result) => result.status === 'pass')).toBe(true);
  });

  it('fails payout evidence preflight when Asset Hub evidence points at the wrong claim', async () => {
    const chapter = savingsChapter();
    const receipt = exportDotReceipt(chapter, { redaction: 'redacted' });
    const results = await runDotNativeHostPreflight({
      chapter,
      receipt,
      participantId: 'leo',
      deviceId: 'device_leo',
      signerAdapter: {
        kind: 'fake_product_account_host',
        getSigner: async (participantId) => ({
          participantId,
          signerAddress: '5FakeProductAccountHost',
          signatureScheme: 'polkadot-raw',
          signerSource: 'product_account_host',
          signRaw: async () => new Uint8Array([1, 2, 3]),
        }),
      },
      transportAdapter: fakeStatementStoreHostAdapter(),
      receiptAdapter: fakeCloudStorageReceiptAdapter(receipt),
      closeoutProofAdapter: {
        kind: 'fake_closeout_anchor_host',
        anchorReceipt: async () => ({
          receiptHash: '0xreceipt',
          anchorHash: '0xanchor',
          storage: 'product_sdk_tx_anchor',
          txHash: '0xanchor-tx',
          lifecycle: 'finalized',
        }),
      },
      assetHubEvidenceAdapter: fakeAssetHubEvidenceAdapter(() => ({ subjectId: 'wrong-obligation' })),
    });

    expect(results.find((result) => result.id === 'payout_evidence')?.status).toBe('fail');
    expect(results.find((result) => result.id === 'payout_evidence')?.detail).toMatch(/subject/i);
    expect(results.filter((result) => result.id !== 'payout_evidence').every((result) => result.status === 'pass')).toBe(true);
  });

  it('fails payout evidence preflight when Asset Hub evidence amount or currency differs', async () => {
    const chapter = savingsChapter();
    const receipt = exportDotReceipt(chapter, { redaction: 'redacted' });
    const results = await runDotNativeHostPreflight({
      chapter,
      receipt,
      participantId: 'leo',
      deviceId: 'device_leo',
      signerAdapter: {
        kind: 'fake_product_account_host',
        getSigner: async (participantId) => ({
          participantId,
          signerAddress: '5FakeProductAccountHost',
          signatureScheme: 'polkadot-raw',
          signerSource: 'product_account_host',
          signRaw: async () => new Uint8Array([1, 2, 3]),
        }),
      },
      transportAdapter: fakeStatementStoreHostAdapter(),
      receiptAdapter: fakeCloudStorageReceiptAdapter(receipt),
      closeoutProofAdapter: {
        kind: 'fake_closeout_anchor_host',
        anchorReceipt: async () => ({
          receiptHash: '0xreceipt',
          anchorHash: '0xanchor',
          storage: 'product_sdk_tx_anchor',
          txHash: '0xanchor-tx',
          lifecycle: 'finalized',
        }),
      },
      assetHubEvidenceAdapter: fakeAssetHubEvidenceAdapter((input) => ({ amount: input.amount + 1 })),
    });

    expect(results.find((result) => result.id === 'payout_evidence')?.status).toBe('fail');
    expect(results.find((result) => result.id === 'payout_evidence')?.detail).toMatch(/amount or currency/i);
    expect(results.filter((result) => result.id !== 'payout_evidence').every((result) => result.status === 'pass')).toBe(true);
  });

  it('keeps standalone Asset Hub evidence from confirming receipt or changing closeout readiness', () => {
    const chapter = savingsChapter();
    const event = signedEvent([], 'leo', {
      type: 'asset_hub_reference',
      reference: {
        subjectId: 'obligation_1',
        txHash: '0xasset-hub-evidence-only',
        lifecycle: 'finalized',
        amount: 100,
        currency: 'TEST_USD',
      },
    });

    const result = reduceDotSessionEvents(chapter, [event]);

    expect(result.assetHubReferences).toHaveLength(1);
    expect(result.chapter.obligations[0]?.state).toBe('open');
    expect(result.chapter.confirmations).toHaveLength(0);
    expect(buildDotStatus(result.chapter).closeoutReadiness).toBe(buildDotStatus(chapter).closeoutReadiness);
  });

  it('fails Product Account host preflight when the signer is not covered by a participant membership grant', async () => {
    const chapter = savingsChapter();
    const receipt = exportDotReceipt(chapter, { redaction: 'redacted' });
    const results = await runDotNativeHostPreflight({
      chapter,
      receipt,
      participantId: 'leo',
      deviceId: 'device_leo',
      membershipGrants: await createDemoDotMembershipGrants(chapter),
      requireMembershipGrant: true,
      signerAdapter: {
        kind: 'fake_product_account_host',
        getSigner: async (participantId) => ({
          participantId,
          signerAddress: '5HostAddressNotInLeoGrant',
          signatureScheme: 'polkadot-raw',
          signerSource: 'product_account_host',
          signRaw: async () => new Uint8Array([1, 2, 3]),
        }),
      },
      transportAdapter: fakeStatementStoreHostAdapter(),
      receiptAdapter: fakeCloudStorageReceiptAdapter(receipt),
      closeoutProofAdapter: {
        kind: 'fake_closeout_anchor_host',
        anchorReceipt: async () => ({
          receiptHash: '0xreceipt',
          anchorHash: '0xanchor',
          storage: 'product_sdk_tx_anchor',
          txHash: '0xanchor-tx',
          lifecycle: 'finalized',
        }),
      },
      assetHubEvidenceAdapter: {
        kind: 'fake_asset_hub_host',
        evidenceForClaim: async (input) => ({
          subjectId: input.subjectId,
          txHash: '0xasset-hub-tx',
          lifecycle: 'finalized',
          amount: input.amount,
          currency: input.currency,
        }),
      },
    });

    expect(results.find((result) => result.id === 'identity')?.status).toBe('fail');
    expect(results.find((result) => result.id === 'identity')?.detail).toMatch(/no membership grant/i);
    expect(results.filter((result) => result.id !== 'identity').every((result) => result.status === 'pass')).toBe(true);
  });

  it('fails Product Account host preflight when multiple participants resolve to one host signer', async () => {
    const chapter = savingsChapter();
    const receipt = exportDotReceipt(chapter, { redaction: 'redacted' });
    const sharedHostAddress = '5SharedHostAddressForEveryone';
    const membershipGrants = await Promise.all(
      ['leo', 'mina'].map((participantId) => {
        const participant = chapter.participants.find((item) => item.id === participantId);
        if (!participant) throw new Error(`Missing participant ${participantId}`);
        return createDotMembershipGrant({
          chapterId: chapter.id,
          participantId,
          signerAddress: sharedHostAddress,
          roles: participant.roles,
          issuedByParticipantId: 'mina',
          issuerSigner: getDemoDotSessionSigner('mina'),
          issuedAt: '2026-06-09T12:00:00.000Z',
        });
      }),
    );
    const results = await runDotNativeHostPreflight({
      chapter,
      receipt,
      participantId: 'leo',
      identityParticipantIds: ['leo', 'mina'],
      deviceId: 'device_leo',
      membershipGrants,
      requireMembershipGrant: true,
      requireDistinctParticipantSigners: true,
      now: '2026-06-09T12:01:00.000Z',
      signerAdapter: {
        kind: 'fake_product_account_host',
        getSigner: async (participantId) => ({
          participantId,
          signerAddress: sharedHostAddress,
          signatureScheme: 'polkadot-raw',
          signerSource: 'product_account_host',
          signRaw: async () => new Uint8Array([1, 2, 3]),
        }),
      },
      transportAdapter: fakeStatementStoreHostAdapter(),
      receiptAdapter: fakeCloudStorageReceiptAdapter(receipt),
      closeoutProofAdapter: {
        kind: 'fake_closeout_anchor_host',
        anchorReceipt: async () => ({
          receiptHash: '0xreceipt',
          anchorHash: '0xanchor',
          storage: 'product_sdk_tx_anchor',
          txHash: '0xanchor-tx',
          lifecycle: 'finalized',
        }),
      },
      assetHubEvidenceAdapter: {
        kind: 'fake_asset_hub_host',
        evidenceForClaim: async (input) => ({
          subjectId: input.subjectId,
          txHash: '0xasset-hub-tx',
          lifecycle: 'finalized',
          amount: input.amount,
          currency: input.currency,
        }),
      },
    });

    expect(results.find((result) => result.id === 'identity')?.status).toBe('fail');
    expect(results.find((result) => result.id === 'identity')?.detail).toMatch(/same address for multiple participants/i);
    expect(results.filter((result) => result.id !== 'identity').every((result) => result.status === 'pass')).toBe(true);
  });

  it('passes Product Account host preflight when the participant grant matches the host signer address', async () => {
    const chapter = savingsChapter();
    const receipt = exportDotReceipt(chapter, { redaction: 'redacted' });
    const hostSignerAddresses: Record<string, string> = {
      leo: '5HostAddressInLeoGrant',
      mina: '5HostAddressInMinaGrant',
    };
    const membershipGrants = await Promise.all(
      Object.entries(hostSignerAddresses).map(([participantId, signerAddress]) => {
        const participant = chapter.participants.find((item) => item.id === participantId);
        if (!participant) throw new Error(`Missing participant ${participantId}`);
        return createDotMembershipGrant({
          chapterId: chapter.id,
          participantId,
          signerAddress,
          roles: participant.roles,
          issuedByParticipantId: 'mina',
          issuerSigner: getDemoDotSessionSigner('mina'),
          issuedAt: '2026-06-09T12:00:00.000Z',
        });
      }),
    );
    const results = await runDotNativeHostPreflight({
      chapter,
      receipt,
      participantId: 'leo',
      identityParticipantIds: ['leo', 'mina'],
      deviceId: 'device_leo',
      membershipGrants,
      requireMembershipGrant: true,
      requireDistinctParticipantSigners: true,
      now: '2026-06-09T12:01:00.000Z',
      signerAdapter: {
        kind: 'fake_product_account_host',
        getSigner: async (participantId) => ({
          participantId,
          signerAddress: hostSignerAddresses[participantId] ?? `5HostAddressFor${participantId}`,
          signatureScheme: 'polkadot-raw',
          signerSource: 'product_account_host',
          signRaw: async () => new Uint8Array([1, 2, 3]),
        }),
      },
      transportAdapter: fakeStatementStoreHostAdapter(),
      receiptAdapter: fakeCloudStorageReceiptAdapter(receipt),
      closeoutProofAdapter: {
        kind: 'fake_closeout_anchor_host',
        anchorReceipt: async () => ({
          receiptHash: '0xreceipt',
          anchorHash: '0xanchor',
          storage: 'product_sdk_tx_anchor',
          txHash: '0xanchor-tx',
          lifecycle: 'finalized',
        }),
      },
      assetHubEvidenceAdapter: {
        kind: 'fake_asset_hub_host',
        evidenceForClaim: async (input) => ({
          subjectId: input.subjectId,
          txHash: '0xasset-hub-tx',
          lifecycle: 'finalized',
          amount: input.amount,
          currency: input.currency,
        }),
      },
    });

    expect(results.find((result) => result.id === 'identity')?.status).toBe('pass');
    expect(results.every((result) => result.status === 'pass')).toBe(true);
  });
});
