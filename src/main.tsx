import {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App, {type AppDependencies} from './App.tsx';
import './index.css';
import { loadTelegramWebAppScript } from './telegramBootstrap.ts';
import {bootstrapPolkadotHostDeveloperChecks} from './environment/bootstrapPolkadotHost.ts';
import {appStorage} from './environment/index.ts';
import {composeHostMembershipCapabilities, type MembershipCapabilityComposition} from './environment/membershipCapabilityComposition.ts';
import {membershipKey} from './membership/membershipLifecycle.ts';
import {PolkadotHostBridge} from './environment/polkadotHostBridge.ts';
import {ProductionAccountAuthorityRuntime} from './environment/productionAccountAuthorityRuntime.ts';
import {DurableMembershipKeyEnvelopeRegistry} from './membership/membershipKeyEnvelopeRegistry.ts';
import {MembershipRegistryGroupAccessProvisioner} from './core/authority/groupAccessProvisioner.ts';
import {createHostCanonicalEventChatTransport} from './environment/canonicalEventChatTransport.ts';
import {CanonicalEventDeliveryService} from './environment/canonicalEventDeliveryService.ts';
import type {CanonicalGroupStateV1} from './core/moneyEventKernel.ts';
import type {CanonicalAuthorityEventEnvelopeV1} from './core/authority/productionAuthority.ts';
import {ProductionRecoveryCoordinator} from './recovery/productionRecoveryCoordinator.ts';
import {getHostLocalStorage} from '@parity/product-sdk-host';
import {HostLocalStorageJsonStorage, VerifiedContactRepository} from './contacts/verifiedContactRepository.ts';
import {createHostChatInvitationTransport} from './membership/chatInvitationTransport.ts';
import {IndexedDbPendingAcceptanceVault} from './environment/indexedDbPendingAcceptanceVault.ts';
import {ProductionMembershipOrganizerCoordinator} from './membership/productionMembershipOrganizerCoordinator.ts';
import {verifyParticipantSignature} from './core/authority/browserAuthority.ts';
import type {MembershipAuthorityCommandV1} from './core/authority/productionAuthority.ts';
import {createHostMembershipRemovalChatTransport} from './membership/membershipRemovalChatTransport.ts';
import {MembershipRemovalCoordinator} from './membership/membershipRemovalCoordinator.ts';

loadTelegramWebAppScript();
void bootstrapPolkadotHostDeveloperChecks();

const accountBridge = new PolkadotHostBridge();
const accountAuthority = new ProductionAccountAuthorityRuntime();
let accountDeliverySubscription: {unsubscribe(): void} | null = null;
let accountMembershipSubscription: {unsubscribe(): void} | null = null;
let accountRemovalSubscription: {unsubscribe(): void} | null = null;
let activeAccountCanonicalDelivery: CanonicalEventDeliveryService | null = null;
const productAccount = {
  async request(authority: {
    readCanonicalGroup(groupId: string): Promise<CanonicalGroupStateV1 | null>;
    readAcceptedEvents(groupId: string): Promise<import('./core/moneyEventKernel.ts').CanonicalEventV1[]>;
    readGroupOrigin(groupId: string): Promise<import('./core/moneyEventKernel.ts').CanonicalEventV1 | null>;
    runMembershipAuthority(command: MembershipAuthorityCommandV1): Promise<CanonicalGroupStateV1 | null>;
    acceptCanonicalEvent(envelope: CanonicalAuthorityEventEnvelopeV1): Promise<void>;
    importRecoveredEvents(events: import('./core/moneyEventKernel.ts').CanonicalEventV1[]): Promise<'applied' | 'duplicate'>;
  }) {
    const identity = await accountBridge.requestIdentity();
    if (!identity.signBytes) throw new Error('Product Account signing is unavailable.');
    const accountPublicKeyHex = bytesToHex(identity.publicKey);
    const keyEnvelopes = new DurableMembershipKeyEnvelopeRegistry({
      productId: identity.productId,
      participantId: identity.username,
      accountPublicKeyHex,
      storage: appStorage,
      entropy: accountBridge,
    });
    accountAuthority.attachIdentity({
      participantId: identity.username,
      publicKeyHex: accountPublicKeyHex,
      signer: {sign: bytes => identity.signBytes!(bytes)},
    });
    accountAuthority.attachGroupAccess(new MembershipRegistryGroupAccessProvisioner(keyEnvelopes));
    let canonicalDelivery: CanonicalEventDeliveryService | null = null;
    const transport = await createHostCanonicalEventChatTransport().catch(() => null);
    if (transport) {
      const delivery = new CanonicalEventDeliveryService({
        participantId: identity.username,
        accountPublicKeyHex,
        signer: {signBytes: identity.signBytes},
        storage: appStorage,
        keyEnvelopes,
        authority: {
          readCanonicalGroup: authority.readCanonicalGroup,
          accept: authority.acceptCanonicalEvent,
          importHistory: async events => { await authority.importRecoveredEvents(events); },
        },
        transport,
      });
      accountAuthority.attachDelivery({
        async publish(event, state) {
          await delivery.queueAcceptedEvent(event, state);
          await delivery.flush();
        },
        async publishMembershipJoin(events, state, recipientId) {
          await delivery.queueHistoryForRecipient({events, state, recipientId});
          await delivery.flush();
        },
        async publishMembershipRemoval(events, participantId) {
          await delivery.queueMembershipRemoval({events, participantId});
          await delivery.flush();
        },
      });
      canonicalDelivery = delivery;
      activeAccountCanonicalDelivery = delivery;
      accountDeliverySubscription?.unsubscribe();
      accountDeliverySubscription = transport.subscribe(input => {
        if (input.message.kind === 'acknowledgement') {
          void delivery.receiveAcknowledgement(input.roomId, input.message.acknowledgement);
          return;
        }
        void delivery.receiveEnvelope({roomId: input.roomId, envelope: input.message.envelope})
          .then(result => transport.sendAcknowledgement(input.roomId, result.ack))
          .catch(() => undefined);
      });
    }
    const recovery = new ProductionRecoveryCoordinator({
      productId: identity.productId,
      identity,
      bridge: accountBridge,
      authority: {readCanonicalGroup: authority.readCanonicalGroup, readAcceptedEvents: authority.readAcceptedEvents},
      keyEnvelopes,
    });
    const [membershipTransport, removalTransport, hostStorage] = await Promise.all([
      createHostChatInvitationTransport().catch(() => null),
      createHostMembershipRemovalChatTransport().catch(() => null),
      getHostLocalStorage().catch(() => null),
    ]);
    const removalCoordinator = removalTransport && canonicalDelivery ? new MembershipRemovalCoordinator({
      actor: {participantId: identity.username, accountPublicKeyHex, signer: {signBytes: identity.signBytes}},
      storage: appStorage,
      keyEnvelopes,
      pendingAcceptances: new IndexedDbPendingAcceptanceVault(),
      authority: {readCanonicalGroup: authority.readCanonicalGroup},
      roomForGroup: groupId => canonicalDelivery!.bindingForGroup(groupId)?.roomId ?? null,
      delivery: removalTransport,
    }) : null;
    if (removalCoordinator && removalTransport) {
      accountAuthority.attachMembershipAuthority({
        resolve: async () => null,
        authorize: (command, actorId, currentState) => removalCoordinator.authorize(command, actorId, currentState),
      });
      accountRemovalSubscription?.unsubscribe();
      accountRemovalSubscription = removalTransport.subscribe(input => {
        void removalCoordinator.receive(input.roomId, input.message).catch(() => undefined);
      });
    }
    const contacts = hostStorage ? new VerifiedContactRepository(new HostLocalStorageJsonStorage(hostStorage)) : null;
    let latestRooms: Array<{roomId: string; participatingAs: string}> = [];
    let roomSubscription: {unsubscribe(): void} | null = null;
    if (membershipTransport?.subscribeRooms) {
      roomSubscription = membershipTransport.subscribeRooms(rooms => { latestRooms = rooms; });
    }
    return {
      participantId: identity.username,
      displayName: identity.username,
      accountPublicKeyHex,
      recovery: {
        async protect(groupId: string) { await recovery.publish(groupId); },
        async recover(groupId: string) {
          const recovered = await recovery.recover(groupId);
          return authority.importRecoveredEvents(recovered.events);
        },
      },
      organizer: {
        async listContacts() {
          if (!contacts) return [];
          return (await contacts.list(accountPublicKeyHex)).map(record => ({
            id: record.recordId,
            label: record.remoteParticipantId,
          }));
        },
        async listRooms() {
          if (!membershipTransport?.subscribeRooms) return [];
          if (latestRooms.length === 0) await new Promise(resolve => window.setTimeout(resolve, 250));
          return latestRooms.map(room => ({id: room.roomId, label: `Conversation ${room.roomId.slice(-8)}`}));
        },
        async prepare(input: {groupId: string; contactRecordId: string; roomId: string}) {
          if (!contacts || !membershipTransport) throw new Error('Invitations are unavailable in this host.');
          const state = await authority.readCanonicalGroup(input.groupId);
          const organizer = state?.members[identity.username];
          if (!state || !organizer || organizer.active === false || organizer.role !== 'organizer'
            || state.organizerId !== identity.username || !organizer.acceptedAt || !organizer.invitationId
            || !organizer.keyVersion || !organizer.groupKeyEnvelopeId) {
            throw new Error('Only the accepted organizer of this group can invite a member.');
          }
          if (!canonicalDelivery) throw new Error('Encrypted group delivery is unavailable.');
          await canonicalDelivery.bindGroupToRoom({groupId: input.groupId, roomId: input.roomId});
          const coordinator = new ProductionMembershipOrganizerCoordinator({
            actor: {participantId: identity.username, accountPublicKeyHex, signer: {signBytes: identity.signBytes!}},
            organizerRoots: [{
              groupId: input.groupId,
              participantId: identity.username,
              accountPublicKeyHex,
              role: 'organizer',
              acceptedAt: organizer.acceptedAt,
              invitationId: organizer.invitationId,
              keyVersion: organizer.keyVersion,
              groupKeyEnvelopeId: organizer.groupKeyEnvelopeId,
            }],
            storage: appStorage,
            verifiedContacts: contacts,
            groupOrigins: {readGroupOrigin: authority.readGroupOrigin},
            keyEnvelopes,
            delivery: {send: async (roomId, event) => membershipTransport.send(roomId, event)},
            pendingAcceptances: new IndexedDbPendingAcceptanceVault(),
            verifyCanonical: verifyParticipantSignature,
            baseUrl: cleanBaseUrl(window.location.href),
          });
          await coordinator.restore();
          accountAuthority.attachMembershipAuthority(coordinator);
          accountMembershipSubscription?.unsubscribe();
          accountMembershipSubscription = membershipTransport.subscribe(message => {
            if (message.message.kind === 'acknowledgement') {
              void coordinator.acknowledgeDelivery(message.message.acknowledgement).catch(() => false);
              return;
            }
            void coordinator.receive({roomId: message.roomId, peer: message.peer, event: message.message.event})
              .then(async result => {
                if (result.deliveryAcknowledgement) await membershipTransport.sendAcknowledgement(message.roomId, result.deliveryAcknowledgement);
              })
              .catch(() => undefined);
          });
          let invitationId = '';
          let canonicalHistoryDeliveryId = '';
          const adapterListeners = new Set<() => void>();
          const requestId = `invite-${crypto.randomUUID()}`;
          return {
            getStatus: () => {
              const status = coordinator.status(invitationId || undefined);
              if (canonicalHistoryDeliveryId) return canonicalDelivery.isDeliveryAcknowledged(canonicalHistoryDeliveryId) ? 'accepted' : 'pending';
              // Acknowledged key handoff makes the canonical append eligible;
              // it does not itself make the person a group member.
              return status === 'accepted' ? 'ready_to_grant' : status;
            },
            subscribe: (listener: () => void) => {
              adapterListeners.add(listener);
              const stopCoordinator = coordinator.subscribe(listener);
              const stopDelivery = canonicalDelivery.subscribe(listener);
              return () => { adapterListeners.delete(listener); stopCoordinator(); stopDelivery(); };
            },
            createInvitation: async (route: 'join_link' | 'qr') => {
              const created = await coordinator.createInvitation({...input, requestId, route});
              invitationId = created.invitationId;
              return {url: created.url};
            },
            finishAdding: async () => {
              if (!invitationId) throw new Error('Create the invitation first.');
              const finished = await coordinator.finishAdding(invitationId);
              if (!finished.command) throw new Error('Wait for this person to receive and acknowledge group access.');
              if (finished.command.type !== 'add') throw new Error('The signed member grant is invalid.');
              const command = finished.command;
              const state = await authority.runMembershipAuthority(command)
                ?? await authority.readCanonicalGroup(input.groupId);
              const member = state?.members[command.grant.participantId];
              if (!state?.currentEventId || !member || member.active === false
                || member.invitationId !== command.grant.invitationId
                || member.groupKeyEnvelopeId !== command.grant.groupKeyEnvelopeId) {
                throw new Error('The signed member grant could not be added to this group.');
              }
              canonicalHistoryDeliveryId = `history:${state.currentEventId}:recipient:${command.grant.participantId}`;
              adapterListeners.forEach(listener => listener());
              if (!canonicalDelivery.isDeliveryAcknowledged(canonicalHistoryDeliveryId)) {
                throw new Error('The person was added, but their signed history delivery is still waiting. Try again to deliver it.');
              }
            },
          };
        },
        close() { roomSubscription?.unsubscribe(); },
      },
      removal: {
        async listRemovable(groupId: string) {
          const state = await authority.readCanonicalGroup(groupId);
          if (!state || state.organizerId !== identity.username || state.members[identity.username]?.active === false
            || state.members[identity.username]?.role !== 'organizer') return [];
          return Object.values(state.members)
            .filter(member => member.active !== false && member.role !== 'organizer')
            .sort((left, right) => left.participantId.localeCompare(right.participantId))
            .map(member => ({id: member.participantId, name: member.participantId}));
        },
        async prepareRemoval(input: {groupId: string; participantId: string}) {
          if (!removalCoordinator || !canonicalDelivery) throw new Error('Safe member removal is unavailable in this host.');
          const binding = canonicalDelivery.bindingForGroup(input.groupId);
          if (!binding) throw new Error('Choose a conversation for this group before removing anyone.');
          const state = await authority.readCanonicalGroup(input.groupId);
          if (!state?.currentEventId) throw new Error('The accepted group frontier is unavailable.');
          const proposalId = await removalProposalId(input.groupId, input.participantId, state.currentEventId);
          await removalCoordinator.begin({...input, proposalId, roomId: binding.roomId});
          let removed = state.members[input.participantId]?.active === false;
          return {
            getStatus: () => removed
              ? {status: 'removed' as const, acknowledged: removalCoordinator.status(proposalId).acknowledged, required: removalCoordinator.status(proposalId).required}
              : removalCoordinator.status(proposalId),
            subscribe: (listener: () => void) => removalCoordinator.subscribe(listener),
            retry: () => removalCoordinator.retry(proposalId),
            finish: async () => {
              const command = await removalCoordinator.command(proposalId);
              if (!command) throw new Error('Wait for every remaining member to receive the next group access.');
              const result = await authority.runMembershipAuthority(command);
              if (!result) throw new Error('Removal is saved or still waiting for encrypted delivery. Try again to finish delivery.');
              removed = result.members[input.participantId]?.active === false;
              if (!removed) throw new Error('The accepted membership did not change.');
            },
          };
        },
      },
    };
  },
};

function ProductionApp() {
  const [membershipRoute, setMembershipRoute] = useState(() => window.location.hash.includes('chopdot-invite='));
  const [runtime, setRuntime] = useState<MembershipCapabilityComposition | null>(null);

  useEffect(() => {
    const followRoute = () => setMembershipRoute(window.location.hash.includes('chopdot-invite='));
    window.addEventListener('hashchange', followRoute);
    return () => window.removeEventListener('hashchange', followRoute);
  }, []);

  useEffect(() => {
    if (!membershipRoute) {
      setRuntime(null);
      return;
    }
    let active = true;
    let close: (() => void) | undefined;
    void composeHostMembershipCapabilities({storage: appStorage}).then(result => {
      if (!active) {
        if (result.status === 'ready') result.close();
        return;
      }
      if (result.status === 'ready') close = result.close;
      setRuntime(result);
    });
    return () => {
      active = false;
      close?.();
    };
  }, [membershipRoute]);

  if (membershipRoute && runtime === null) {
    return <div role="status" className="min-h-dvh bg-[#f7f6f4] px-6 py-16 text-center text-sm font-medium text-gray-600">Checking your invitation…</div>;
  }

  let dependencies: AppDependencies | undefined;
  dependencies = {
    productAccount,
    authority: {
      acceptedMemberships: accountAuthority,
      membershipChanges: accountAuthority,
      groupAccess: accountAuthority,
      resolveExternalIdentity: participantId => accountAuthority.resolveExternalIdentity(participantId),
      canonicalDelivery: accountAuthority,
    },
  };
  if (runtime?.status === 'ready') {
    const {service, subscribeToState} = runtime;
    dependencies = {
      ...dependencies,
      membershipBootstrapEntry: {
        service,
        subscribeToState,
        async onMembershipActive(input) {
          if (!activeAccountCanonicalDelivery) throw new Error('Use your Product Account before receiving group updates.');
          await activeAccountCanonicalDelivery.bindGroupToRoom({groupId: input.groupId, roomId: input.roomId});
        },
      },
      authority: {
        ...dependencies.authority,
        acceptedMemberships: {
          async resolve(groupId, participantId) {
            return service.state.lifecycle.memberships[membershipKey(groupId, participantId)]
              ?? accountAuthority.resolve(groupId, participantId);
          },
        },
      },
    };
  }
  return <App key={runtime?.status === 'ready' ? 'membership-runtime' : 'base-runtime'} dependencies={dependencies} />;
}

createRoot(document.getElementById('root')!).render(<ProductionApp />);

function bytesToHex(value: Uint8Array): string {
  return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function cleanBaseUrl(value: string): string {
  const url = new URL(value);
  url.hash = '';
  return url.toString();
}

async function removalProposalId(groupId: string, participantId: string, frontierId: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([
    'chopdot:membership-removal-proposal-id:v1', groupId, participantId, frontierId,
  ]))));
  return `removal-${Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
