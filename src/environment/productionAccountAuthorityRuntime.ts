import type {
  AcceptedMembershipGrantResolver,
  AuthorityGroupAccessProvisioner,
  AuthorityIdentity,
  MembershipAuthorityCommandV1,
  MembershipAuthorityMutationResolver,
} from '../core/authority/productionAuthority.ts';
import type {CanonicalEventV1, CanonicalGroupStateV1} from '../core/moneyEventKernel.ts';
import type {MembershipGrant} from '../membership/membershipLifecycle.ts';

/** Stable indirection objects keep one ProductionAuthority instance while the
 * user explicitly attaches or changes account-owned capabilities. */
export class ProductionAccountAuthorityRuntime implements
  AcceptedMembershipGrantResolver,
  MembershipAuthorityMutationResolver,
  AuthorityGroupAccessProvisioner {
  private identity: AuthorityIdentity | null = null;
  private memberships: Array<AcceptedMembershipGrantResolver & MembershipAuthorityMutationResolver> = [];
  private groupAccess: AuthorityGroupAccessProvisioner | null = null;
  private delivery: {publish(event: CanonicalEventV1, state: CanonicalGroupStateV1): Promise<void>} | null = null;
  private membershipJoinDelivery: ((events: CanonicalEventV1[], state: CanonicalGroupStateV1, recipientId: string) => Promise<void>) | null = null;
  private membershipRemovalDelivery: ((events: CanonicalEventV1[], participantId: string) => Promise<void>) | null = null;

  attachIdentity(value: AuthorityIdentity): void {
    if (!value.participantId.trim() || !/^0x[0-9a-f]{64}$/iu.test(value.publicKeyHex)) throw new Error('Product Account identity is invalid.');
    this.identity = {...value, participantId: value.participantId.trim(), publicKeyHex: value.publicKeyHex.toLowerCase()};
  }

  attachMembershipAuthority(value: AcceptedMembershipGrantResolver & MembershipAuthorityMutationResolver): void {
    if (!this.memberships.includes(value)) this.memberships.push(value);
  }

  attachGroupAccess(value: AuthorityGroupAccessProvisioner): void {
    this.groupAccess = value;
  }

  attachDelivery(value: {
    publish(event: CanonicalEventV1, state: CanonicalGroupStateV1): Promise<void>;
    publishMembershipJoin?(events: CanonicalEventV1[], state: CanonicalGroupStateV1, recipientId: string): Promise<void>;
    publishMembershipRemoval?(events: CanonicalEventV1[], participantId: string): Promise<void>;
  }): void {
    this.delivery = value;
    this.membershipJoinDelivery = value.publishMembershipJoin?.bind(value) ?? null;
    this.membershipRemovalDelivery = value.publishMembershipRemoval?.bind(value) ?? null;
  }

  detachAccount(): void {
    this.identity = null;
    this.memberships = [];
    this.groupAccess = null;
    this.delivery = null;
    this.membershipJoinDelivery = null;
    this.membershipRemovalDelivery = null;
  }

  async resolveExternalIdentity(participantId: string): Promise<AuthorityIdentity | null> {
    return this.identity?.participantId === participantId.trim() ? this.identity : null;
  }

  async resolve(groupId: string, participantId: string): Promise<MembershipGrant | null> {
    for (const resolver of this.memberships) {
      const grant = await resolver.resolve(groupId, participantId);
      if (grant) return grant;
    }
    return null;
  }

  async authorize(command: MembershipAuthorityCommandV1, actorId: string, currentState?: CanonicalGroupStateV1): Promise<boolean> {
    for (const authority of this.memberships) {
      if (await authority.authorize(command, actorId, currentState ? structuredClone(currentState) : undefined)) return true;
    }
    return false;
  }

  async provision(input: Parameters<AuthorityGroupAccessProvisioner['provision']>[0]) {
    if (!this.groupAccess) throw new Error('Use your Product Account before creating a shared group.');
    return this.groupAccess.provision(input);
  }

  async publish(event: CanonicalEventV1, state: CanonicalGroupStateV1): Promise<void> {
    if (!this.delivery) {
      const recipients = Object.values(state.members).filter(member => member.active !== false && member.participantId !== event.actorId);
      if (recipients.length > 0) throw new Error('Choose a conversation for this group before sharing updates.');
      return;
    }
    await this.delivery.publish(event, state);
  }

  async publishMembershipJoin(events: CanonicalEventV1[], state: CanonicalGroupStateV1, recipientId: string): Promise<void> {
    if (!this.membershipJoinDelivery) throw new Error('New-member history delivery is unavailable.');
    await this.membershipJoinDelivery(events, state, recipientId);
  }

  async publishMembershipRemoval(events: CanonicalEventV1[], participantId: string): Promise<void> {
    if (!this.membershipRemovalDelivery) throw new Error('Safe member-removal delivery is unavailable.');
    await this.membershipRemovalDelivery(events, participantId);
  }
}
