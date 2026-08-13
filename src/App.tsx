/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
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
import { bootstrapFromUrl, type RecipientBoundBootstrapV1 } from './membership/recipientBoundBootstrap';
import {limitedNoAppActionFromUrl} from './membership/limitedNoAppActionLink';
import type {SignedLimitedNoAppActionV1} from './membership/limitedNoAppAction';
import { AppState } from './types';
import {CaptureSource, ReceiptDraftStatus} from './capture/receiptDraft';
import {GroupRecoveryEntry, type GroupRecoveryEntryDependencies} from './components/recovery/GroupRecoveryEntry';
import {recoveryGroupFromUrl} from './recovery/recoveryLink';
import {DinnerJourneyEntry, type DinnerJourneyEntryDependencies} from './components/journey/DinnerJourneyEntry';

type View = 
  | { name: 'welcome' }
  | { name: 'guest_setup' }
  | { name: 'home' }
  | { name: 'state_proof' }
  | { name: 'create_group' }
  | { name: 'group_detail', groupId: string }
  | { name: 'close_group', groupId: string }
  | { name: 'settle_up', groupId: string }
  | { name: 'capture_spend', groupId: string, draftAmount?: number, draftTitle?: string, draftSource?: CaptureSource, draftReceiptStatus?: ReceiptDraftStatus, draftFileName?: string }
  | { name: 'review_split', groupId: string, amount: number, title: string, source: CaptureSource, receiptStatus?: ReceiptDraftStatus, fileName?: string }
  | { name: 'request_payment', groupId: string, memberId: string }
  | { name: 'payer_view', groupId: string, memberId: string }
  | { name: 'standalone_payer_request', request: StandalonePayerRequestData, groupId: string, memberId: string }
  | { name: 'membership_bootstrap', bootstrap: RecipientBoundBootstrapV1 }
  | { name: 'limited_no_app_action', request: SignedLimitedNoAppActionV1 }
  | { name: 'bounded_entry_unavailable', kind: 'invitation' | 'request' | 'group' }
  | { name: 'membership_organizer' }
  | { name: 'group_recovery', groupId: string }
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
}

function AppRouter({dependencies}: {dependencies?: AppDependencies}) {
  const { state, dispatch } = useAppState();
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
    if (!isDev) return <Home onGoToStateProof={() => setView({ name: 'home' })} onStartGroup={() => setView({ name: 'home' })} onGoToGroup={() => setView({ name: 'home' })} onGoToProfile={() => setView({ name: 'home' })} />;
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

  if (!state.currentUserId) {
    if (view.name === 'guest_setup') {
      return <GuestSetup onBack={() => setView({ name: 'welcome' })} onComplete={() => setView({ name: 'home' })} />;
    }
    return <Welcome onGuest={() => setView(dependencies?.dinnerJourney ? {name: 'dinner_journey'} : { name: 'guest_setup' })} />;
  }

  let content;
  
  if (view.name === 'create_group') {
    content = <CreateGroup onBack={() => setView({ name: 'home' })} onCreated={(groupId) => setView({ name: 'group_detail', groupId })} />;
  } else if (view.name === 'group_detail') {
    content = <GroupDetail 
      groupId={view.groupId} 
      onBack={() => setView({ name: 'home' })} 
      onAddSpend={() => setView({ name: 'capture_spend', groupId: view.groupId })}
      onCloseGroup={() => setView({ name: 'close_group', groupId: view.groupId })}
      onGoToSettleUp={() => setView({ name: 'settle_up', groupId: view.groupId })}
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
      })}
    />;
  } else if (view.name === 'review_split') {
    content = <ReviewSplit
      groupId={view.groupId}
      amount={view.amount}
      title={view.title}
      source={view.source}
      onBack={() => setView({
        name: 'capture_spend',
        groupId: view.groupId,
        draftAmount: view.amount,
        draftTitle: view.title,
        draftSource: view.source,
        draftReceiptStatus: view.receiptStatus,
        draftFileName: view.fileName,
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
        onGoToStateProof={() => setView({ name: 'home' })} 
        onStartGroup={() => setView({ name: 'home' })}
        onGoToGroup={() => setView({ name: 'home' })}
        onGoToProfile={() => setView({ name: 'home' })}
      />;
    } else {
      content = <StyleGuide onBack={() => setView({ name: 'settings' })} />;
    }
  } else {
    content = <Home 
      onGoToStateProof={() => setView({ name: 'state_proof' })} 
      onStartGroup={() => setView({ name: 'create_group' })}
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
            <button onClick={() => setView({ name: 'home' })} className={`p-2 flex flex-col items-center transition-colors ${view.name === 'home' ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              <HomeIcon className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">Home</span>
            </button>
            <button onClick={() => setView({ name: 'friends' })} className={`p-2 flex flex-col items-center transition-colors ${view.name === 'friends' ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              <Users className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">Friends</span>
            </button>
            <button onClick={() => setView({ name: 'payment_methods' })} className={`p-2 flex flex-col items-center transition-colors ${view.name === 'payment_methods' ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              <Wallet className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">Pay</span>
            </button>
            <button onClick={() => setView({ name: 'history' })} className={`p-2 flex flex-col items-center transition-colors ${view.name === 'history' ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              <HistoryIcon className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">History</span>
            </button>
            <button onClick={() => setView({ name: 'settings' })} className={`p-2 flex flex-col items-center transition-colors ${view.name === 'settings' ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
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
      <div className={`app-shell-frame w-full sm:max-w-[375px] ${state.theme === 'dark' ? 'bg-gray-950 border-gray-900' : 'bg-gray-50 border-gray-200'} sm:rounded-3xl sm:shadow-2xl overflow-hidden relative flex flex-col font-sans sm:border transition-colors`}>
        <AppRouter dependencies={dependencies} />
      </div>
    </div>
  );
}

function getBackView(view: View): View | null {
  switch (view.name) {
    case 'guest_setup':
      return { name: 'welcome' };
    case 'create_group':
    case 'profile':
    case 'friends':
    case 'payment_methods':
    case 'history':
    case 'settings':
      return { name: 'home' };
    case 'group_detail':
      return { name: 'home' };
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
  const route = parsePayerRequestRoute();
  return Boolean(route && state.groups[route.groupId] && state.users[route.memberId]);
}

function parseMembershipBootstrapEntry(): RecipientBoundBootstrapV1 | null {
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
    <AppStateProvider>
      <ThemedLayout dependencies={dependencies} />
    </AppStateProvider>
  );
}
