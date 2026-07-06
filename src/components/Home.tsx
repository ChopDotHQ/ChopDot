import { useState, useEffect } from 'react';
import { getNetPosition, getGroupTotal, getMemberBalance } from '../state/store';
import { useAppState } from '../state/AppStateContext';
import { getInitials } from '../utils';
import { ChevronRight } from 'lucide-react';
import { getCurrencySymbol } from '../utils';
import { Group } from '../types';

export function Home({ 
  onGoToStateProof, 
  onStartGroup,
  onGoToGroup,
  onGoToProfile,
}: { 
  onGoToStateProof: () => void;
  onStartGroup: () => void;
  onGoToGroup: (groupId: string) => void;
  onGoToProfile: () => void;
}) {
  const { state } = useAppState();
  
  
  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;
  const sym = getCurrencySymbol(state.currency);
  const netPosition = currentUser ? getNetPosition(state, currentUser.id) : 0;

  if (!currentUser) return null;

  const myGroups = (Object.values(state.groups) as Group[]).filter(g => g.memberIds.includes(currentUser.id));

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors h-full overflow-hidden relative">
      <header className="px-6 pt-12 pb-6 flex justify-between items-center bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#1a1a1a] shadow-sm z-10 transition-colors shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">ChopDot</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Hey, {currentUser.name}</p>
        </div>
        <button onClick={onGoToProfile} className="h-10 w-10 bg-gray-900 dark:bg-gray-100 rounded-full flex items-center justify-center text-white dark:text-gray-900 font-semibold shadow-sm transition-colors hover:scale-105 active:scale-95">
          {getInitials(currentUser.name)}
        </button>
      </header>

      <div className="flex-1 px-6 py-6 flex flex-col overflow-y-auto pb-24">
        <div className="bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-900 dark:to-[#111111] rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 dark:border-white/5 text-center mb-8 shrink-0 transition-colors">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Net position</p>
          <div className={`text-4xl font-bold tracking-tight ${netPosition >= 0 ? 'text-gray-900 dark:text-white' : 'text-orange-600'}`}>
            {netPosition >= 0 ? '' : '-'}{sym}{Math.abs(netPosition).toFixed(2)}
          </div>
        </div>

        {myGroups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <p className="text-gray-500 dark:text-gray-400 font-medium">No group spending yet</p>
            <button 
              onClick={onStartGroup}
              className="w-full py-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
            >
              Start with a group
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white tracking-tight">Your Groups</h2>
              <button onClick={onStartGroup} className="text-sm font-semibold text-blue-600 dark:text-blue-400">New</button>
            </div>
            
            <div className="space-y-3">
              {myGroups.map(group => {
                const myBal = getMemberBalance(state, group.id, currentUser.id);
                return (
                  <button 
                    key={group.id}
                    onClick={() => onGoToGroup(group.id)}
                    className="w-full text-left bg-white dark:bg-[#111111] rounded-2xl p-4 shadow-sm border border-black/5 dark:border-white/5 flex items-center justify-between cursor-pointer hover:border-black/10 dark:hover:border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                    aria-label={`Open ${group.name}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shrink-0">
                        {getInitials(group.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{group.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{group.memberIds.length} members</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center shrink-0 ml-4">
                      <div className="mr-3">
                        <div className={`font-semibold ${myBal === 0 ? 'text-gray-400 dark:text-gray-500' : myBal > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600'}`}>
                          {myBal === 0 ? 'Settled' : myBal > 0 ? `+${sym}${myBal.toFixed(2)}` : `-${sym}${Math.abs(myBal).toFixed(2)}`}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        
        
      </div>
    </div>
  );
}
