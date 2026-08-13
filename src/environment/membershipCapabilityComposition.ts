import type {KeyValueStorage} from './livePayerSync.ts';
import {PolkadotHostBridge} from './polkadotHostBridge.ts';
import {AccountBoundProtectedGroupKeySink} from './accountBoundProtectedGroupKeySink.ts';
import {IndexedDbPendingAcceptanceVault} from './indexedDbPendingAcceptanceVault.ts';
import {
  createHostChatInvitationTransport,
  type ChatInvitationTransport,
} from '../membership/chatInvitationTransport.ts';
import {
  MembershipBootstrapEntryService,
  type VerifiedOrganizerAuthorityResolver,
} from '../membership/membershipBootstrapEntryService.ts';
import type {PendingAcceptanceVault} from '../membership/trustedContactInvitationCoordinator.ts';

export type MembershipCompositionBlocker =
  | 'host_identity_unavailable'
  | 'product_account_signing_unavailable'
  | 'chat_unavailable'
  | 'trusted_organizer_resolver_unavailable'
  | 'durable_pending_key_vault_unavailable';

export type MembershipCapabilityComposition =
  | {
      status: 'ready';
      service: MembershipBootstrapEntryService;
      transport: ChatInvitationTransport;
      subscribeToState(listener: () => void): () => void;
      close(): void;
    }
  | {status: 'blocked'; blockers: MembershipCompositionBlocker[]};

/**
 * Production-neutral composition. Every authority-bearing dependency is an
 * explicit provider input. URL, query, room, peer and storage values cannot
 * supply identity or organizer authority.
 */
export async function composeHostMembershipCapabilities(input: {
  bridge?: PolkadotHostBridge;
  storage: KeyValueStorage;
  organizerAuthority?: VerifiedOrganizerAuthorityResolver;
  pendingAcceptances?: PendingAcceptanceVault;
  chatFactory?: () => Promise<ChatInvitationTransport | null>;
}): Promise<MembershipCapabilityComposition> {
  const blockers: MembershipCompositionBlocker[] = [];
  if (!input.organizerAuthority) blockers.push('trusted_organizer_resolver_unavailable');
  const pendingAcceptances = input.pendingAcceptances
    ?? (typeof indexedDB === 'undefined' ? null : new IndexedDbPendingAcceptanceVault());
  if (!pendingAcceptances) blockers.push('durable_pending_key_vault_unavailable');
  const bridge = input.bridge ?? new PolkadotHostBridge();
  let identity: Awaited<ReturnType<PolkadotHostBridge['requestIdentity']>> | null = null;
  try { identity = await bridge.requestIdentity(); } catch { blockers.push('host_identity_unavailable'); }
  if (identity && !identity.signBytes) blockers.push('product_account_signing_unavailable');
  const transport = await (input.chatFactory ?? createHostChatInvitationTransport)().catch(() => null);
  if (!transport) blockers.push('chat_unavailable');
  if (blockers.length > 0 || !identity?.signBytes || !transport || !input.organizerAuthority || !pendingAcceptances) {
    return {status: 'blocked', blockers: [...new Set(blockers)]};
  }

  const accountPublicKeyHex = bytesToHex(identity.publicKey);
  const service = new MembershipBootstrapEntryService({
    actor: {participantId: identity.username, accountPublicKeyHex, signer: {signBytes: identity.signBytes}},
    storage: input.storage,
    organizerAuthority: input.organizerAuthority,
    delivery: transport,
    pendingAcceptances,
    protectedKeys: new AccountBoundProtectedGroupKeySink({
      productId: identity.productId,
      storage: input.storage,
      entropy: bridge,
    }),
  });
  const stateListeners = new Set<() => void>();
  const subscription = transport.subscribe(event => {
    void service.receive(event).then(() => {
      stateListeners.forEach(listener => listener());
    });
  });
  return {
    status: 'ready',
    service,
    transport,
    subscribeToState(listener) {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
    close() {
      subscription.unsubscribe();
      stateListeners.clear();
    },
  };
}

function bytesToHex(value: Uint8Array): string {
  return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
