import {
  ArrowRight,
  Camera,
  ChevronRight,
  HeartHandshake,
  Landmark,
  Plane,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import {useAppState} from '../state/AppStateContext';
import {getGroupTotal, getMemberBalance} from '../state/store';
import type {Group, GroupMode, Split} from '../types';
import {getCurrencySymbol, getInitials} from '../utils';
import {PRODUCT_MODES, PRODUCT_MODE_ORDER, groupMode, modeCopy} from './productModes';

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
  onGoToStateProof: _onGoToStateProof,
  onStartGroup,
  onScanReceipt,
  onStartMode,
  onGoToGroup,
  onGoToProfile,
}: {
  onGoToStateProof: () => void;
  onStartGroup: () => void;
  onScanReceipt: () => void;
  onStartMode: (mode: GroupMode) => void;
  onGoToGroup: (groupId: string) => void;
  onGoToProfile: () => void;
}) {
  const {state} = useAppState();
  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;
  const symbol = getCurrencySymbol(state.currency);

  if (!currentUser) return null;

  const myGroups = (Object.values(state.groups) as Group[]).filter(group => group.memberIds.includes(currentUser.id));
  const openGroups = myGroups.filter(group => !group.closedRecordId);

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
        <section className="pb-8 pt-4" aria-labelledby="catch-title">
          <p className="text-sm font-semibold text-[#c40068] dark:text-[#ff65b5]">You paid. Catch it now.</p>
          <h1 id="catch-title" className="mt-2 max-w-[18rem] text-[2.45rem] font-bold leading-[1] tracking-[-0.06em]">Start with the receipt.</h1>
          <p className="mt-3 max-w-[19rem] text-[15px] leading-6 text-gray-600 dark:text-gray-300">Review the amount and people before anything reaches the group.</p>
          <button
            type="button"
            onClick={onScanReceipt}
            data-primary-action="true"
            className="mt-6 flex min-h-16 w-full items-center justify-center rounded-full bg-[#e6007a] px-6 text-lg font-bold text-white shadow-[0_14px_30px_rgba(230,0,122,0.22)] transition-colors hover:bg-[#c9006b]"
          >
            <Camera className="mr-2 h-5 w-5" aria-hidden="true" />
            Scan a receipt
          </button>
        </section>

        <section aria-labelledby="groups-title" className="border-t border-gray-200 py-7 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3">
            <h2 id="groups-title" className="text-lg font-bold tracking-[-0.03em]">Your groups</h2>
            <button type="button" onClick={onStartGroup} className="min-h-11 px-2 text-sm font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white">New group</button>
          </div>

          {openGroups.length === 0 ? (
            <div className="py-6 text-center">
              <Sparkles className="mx-auto h-7 w-7 text-[#e6007a]" aria-hidden="true" />
              <p className="mt-3 font-semibold">No group spending yet</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Scan first, or add the people now.</p>
              <button
                type="button"
                onClick={onStartGroup}
                className="mt-4 min-h-12 rounded-full border border-gray-300 bg-white px-6 text-sm font-semibold shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                Start with a group
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
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

        <section aria-labelledby="ways-title" className="border-t border-gray-200 py-7 dark:border-gray-800">
          <h2 id="ways-title" className="text-lg font-bold tracking-[-0.03em]">Start something together</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Same clear pay, confirm and save flow—shaped for the group.</p>
          <div className="mt-4 divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {PRODUCT_MODE_ORDER.map(mode => {
              const copy = PRODUCT_MODES[mode];
              const Icon = modeIcons[mode];
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onStartMode(mode)}
                  className="flex min-h-[4.4rem] w-full items-center gap-3 py-3 text-left"
                  aria-label={`Open ${copy.label}`}
                >
                  <Icon className="h-5 w-5 shrink-0 text-[#e6007a]" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-gray-950 dark:text-white">{copy.label}</span>
                    <span className="mt-0.5 block truncate text-sm text-gray-600 dark:text-gray-300">{copy.nextAction}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                </button>
              );
            })}
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
