/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
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
import { Home as HomeIcon, Users, Settings as SettingsIcon, History as HistoryIcon, Wallet } from 'lucide-react';

type View = 
  | { name: 'welcome' }
  | { name: 'guest_setup' }
  | { name: 'home' }
  | { name: 'state_proof' }
  | { name: 'create_group' }
  | { name: 'group_detail', groupId: string }
  | { name: 'close_group', groupId: string }
  | { name: 'settle_up', groupId: string }
  | { name: 'capture_spend', groupId: string }
  | { name: 'review_split', groupId: string, amount: number, title: string }
  | { name: 'request_payment', groupId: string, memberId: string }
  | { name: 'payer_view', groupId: string, memberId: string }
  | { name: 'saved_record', recordId: string }
  | { name: 'profile' }
  | { name: 'friends' }
  | { name: 'payment_methods' }
  | { name: 'history' }
  | { name: 'settings' }
  | { name: 'style_guide' };

function AppRouter() {
  const { state } = useAppState();
  const getEntryView = (): View => state.currentUserId ? { name: 'home' } : { name: 'welcome' };
  const [view, setView] = useState<View>(getEntryView);

  const isDev = new URLSearchParams(window.location.search).get("dev") === "1";

  if (view.name === 'state_proof') {
    if (!isDev) return <Home onGoToStateProof={() => setView({ name: 'home' })} onStartGroup={() => setView({ name: 'home' })} onGoToGroup={() => setView({ name: 'home' })} onGoToProfile={() => setView({ name: 'home' })} />;
    return <StateProof onBack={() => setView(getEntryView())} />;
  }

  if (!state.currentUserId) {
    if (view.name === 'guest_setup') {
      return <GuestSetup onBack={() => setView({ name: 'welcome' })} onComplete={() => setView({ name: 'home' })} />;
    }
    return <Welcome onGuest={() => setView({ name: 'guest_setup' })} />;
  }

  let content;
  
  if (view.name === 'create_group') {
    content = <CreateGroup onBack={() => setView({ name: 'home' })} onCreated={(groupId) => setView({ name: 'group_detail', groupId })} />;
  } else if (view.name === 'group_detail') {
    content = <GroupDetail 
      groupId={view.groupId} 
      onBack={() => setView({ name: 'home' })} 
      onAddSpend={() => setView({ name: 'capture_spend', groupId: view.groupId })}
      onRequestPayment={(memberId) => setView({ name: 'request_payment', groupId: view.groupId, memberId })}
      onOpenPayerView={(memberId) => setView({ name: 'payer_view', groupId: view.groupId, memberId })}
      onCloseGroup={() => setView({ name: 'close_group', groupId: view.groupId })}
      onGoToSettleUp={() => setView({ name: 'settle_up', groupId: view.groupId })}
    />;
  } else if (view.name === 'settle_up') {
    content = <SettleUp
      groupId={view.groupId}
      onBack={() => setView({ name: 'group_detail', groupId: view.groupId })}
      onRequestPayment={(memberId) => setView({ name: 'request_payment', groupId: view.groupId, memberId })}
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
      onBack={() => setView({ name: 'group_detail', groupId: view.groupId })} 
      onNext={(amount, title) => setView({ name: 'review_split', groupId: view.groupId, amount, title })}
    />;
  } else if (view.name === 'review_split') {
    content = <ReviewSplit
      groupId={view.groupId}
      amount={view.amount}
      title={view.title}
      onBack={() => setView({ name: 'capture_spend', groupId: view.groupId })}
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

function ThemedLayout() {
  const { state } = useAppState();
  return (
    <div className={`min-h-[100dvh] ${state.theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'} flex items-center justify-center sm:py-10 transition-colors`}>
      <div className={`w-full h-[100dvh] sm:h-[800px] sm:max-w-[375px] ${state.theme === 'dark' ? 'bg-gray-950 border-gray-900' : 'bg-gray-50 border-gray-200'} sm:rounded-3xl sm:shadow-2xl overflow-hidden relative flex flex-col font-sans sm:border transition-colors`}>
        <AppRouter />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <ThemedLayout />
    </AppStateProvider>
  );
}
