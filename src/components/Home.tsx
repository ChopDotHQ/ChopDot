import {
  Camera,
  ChevronRight,
  HeartHandshake,
  Landmark,
  Plane,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import {useAppState} from '../state/AppStateContext';
import {getGroupTotal, getMemberBalance} from '../state/store';
import type {Group, GroupMode, Split} from '../types';
import {getCurrencySymbol, getInitials} from '../utils';
import {deriveHomePresentation} from './homePresentation';
import {groupMode, modeCopy} from './productModes';

const modeIcons = {
  normal_pot: UsersRound,
  trip: Plane,
  couple: HeartHandshake,
  spend_card: ReceiptText,
  savings_circle: RefreshCw,
  emergency_pot: ShieldCheck,
  community_fund: Landmark,
} satisfies Record<GroupMode, typeof UsersRound>;

export function Home({
  onStartGroup,
  onScanReceipt,
  onGoToGroup,
  onGoToProfile,
}: {
  onStartGroup: () => void;
  onScanReceipt: () => void;
  onGoToGroup: (groupId: string) => void;
  onGoToProfile: () => void;
}) {
  const {state} = useAppState();
  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;
  const symbol = getCurrencySymbol(state.currency);

  if (!currentUser) return null;

  const presentation = deriveHomePresentation(state, currentUser.id);
  const openGroups = presentation.openGroupIds.map(groupId => state.groups[groupId]).filter((group): group is Group => Boolean(group));

  return (
    <main className="flex h-full flex-1 flex-col overflow-hidden bg-[#f7f6f4] text-gray-950 transition-colors dark:bg-gray-950 dark:text-white">
      <header className="flex shrink-0 items-center justify-between px-6 pb-4 pt-10">
        <div>
          <p className="text-lg font-bold tracking-[-0.04em]">ChopDot</p>
          <p className="mt-0.5 text-sm font-medium text-gray-600 dark:text-gray-300">Hey, {currentUser.name}</p>
        </div>
        <button
          onClick={onGoToProfile}
          aria-label="Open profile"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-950 font-bold text-white shadow-sm transition-transform active:scale-95 dark:bg-white dark:text-gray-950"
        >
          {getInitials(currentUser.name)}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-28">
        <section aria-labelledby="groups-title" className="pb-7 pt-4">
          <div className="flex items-center justify-between gap-3">
            <h1 id="groups-title" className="text-[2.2rem] font-bold leading-none tracking-[-0.055em]">Your groups</h1>
            {presentation.state === 'returning' && (
              <button type="button" onClick={onStartGroup} className="min-h-11 rounded-full px-3 text-sm font-semibold text-gray-600 hover:bg-white hover:text-gray-950 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white">New group</button>
            )}
          </div>

          {presentation.state === 'empty' ? (
            <div className="mt-7 rounded-[1.6rem] border border-black/5 bg-white p-6 shadow-[0_8px_26px_rgba(20,20,24,0.04)] dark:border-white/5 dark:bg-gray-900">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0f8] text-[#e6007a] dark:bg-[#e6007a]/15">
                <UsersRound className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-xl font-bold tracking-[-0.035em]">Bring everyone into one place</h2>
              <p className="mt-2 max-w-[25rem] text-sm leading-6 text-gray-600 dark:text-gray-300">Start with a dinner, trip, household, or any group that shares money.</p>
              <button
                type="button"
                onClick={onStartGroup}
                data-primary-action="true"
                className="mt-6 flex min-h-14 w-full items-center justify-center rounded-full bg-[#e6007a] px-6 text-base font-bold text-white shadow-[0_12px_28px_rgba(230,0,122,0.2)] transition-colors hover:bg-[#c9006b]"
              >
                New group
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {openGroups.map(group => {
                const copy = modeCopy(group);
                const myBalance = getMemberBalance(state, group.id, currentUser.id);
                const status = groupStatus(state, group, currentUser.id);
                const Icon = modeIcons[groupMode(group)];
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => onGoToGroup(group.id)}
                    className="group w-full rounded-[1.45rem] border border-black/5 bg-white p-4 text-left shadow-[0_8px_26px_rgba(20,20,24,0.04)] transition-transform active:scale-[0.99] dark:border-white/5 dark:bg-gray-900"
                    aria-label={`Open ${group.name}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff0f8] text-[#e6007a] dark:bg-[#e6007a]/15">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="truncate font-bold text-gray-950 dark:text-white">{group.name}</span>
                          <span className={`shrink-0 text-sm font-bold ${myBalance > 0 ? 'text-emerald-700 dark:text-emerald-300' : myBalance < 0 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-600 dark:text-gray-300'}`}>
                            {myBalance > 0 ? `Gets ${symbol}${myBalance.toFixed(2)}` : myBalance < 0 ? `Owes ${symbol}${Math.abs(myBalance).toFixed(2)}` : `${symbol}${getGroupTotal(state, group.id).toFixed(2)}`}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-600 dark:text-gray-300">{copy.label}</span>
                        <span className="mt-2 flex items-center justify-between gap-2 text-sm">
                          <span className="font-semibold text-gray-700 dark:text-gray-200">{status}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {presentation.prompt && (
          <section aria-labelledby="home-prompt-title" className="border-t border-gray-200 py-7 dark:border-gray-800">
            <p className="text-sm font-semibold text-[#c40068] dark:text-[#ff65b5]">{presentation.prompt.eyebrow}</p>
            <h2 id="home-prompt-title" className="mt-2 text-xl font-bold tracking-[-0.035em]">{presentation.prompt.title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{presentation.prompt.detail}</p>
            <button
              type="button"
              onClick={() => onGoToGroup(presentation.prompt!.groupId)}
              data-primary-action="true"
              className="mt-5 flex min-h-14 w-full items-center justify-center rounded-full bg-gray-950 px-6 text-base font-bold text-white shadow-sm transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-100"
            >
              {presentation.prompt.actionLabel}
            </button>
          </section>
        )}

        <section aria-labelledby="catch-shortcut-title" className="border-t border-gray-200 py-7 dark:border-gray-800">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#e6007a] shadow-sm dark:bg-gray-900">
              <Camera className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="catch-shortcut-title" className="font-bold tracking-[-0.02em]">Already paid for something?</h2>
              <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-300">Capture a receipt now and choose the group after you review it.</p>
              <button type="button" onClick={onScanReceipt} className="mt-3 min-h-11 text-sm font-bold text-[#c40068] hover:text-[#9f0056] dark:text-[#ff65b5] dark:hover:text-[#ff8ac8]">Scan a receipt</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function groupStatus(
  state: ReturnType<typeof useAppState>['state'],
  group: Group,
  currentUserId: string,
): string {
  const expenses = Object.values(state.expenses).filter(expense => expense.groupId === group.id);
  if (expenses.length === 0) return modeCopy(group).nextAction;
  const expenseIds = new Set(expenses.map(expense => expense.id));
  const splits = (Object.values(state.splits) as Split[]).filter(split => expenseIds.has(split.expenseId));
  const needsConfirmation = splits.some(split => (
    ['marked_paid', 'cleared'].includes(split.status)
    && state.expenses[split.expenseId]?.paidByUserId === currentUserId
  ));
  if (needsConfirmation) return 'Confirm what arrived';
  if (splits.every(split => split.status === 'confirmed')) return modeCopy(group).closeAction;
  if (splits.some(split => split.status === 'request_sent')) return 'Waiting on payment';
  if (splits.some(split => split.status === 'open')) return 'Request the shares';
  return modeCopy(group).nextAction;
}
