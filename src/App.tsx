/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppStateProvider, useAppState } from './state/AppStateContext';
import { Welcome } from './components/Welcome';
import { GuestSetup } from './components/GuestSetup';
import { Home } from './components/Home';
import { StateProof } from './components/dev/StateProof';
import { CreateGroup } from './components/CreateGroup';
import { GroupDetail } from './components/GroupDetail';
import { CloseGroup } from './components/CloseGroup';
import { SettleUp } from './components/SettleUp';
import { CaptureSpend } from './components/CaptureSpend';
import { ReviewSplit } from './components/ReviewSplit';
import { RequestPayment } from './components/RequestPayment';
import { PayerView } from './components/PayerView';
import { SavedRecordView } from './components/SavedRecordView';
import { Profile } from './components/Profile';
import { Friends } from './components/Friends';
import { PaymentMethods } from './components/PaymentMethods';
import { History } from './components/History';
import { Settings } from './components/Settings';
import { StyleGuide } from './components/dev/StyleGuide';
import { StandalonePayerRequest } from './components/StandalonePayerRequest';
import {
  MembershipBootstrapEntry,
  type MembershipBootstrapEntryDependencies,
} from './components/membership/MembershipBootstrapEntry';
import {
  LimitedNoAppActionEntry,
  type LimitedNoAppActionEntryDependencies,
} from './components/membership/LimitedNoAppActionEntry';
import {BoundedEntryUnavailable} from './components/membership/BoundedEntryUnavailable';
import {
  MembershipOrganizerEntry,
  type MembershipOrganizerEntryAdapter,
} from './components/membership/MembershipOrganizerEntry';
import { Home as HomeIcon, Users, Settings as SettingsIcon, History as HistoryIcon, Wallet } from 'lucide-react';
import { configureHostBackButton, initializeHostEnvironment } from './environment';
import {
  parsePayerRequestRoute,
  parseStandalonePayerRequest,
  StandalonePayerRequest as StandalonePayerRequestData,
} from './requestLinks';
import { bootstrapFromUrl, type RecipientBoundBootstrap } from './membership/recipientBoundBootstrap';
import {limitedNoAppActionFromUrl} from './membership/limitedNoAppActionLink';
import type {SignedLimitedNoAppActionV1} from './membership/limitedNoAppAction';
import { AppState } from './types';
import {CaptureSource, ReceiptDraftStatus} from './capture/receiptDraft';
import {GroupRecoveryEntry, type GroupRecoveryEntryDependencies} from './components/recovery/GroupRecoveryEntry';
import {recoveryGroupFromUrl} from './recovery/recoveryLink';
import {DinnerJourneyEntry, type DinnerJourneyEntryDependencies} from './components/journey/DinnerJourneyEntry';
import {ReceiptFirstStart, type ReviewableReceiptDraft} from './components/ReceiptFirstStart';
import {ChooseGroupForDraft} from './components/ChooseGroupForDraft';
import {ModeIntro} from './components/ModeIntro';
import {NamedModeWorkspace} from './components/NamedModeWorkspace';
import type {GroupMode} from './types';
import type {AcceptedMembershipGrantResolver, CanonicalAuthorityEventEnvelopeV1} from './core/authority/productionAuthority';
import type {ProductionAuthorityDependencies} from './state/AppStateContext';
import type {CanonicalEventV1, CanonicalGroupStateV1} from './core/moneyEventKernel';
import {GroupProtectionEntry, type ProductAccountRecoveryActions} from './components/recovery/GroupProtectionEntry';
import {OrganizerMemberEntry, type ProductAccountOrganizerActions} from './components/membership/OrganizerMemberEntry';
import {RemoveMemberEntry, type ProductAccountMemberRemovalActions} from './components/membership/RemoveMemberEntry';
import {canManageCanonicalMembership} from './membership/membershipManagementVisibility';
import {
  GroupCreationEntryService,
  type GroupCreationInputV1,
  type SharedGroupCreationReadiness,
} from './membership/groupCreationEntryService';
import type {KeyValueStorage} from './environment/livePayerSync';

type View = 
  | { name: 'welcome' }
  | { name: 'guest_setup', draft?: ReviewableReceiptDraft }
  | { name: 'home' }
  | { name: 'receipt_start', returnTo: 'welcome' | 'home' }
  | { name: 'choose_group_for_draft', draft: ReviewableReceiptDraft }
  | { name: 'mode_intro', mode: GroupMode }
  | { name: 'state_proof' }
  | { name: 'create_group', mode?: GroupMode, draft?: ReviewableReceiptDraft }
  | { name: 'group_detail', groupId: string }
  | { name: 'group_payments', groupId: string }
  | { name: 'close_group', groupId: string }
  | { name: 'settle_up', groupId: string }
  | { name: 'capture_spend', groupId: string, draftAmount?: string, draftTitle?: string, draftSource?: CaptureSource, draftReceiptStatus?: ReceiptDraftStatus, draftFileName?: string, spendCardTransactionId?: string }
  | { name: 'review_split', groupId: string, amount: string, title: string, source: CaptureSource, receiptStatus?: ReceiptDraftStatus, fileName?: string, spendCardTransactionId?: string }
  | { name: 'request_payment', groupId: string, memberId: string }
  | { name: 'payer_view', groupId: string, memberId: string }
  | { name: 'standalone_payer_request', request: StandalonePayerRequestData, groupId: string, memberId: string }
  | { name: 'membership_bootstrap', bootstrap: RecipientBoundBootstrap }
  | { name: 'limited_no_app_action', request: SignedLimitedNoAppActionV1 }
  | { name: 'bounded_entry_unavailable', kind: 'invitation' | 'request' | 'group' }
  | { name: 'membership_organizer' }
  | { name: 'group_recovery', groupId: string }
  | { name: 'group_protection', groupId: string }
  | { name: 'organizer_member', groupId: string }
  | { name: 'remove_member', groupId: string }
  | { name: 'dinner_journey' }
  | { name: 'saved_record', recordId: string }
  | { name: 'profile' }
  | { name: 'friends' }
  | { name: 'payment_methods' }
  | { name: 'history' }
  | { name: 'settings' }
  | { name: 'style_guide' };

export interface AppDependencies {
  membershipBootstrapEntry?: MembershipBootstrapEntryDependencies;
  limitedNoAppAction?: LimitedNoAppActionEntryDependencies;
  membershipOrganizerEntry?: MembershipOrganizerEntryAdapter;
  groupRecovery?: GroupRecoveryEntryDependencies;
  dinnerJourney?: DinnerJourneyEntryDependencies;
  acceptedMemberships?: AcceptedMembershipGrantResolver;
  authority?: ProductionAuthorityDependencies;
  groupCreation?: {
    storage: KeyValueStorage;
    readiness: SharedGroupCreationReadiness;
  };
  productAccount?: {
    request(authority: {
      readCanonicalGroup(groupId: string): Promise<CanonicalGroupStateV1 | null>;
      readAcceptedEvents(groupId: string): Promise<CanonicalEventV1[]>;
      acceptCanonicalEvent(envelope: CanonicalAuthorityEventEnvelopeV1): Promise<void>;
      importRecoveredEvents(events: CanonicalEventV1[]): Promise<'applied' | 'duplicate'>;
      readGroupOrigin(groupId: string): Promise<CanonicalEventV1 | null>;
      runMembershipAuthority(command: import('./core/authority/productionAuthority').MembershipAuthorityCommandV1): Promise<CanonicalGroupStateV1 | null>;
    }): Promise<{
      participantId: string;
      displayName: string;
      accountPublicKeyHex: string;
      activate(): void;
      discard(): void;
      recovery: ProductAccountRecoveryActions;
      organizer: ProductAccountOrganizerActions;
      removal: ProductAccountMemberRemovalActions;
    }>;
  };
}

function AppRouter({dependencies}: {dependencies?: AppDependencies}) {
  const { state, bindProductAccountIdentity, runAuthority, readCanonicalGroup, readAcceptedEvents, readGroupOrigin, runMembershipAuthority, acceptCanonicalEvent, importRecoveredEvents } = useAppState();
  const [accountRecovery, setAccountRecovery] = useState<ProductAccountRecoveryActions | null>(null);
  const [accountOrganizer, setAccountOrganizer] = useState<ProductAccountOrganizerActions | null>(null);
  const [accountRemoval, setAccountRemoval] = useState<ProductAccountMemberRemovalActions | null>(null);
  const [managedMembershipGroupId, setManagedMembershipGroupId] = useState<string | null>(null);
  const getEntryView = (): View => {
    const payerRoute = getPayerRequestEntryView(state);
    if (payerRoute) {
      return payerRoute;
    }

    const standaloneRequest = parseStandalonePayerRequest();
    const standaloneRoute = parsePayerRequestRoute();
    if (standaloneRequest && standaloneRoute && !hasKnownLocalPayerRoute(state)) {
      return {
        name: 'standalone_payer_request',
        request: standaloneRequest,
        groupId: standaloneRoute.groupId,
        memberId: standaloneRoute.memberId,
      };
    }

    if (window.location.hash.includes('chopdot-contact=')) {
      return {name: 'friends'};
    }

    if (!state.currentUserId) {
      return { name: 'welcome' };
    }

    const recoveryGroupId = parseRecoveryEntry();
    if (recoveryGroupId) return {name: 'group_recovery', groupId: recoveryGroupId};

    const limitedRequest = parseLimitedNoAppActionEntry();
    if (limitedRequest) return {name: 'limited_no_app_action', request: limitedRequest};

    const bootstrap = parseMembershipBootstrapEntry();
    if (bootstrap) return { name: 'membership_bootstrap', bootstrap };

    if (window.location.hash.includes('chopdot-action=')) {
      return {name: 'bounded_entry_unavailable', kind: 'request'};
    }
    if (window.location.hash.includes('chopdot-invite=')) {
      return {name: 'bounded_entry_unavailable', kind: 'invitation'};
    }
    if (window.location.hash.includes('chopdot-recover=')) {
      return {name: 'bounded_entry_unavailable', kind: 'group'};
    }

    return { name: 'home' };
  };
  const [view, setView] = useState<View>(getEntryView);
  const reconnectAttemptedRef = useRef(false);
  const visibleGroupId = ['group_detail', 'group_payments'].includes(view.name) && 'groupId' in view ? view.groupId : null;

  useEffect(() => {
    let active = true;
    setManagedMembershipGroupId(null);
    const participantId = state.currentUserId;
    const accountPublicKeyHex = participantId ? state.users[participantId]?.accountPublicKeyHex : undefined;
    if (!visibleGroupId || !accountOrganizer || !accountRemoval || !participantId || !accountPublicKeyHex) return () => { active = false; };
    void readCanonicalGroup(visibleGroupId).then(canonical => {
      if (active && canManageCanonicalMembership({state: canonical, participantId, accountPublicKeyHex})) {
        setManagedMembershipGroupId(visibleGroupId);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [accountOrganizer, accountRemoval, readCanonicalGroup, state.currentUserId, state.users, visibleGroupId]);

  const connectProductAccount = useCallback(async ({preserveView = false}: {preserveView?: boolean} = {}) => {
    if (!dependencies?.productAccount) throw new Error('Product Account is unavailable.');
    const identity = await dependencies.productAccount.request({readCanonicalGroup, readAcceptedEvents, readGroupOrigin, runMembershipAuthority, acceptCanonicalEvent, importRecoveredEvents});
    if (!bindProductAccountIdentity(identity)) {
      identity.discard();
      throw new Error('ChopDot could not connect this account to the current person.');
    }
    try {
      identity.activate();
    } catch (reason) {
      identity.discard();
      throw reason;
    }
    setAccountRecovery(identity.recovery);
    setAccountOrganizer(identity.organizer);
    setAccountRemoval(identity.removal);
    if (!preserveView) {
      const bootstrap = parseMembershipBootstrapEntry();
      if (bootstrap) {
        setView({name: 'membership_bootstrap', bootstrap});
      } else {
        const entry = getEntryView();
        setView(entry.name === 'welcome' ? {name: 'home'} : entry);
      }
    }
    return {participantId: identity.participantId};
  }, [acceptCanonicalEvent, bindProductAccountIdentity, dependencies?.productAccount, importRecoveredEvents, readAcceptedEvents, readCanonicalGroup, readGroupOrigin, runMembershipAuthority]);

  const createSharedGroup = useCallback(async (input: GroupCreationInputV1): Promise<boolean> => {
    const composition = dependencies?.groupCreation;
    let participantId = state.currentUserId;
    if (!composition || !participantId) return false;

    if (!composition.readiness.sharedGroupCreationAccount(participantId)) {
      if (!dependencies?.productAccount) return false;
      participantId = (await connectProductAccount({preserveView: true})).participantId;
    }

    const service = new GroupCreationEntryService({
      participantId,
      storage: composition.storage,
      readiness: composition.readiness,
      authority: {
        appendShared: ({action}) => runAuthority(action),
        readCanonicalGroup,
      },
    });
    const result = await service.createOrResume({...input, intent: 'shared'});
    return result.status === 'shared_group_created';
  }, [connectProductAccount, dependencies?.groupCreation, dependencies?.productAccount, readCanonicalGroup, runAuthority, state.currentUserId]);

  useEffect(() => {
    const current = state.currentUserId ? state.users[state.currentUserId] : null;
    if (!current?.accountPublicKeyHex || accountRecovery || !dependencies?.productAccount || reconnectAttemptedRef.current) return;
    reconnectAttemptedRef.current = true;
    void connectProductAccount().catch(() => undefined);
  }, [accountRecovery, connectProductAccount, dependencies?.productAccount, state.currentUserId, state.users]);

  const isDev = new URLSearchParams(window.location.search).get("dev") === "1";
  const backView = getBackView(view);

  useEffect(() => {
    return configureHostBackButton(Boolean(backView), () => {
      if (backView) {
        setView(backView);
      }
    });
  }, [view]);

  useEffect(() => {
    const followBoundedEntryNavigation = () => setView(getEntryView());
    window.addEventListener('hashchange', followBoundedEntryNavigation);
    return () => window.removeEventListener('hashchange', followBoundedEntryNavigation);
  }, [state.currentUserId]);

  useEffect(() => {
    const payerView = getPayerRequestEntryView(state);
    if (!payerView || payerView.name !== 'payer_view') return;
    if (view.name === 'payer_view' && view.groupId === payerView.groupId && view.memberId === payerView.memberId) return;
    setView(payerView);
  }, [state.groups, state.users, state.expenses, state.splits, view]);

  useEffect(() => {
    const adapter = dependencies?.membershipOrganizerEntry;
    if (!adapter) return;
    const showAcceptedInvitation = () => {
      if (['ready_to_invite', 'ready_to_grant'].includes(adapter.getStatus())) {
        setView({name: 'membership_organizer'});
      }
    };
    showAcceptedInvitation();
    return adapter.subscribe(showAcceptedInvitation);
  }, [dependencies?.membershipOrganizerEntry]);

  if (view.name === 'state_proof') {
    if (!isDev) return <Home onStartGroup={() => setView({ name: 'home' })} onScanReceipt={() => setView({name: 'receipt_start', returnTo: 'home'})} onGoToGroup={() => setView({ name: 'home' })} onGoToProfile={() => setView({ name: 'home' })} />;
    return <StateProof onBack={() => setView(getEntryView())} />;
  }

  if (view.name === 'standalone_payer_request') {
    return (
      <StandalonePayerRequest
        request={view.request}
        groupId={view.groupId}
        memberId={view.memberId}
      />
    );
  }

  if (view.name === 'membership_bootstrap') {
    return <MembershipBootstrapEntry bootstrap={view.bootstrap} onClose={() => setView({name: 'home'})} dependencies={dependencies?.membershipBootstrapEntry} />;
  }

  if (view.name === 'group_recovery') {
    return <GroupRecoveryEntry groupId={view.groupId} dependencies={dependencies?.groupRecovery} onClose={() => setView({name: 'home'})} />;
  }

  if (view.name === 'group_protection' && accountRecovery) {
    return <GroupProtectionEntry groupId={view.groupId} actions={accountRecovery} onClose={() => setView({name: 'group_detail', groupId: view.groupId})} />;
  }

  if (view.name === 'organizer_member' && accountOrganizer) {
    return <OrganizerMemberEntry groupId={view.groupId} groupName={state.groups[view.groupId]?.name ?? 'This group'} actions={accountOrganizer} onClose={() => setView({name: 'group_detail', groupId: view.groupId})} />;
  }

  if (view.name === 'remove_member' && accountRemoval) {
    return <RemoveMemberEntry groupId={view.groupId} actions={accountRemoval} onClose={() => setView({name: 'group_detail', groupId: view.groupId})} />;
  }

  if (view.name === 'dinner_journey') {
    return <DinnerJourneyEntry dependencies={dependencies?.dinnerJourney} onClose={() => setView({name: 'welcome'})} />;
  }

  if (view.name === 'limited_no_app_action') {
    return <LimitedNoAppActionEntry request={view.request} onClose={() => setView({name: 'home'})} dependencies={dependencies?.limitedNoAppAction} />;
  }

  if (view.name === 'bounded_entry_unavailable') {
    return <BoundedEntryUnavailable kind={view.kind} onClose={() => setView({name: 'home'})} />;
  }

  if (view.name === 'membership_organizer' && dependencies?.membershipOrganizerEntry) {
    return <MembershipOrganizerEntry adapter={dependencies.membershipOrganizerEntry} onClose={() => setView({name: 'home'})} />;
  }

  if (view.name === 'receipt_start') {
    return (
      <ReceiptFirstStart
        currency={state.currency}
        onBack={() => setView(view.returnTo === 'home' ? {name: 'home'} : {name: 'welcome'})}
        onContinue={draft => setView(state.currentUserId
          ? {name: 'choose_group_for_draft', draft}
          : {name: 'guest_setup', draft})}
      />
    );
  }

  if (view.name === 'friends' && !state.currentUserId) {
    return <Friends onBack={() => setView({name: 'welcome'})} />;
  }

  if (!state.currentUserId) {
    if (view.name === 'guest_setup') {
      return <GuestSetup onBack={() => setView(view.draft ? {name: 'receipt_start', returnTo: 'welcome'} : {name: 'welcome'})} onComplete={() => setView(view.draft ? {name: 'choose_group_for_draft', draft: view.draft} : { name: 'home' })} />;
    }
    return <Welcome
      onScanReceipt={() => setView({name: 'receipt_start', returnTo: 'welcome'})}
      onGuest={() => setView(dependencies?.dinnerJourney ? {name: 'dinner_journey'} : { name: 'guest_setup' })}
      onUseProductAccount={dependencies?.productAccount ? async () => { await connectProductAccount(); } : undefined}
    />;
  }

  let content;
  
  if (view.name === 'choose_group_for_draft') {
    content = (
      <ChooseGroupForDraft
        draft={view.draft}
        onBack={() => setView({name: 'receipt_start', returnTo: 'home'})}
        onChoose={groupId => setView({
          name: 'review_split',
          groupId,
          amount: view.draft.amount,
          title: view.draft.title,
          source: view.draft.source,
          receiptStatus: view.draft.receiptStatus,
          fileName: view.draft.fileName,
        })}
        onCreate={() => setView({name: 'create_group', mode: 'normal_pot', draft: view.draft})}
      />
    );
  } else if (view.name === 'mode_intro') {
    content = <ModeIntro mode={view.mode} onBack={() => setView({name: 'home'})} onStart={() => setView({name: 'create_group', mode: view.mode})} />;
  } else if (view.name === 'create_group') {
    content = (
      <CreateGroup
        mode={view.mode}
        onBack={() => setView(view.draft ? {name: 'choose_group_for_draft', draft: view.draft} : { name: 'home' })}
        onPrepareSharedAction={dependencies?.productAccount ? () => connectProductAccount({preserveView: true}) : undefined}
        onCreateSharedGroup={dependencies?.groupCreation ? createSharedGroup : undefined}
        onCreated={(groupId) => setView(view.draft ? {
          name: 'review_split',
          groupId,
          amount: view.draft.amount,
          title: view.draft.title,
          source: view.draft.source,
          receiptStatus: view.draft.receiptStatus,
          fileName: view.draft.fileName,
        } : { name: 'group_detail', groupId })}
      />
    );
  } else if (view.name === 'group_detail') {
    const mode = state.groups[view.groupId]?.mode ?? 'normal_pot';
    const canManageMembers = managedMembershipGroupId === view.groupId;
    content = ['spend_card', 'savings_circle', 'emergency_pot', 'community_fund'].includes(mode) ? (
      <NamedModeWorkspace
        groupId={view.groupId}
        onBack={() => setView({name: 'home'})}
        onSplitPurchase={draft => setView({name: 'capture_spend', groupId: view.groupId, draftAmount: draft.amount, draftTitle: draft.title, draftSource: 'receipt', draftReceiptStatus: 'needs_review', spendCardTransactionId: draft.transactionId})}
        onOpenPayments={() => setView({name: 'group_payments', groupId: view.groupId})}
        onManageMembers={canManageMembers ? () => setView({name: 'group_payments', groupId: view.groupId}) : undefined}
      />
    ) : (
      <GroupDetail
        groupId={view.groupId}
        onBack={() => setView({ name: 'home' })}
        onAddSpend={() => setView({ name: 'capture_spend', groupId: view.groupId })}
        onCloseGroup={() => setView({ name: 'close_group', groupId: view.groupId })}
        onGoToSettleUp={() => setView({ name: 'settle_up', groupId: view.groupId })}
        onProtectGroup={accountRecovery ? () => setView({name: 'group_protection', groupId: view.groupId}) : undefined}
        onInviteMember={canManageMembers && accountOrganizer ? () => setView({name: 'organizer_member', groupId: view.groupId}) : undefined}
        onRemoveMember={canManageMembers && accountRemoval ? () => setView({name: 'remove_member', groupId: view.groupId}) : undefined}
      />
    );
  } else if (view.name === 'group_payments') {
    const canManageMembers = managedMembershipGroupId === view.groupId;
    content = <GroupDetail
      groupId={view.groupId}
      onBack={() => setView({name: 'group_detail', groupId: view.groupId})}
      onAddSpend={() => setView({name: 'capture_spend', groupId: view.groupId})}
      onCloseGroup={() => setView({name: 'close_group', groupId: view.groupId})}
      onGoToSettleUp={() => setView({name: 'settle_up', groupId: view.groupId})}
      onProtectGroup={accountRecovery ? () => setView({name: 'group_protection', groupId: view.groupId}) : undefined}
      onInviteMember={canManageMembers && accountOrganizer ? () => setView({name: 'organizer_member', groupId: view.groupId}) : undefined}
      onRemoveMember={canManageMembers && accountRemoval ? () => setView({name: 'remove_member', groupId: view.groupId}) : undefined}
    />;
  } else if (view.name === 'settle_up') {
    content = <SettleUp
      groupId={view.groupId}
      onBack={() => setView({ name: 'group_detail', groupId: view.groupId })}
      onFinishGroup={() => setView({ name: 'close_group', groupId: view.groupId })}
    />;
  } else if (view.name === 'close_group') {
    content = <CloseGroup 
      groupId={view.groupId}
      onBack={() => setView({ name: 'group_detail', groupId: view.groupId })}
      onFinish={(recordId) => setView({ name: 'saved_record', recordId })}
    />;
  } else if (view.name === 'capture_spend') {
    content = <CaptureSpend 
      groupId={view.groupId} 
      initialAmount={view.draftAmount}
      initialTitle={view.draftTitle}
      initialSource={view.draftSource}
      initialReceiptStatus={view.draftReceiptStatus}
      initialFileName={view.draftFileName}
      onBack={() => setView({ name: 'group_detail', groupId: view.groupId })} 
      onNext={(amount, title, context) => setView({
        name: 'review_split',
        groupId: view.groupId,
        amount,
        title,
        source: context.source,
        receiptStatus: context.receiptStatus,
        fileName: context.fileName,
        spendCardTransactionId: view.spendCardTransactionId,
      })}
    />;
  } else if (view.name === 'review_split') {
    content = <ReviewSplit
      groupId={view.groupId}
      amount={view.amount}
      title={view.title}
      source={view.source}
      spendCardTransactionId={view.spendCardTransactionId}
      onBack={() => setView({
        name: 'capture_spend',
        groupId: view.groupId,
        draftAmount: view.amount,
        draftTitle: view.title,
        draftSource: view.source,
        draftReceiptStatus: view.receiptStatus,
        draftFileName: view.fileName,
        spendCardTransactionId: view.spendCardTransactionId,
      })}
      onSave={() => setView({ name: 'group_detail', groupId: view.groupId })}
    />;
  } else if (view.name === 'request_payment') {
    content = <RequestPayment
      groupId={view.groupId}
      memberId={view.memberId}
      onBack={() => setView({ name: 'group_detail', groupId: view.groupId })}
      onSend={() => setView({ name: 'group_detail', groupId: view.groupId })}
    />;
  } else if (view.name === 'payer_view') {
    content = <PayerView
      groupId={view.groupId}
      memberId={view.memberId}
      onBack={() => setView({ name: 'group_detail', groupId: view.groupId })}
      onPaid={() => setView({ name: 'group_detail', groupId: view.groupId })}
    />;
  } else if (view.name === 'saved_record') {
    content = <SavedRecordView
      recordId={view.recordId}
      onBack={() => setView({ name: 'home' })}
    />;
  } else if (view.name === 'profile') {
    content = <Profile onBack={() => setView({ name: 'home' })} />;
  } else if (view.name === 'friends') {
    content = <Friends onBack={() => setView({ name: 'home' })} />;
  } else if (view.name === 'payment_methods') {
    content = <PaymentMethods onBack={() => setView({ name: 'home' })} />;
  } else if (view.name === 'history') {
    content = <History onBack={() => setView({ name: 'home' })} onOpenRecord={(recordId) => setView({ name: 'saved_record', recordId })} />;
  } else if (view.name === 'settings') {
    content = <Settings onBack={() => setView({ name: 'home' })} onGoToStyleGuide={() => setView({ name: 'style_guide' })} onGoToStateProof={() => setView({ name: 'state_proof' })} />;
  } else if (view.name === 'style_guide') {
    if (!isDev) {
      content = <Home 
        onStartGroup={() => setView({ name: 'home' })}
        onScanReceipt={() => setView({name: 'receipt_start', returnTo: 'home'})}
        onGoToGroup={() => setView({ name: 'home' })}
        onGoToProfile={() => setView({ name: 'home' })}
      />;
    } else {
      content = <StyleGuide onBack={() => setView({ name: 'settings' })} />;
    }
  } else {
    content = <Home 
      onStartGroup={() => setView({ name: 'create_group' })}
      onScanReceipt={() => setView({name: 'receipt_start', returnTo: 'home'})}
      onGoToGroup={(groupId) => setView({ name: 'group_detail', groupId })}
      onGoToProfile={() => setView({ name: 'profile' })}
    />;
  }

  const showBottomNav = ['home', 'friends', 'payment_methods', 'history', 'settings'].includes(view.name);

  return (
    <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
      <div className={`flex-1 flex flex-col overflow-hidden ${showBottomNav ? 'pb-[72px]' : ''}`}>
        {content}
      </div>
      {showBottomNav && (
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-[#1a1a1a] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] transition-colors h-[72px] z-50">
          <div className="flex justify-around items-center h-full px-2">
            <button onClick={() => setView({ name: 'home' })} className={`min-h-11 min-w-11 p-2 flex flex-col items-center transition-colors ${view.name === 'home' ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>
              <HomeIcon className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">Home</span>
            </button>
            <button onClick={() => setView({ name: 'friends' })} className={`min-h-11 min-w-11 p-2 flex flex-col items-center transition-colors ${view.name === 'friends' ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>
              <Users className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">Friends</span>
            </button>
            <button onClick={() => setView({ name: 'payment_methods' })} className={`min-h-11 min-w-11 p-2 flex flex-col items-center transition-colors ${view.name === 'payment_methods' ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>
              <Wallet className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">Pay</span>
            </button>
            <button onClick={() => setView({ name: 'history' })} className={`min-h-11 min-w-11 p-2 flex flex-col items-center transition-colors ${view.name === 'history' ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>
              <HistoryIcon className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">History</span>
            </button>
            <button onClick={() => setView({ name: 'settings' })} className={`min-h-11 min-w-11 p-2 flex flex-col items-center transition-colors ${view.name === 'settings' ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>
              <SettingsIcon className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">Settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemedLayout({dependencies}: {dependencies?: AppDependencies}) {
  const { state } = useAppState();

  useEffect(() => {
    initializeHostEnvironment(state.theme);
    const handleTelegramReady = () => initializeHostEnvironment(state.theme);
    const retry = window.setTimeout(handleTelegramReady, 250);

    window.addEventListener('chopdot:telegram-ready', handleTelegramReady);

    return () => {
      window.clearTimeout(retry);
      window.removeEventListener('chopdot:telegram-ready', handleTelegramReady);
    };
  }, [state.theme]);

  return (
    <div className={`min-h-[100dvh] ${state.theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'} flex items-center justify-center sm:py-10 transition-colors`}>
      <div className={`app-shell-frame w-full sm:max-w-[640px] lg:max-w-[720px] ${state.theme === 'dark' ? 'bg-gray-950 border-gray-900' : 'bg-gray-50 border-gray-200'} sm:rounded-3xl sm:shadow-2xl overflow-hidden relative flex flex-col font-sans sm:border transition-colors`}>
        <AppRouter dependencies={dependencies} />
      </div>
    </div>
  );
}

function getBackView(view: View): View | null {
  switch (view.name) {
    case 'guest_setup':
      return view.draft ? {name: 'receipt_start', returnTo: 'welcome'} : { name: 'welcome' };
    case 'create_group':
      return view.draft ? {name: 'choose_group_for_draft', draft: view.draft} : {name: 'home'};
    case 'receipt_start':
      return {name: view.returnTo};
    case 'choose_group_for_draft':
      return {name: 'receipt_start', returnTo: 'home'};
    case 'mode_intro':
    case 'profile':
    case 'friends':
    case 'payment_methods':
    case 'history':
    case 'settings':
      return { name: 'home' };
    case 'group_detail':
      return { name: 'home' };
    case 'group_payments':
      return {name: 'group_detail', groupId: view.groupId};
    case 'settle_up':
    case 'close_group':
    case 'capture_spend':
    case 'request_payment':
    case 'payer_view':
      return { name: 'group_detail', groupId: view.groupId };
    case 'standalone_payer_request':
    case 'membership_bootstrap':
    case 'limited_no_app_action':
    case 'bounded_entry_unavailable':
    case 'membership_organizer':
    case 'group_recovery':
    case 'group_protection':
    case 'organizer_member':
    case 'remove_member':
    case 'dinner_journey':
      return null;
    case 'review_split':
      return {
        name: 'capture_spend',
        groupId: view.groupId,
        draftAmount: view.amount,
        draftTitle: view.title,
        draftSource: view.source,
        draftReceiptStatus: view.receiptStatus,
        draftFileName: view.fileName,
        spendCardTransactionId: view.spendCardTransactionId,
      };
    case 'saved_record':
      return { name: 'home' };
    case 'state_proof':
      return { name: 'home' };
    case 'style_guide':
      return { name: 'settings' };
    case 'welcome':
    case 'home':
      return null;
    default:
      return null;
  }
}

function getPayerRequestEntryView(state: AppState): View | null {
  const route = parsePayerRequestRoute();
  if (!route || !state.groups[route.groupId] || !state.users[route.memberId]) {
    return null;
  }

  const hasRequest = Object.values(state.splits).some((split) => {
    const expense = state.expenses[split.expenseId];
    return (
      split.userId === route.memberId &&
      split.status === 'request_sent' &&
      expense?.groupId === route.groupId
    );
  });

  if (!hasRequest) {
    return null;
  }

  return { name: 'payer_view', groupId: route.groupId, memberId: route.memberId };
}

function hasKnownLocalPayerRoute(state: AppState): boolean {
  return getPayerRequestEntryView(state) !== null;
}

function parseMembershipBootstrapEntry(): RecipientBoundBootstrap | null {
  if (!window.location.hash.includes('chopdot-invite=')) return null;
  try {
    return bootstrapFromUrl(window.location.href);
  } catch {
    return null;
  }
}

function parseLimitedNoAppActionEntry(): SignedLimitedNoAppActionV1 | null {
  if (!window.location.hash.includes('chopdot-action=')) return null;
  try {
    return limitedNoAppActionFromUrl(window.location.href);
  } catch {
    return null;
  }
}

function parseRecoveryEntry(): string | null {
  if (!window.location.hash.includes('chopdot-recover=')) return null;
  try {
    return recoveryGroupFromUrl(window.location.href);
  } catch {
    return null;
  }
}

export default function App({dependencies}: {dependencies?: AppDependencies} = {}) {
  return (
    <AppStateProvider
      authorityDependencies={dependencies?.authority ?? {acceptedMemberships: dependencies?.acceptedMemberships}}
    >
      <ThemedLayout dependencies={dependencies} />
    </AppStateProvider>
  );
}
