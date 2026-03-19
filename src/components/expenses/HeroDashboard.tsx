import { TrendingUp, TrendingDown, Plus, ArrowRight, Wallet, ExternalLink, Copy } from 'lucide-react';
import type { Suggestion } from '../../services/settlement/calc';
import type { PotHistory } from '../../types/app';
import { normalizeToPolkadot } from '../../services/chain/address';
import { formatCurrencyAmount } from '../../utils/currencyFormat';
import { copyWithToast } from '../../utils/clipboard';
import type { SettlementModalState } from '../../hooks/useSettleConfirm';

interface Member {
  id: string;
  name: string;
  address?: string;
  verified?: boolean;
}

interface BalanceEntry {
  member: Member;
  balance: number;
}

type OnchainSettlement = Extract<PotHistory, { type: 'onchain_settlement' }>;

interface HeroDashboardProps {
  netBalance: number;
  totalExpenses: number;
  totalOutstanding: number;
  budgetEnabled?: boolean;
  budget?: number;
  budgetPercentage: number;
  budgetRemaining: number;
  isOverBudget: boolean;
  balances: BalanceEntry[];
  settlementSuggestions: Suggestion[];
  settlementHistory: OnchainSettlement[];
  members: Member[];
  currentUserId: string;
  isCryptoPot: boolean;
  isUsdcPot: boolean;
  canSettle: boolean;
  isSending: boolean;
  formatPotAmount: (value: number, withSign?: boolean) => string;
  onAddExpense: () => void;
  onSettle: () => void;
  onOpenSettlementModal: (modal: SettlementModalState) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  accountStatus: string;
  accountAddress0: string | null;
}

export function HeroDashboard({
  netBalance,
  totalExpenses,
  totalOutstanding,
  budgetEnabled,
  budget,
  budgetPercentage,
  budgetRemaining,
  isOverBudget,
  balances,
  settlementSuggestions,
  settlementHistory,
  members,
  currentUserId,
  isCryptoPot,
  isUsdcPot,
  canSettle,
  isSending,
  formatPotAmount,
  onAddExpense,
  onSettle,
  onOpenSettlementModal,
  onShowToast,
  accountStatus,
  accountAddress0,
}: HeroDashboardProps) {
  const potTotalDisplay = formatPotAmount(totalExpenses);
  const outstandingDisplay = formatPotAmount(totalOutstanding);

  return (
    <div className="mx-3 mt-3">
      <div className="hero-card p-4 space-y-3">
        {/* Net Balance */}
        <div className="text-center pb-3 border-b border-border/50">
          <p className="text-caption text-secondary mb-1.5">Your net balance</p>
          <div className="flex items-center justify-center gap-2">
            {netBalance >= 0 ? (
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--success)' }} />
            ) : (
              <TrendingDown className="w-5 h-5" style={{ color: 'var(--ink)' }} />
            )}
            <p
              className="tabular-nums"
              style={{
                fontSize: '32px',
                fontWeight: 600,
                lineHeight: 1.2,
                color: netBalance >= 0 ? 'var(--success)' : 'var(--ink)',
              }}
            >
              {formatPotAmount(netBalance, true)}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 mt-2">
            <span className="text-caption text-secondary">
              {formatPotAmount(totalExpenses)} spent
            </span>
            {budgetEnabled && budget && (
              <>
                <span className="text-caption text-secondary">&bull;</span>
                <span className="text-caption text-secondary" style={{ color: isOverBudget ? 'var(--danger)' : undefined }}>
                  {isOverBudget ? `${formatPotAmount(totalExpenses - budget)} over` : `${formatPotAmount(budgetRemaining)} left`} of {formatPotAmount(budget)}
                </span>
              </>
            )}
          </div>

          {budgetEnabled && budget && (
            <div className="mt-2 h-1 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${budgetPercentage}%`,
                  background: isOverBudget ? 'var(--danger)' : 'var(--ink)',
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 pt-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/40 bg-muted/10 p-3 text-left">
              <p className="text-caption text-secondary mb-1">Total pot balance</p>
              <p className="text-xl font-semibold tabular-nums">{potTotalDisplay}</p>
              <p className="text-micro text-secondary mt-0.5">All expenses captured here</p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-muted/10 p-3 text-left">
              <p className="text-caption text-secondary mb-1">Still to settle</p>
              <p className="text-xl font-semibold tabular-nums">{outstandingDisplay}</p>
              <p className="text-micro text-secondary mt-0.5">Sum of members who are owed</p>
            </div>
          </div>
        </div>

        {balances.length > 0 && (
          <div className="space-y-1.5">
            {balances
              .sort((a, b) => b.balance - a.balance)
              .map(({ member, balance }) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.08)' }}>
                      <span className="text-caption text-foreground">{member.name[0]}</span>
                    </div>
                    <span className="text-label" style={{ fontWeight: 500 }}>{member.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-label tabular-nums" style={{ fontWeight: 500, color: balance > 0 ? 'var(--success)' : 'var(--ink)' }}>
                      {formatPotAmount(balance, true)}
                    </span>
                    <p className="text-caption text-secondary">
                      {balance > 0 ? 'owes you' : 'you owe'}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}

        <SettlementSuggestionsList
          suggestions={settlementSuggestions}
          members={members}
          currentUserId={currentUserId}
          isCryptoPot={isCryptoPot}
          isUsdcPot={isUsdcPot}
          isSending={isSending}
          formatPotAmount={formatPotAmount}
          onOpenSettlementModal={onOpenSettlementModal}
          accountStatus={accountStatus}
          accountAddress0={accountAddress0}
        />

        {isCryptoPot && settlementHistory.length > 0 && (
          <RecentSettlements
            history={settlementHistory}
            members={members}
            onShowToast={onShowToast}
          />
        )}

        <div className="flex gap-2 pt-2 items-center">
          <button
            onClick={onAddExpense}
            className="flex-1 py-3 rounded-[var(--r-lg)] transition-all active:scale-[0.98]"
            style={{ background: 'var(--accent)', color: '#fff', fontWeight: 600 }}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span className="text-body">Add Expense</span>
            </div>
          </button>
          {canSettle && (
            <button
              onClick={onSettle}
              className="flex-1 py-2.5 rounded-[var(--r-lg)] transition-all active:scale-[0.98] card hover:shadow-[var(--shadow-fab)]"
              style={{ color: 'var(--ink)' }}
            >
              <div className="flex items-center justify-center">
                <span className="text-body" style={{ fontWeight: 500 }}>Settle Up</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface SettlementSuggestionsListProps {
  suggestions: Suggestion[];
  members: Member[];
  currentUserId: string;
  isCryptoPot: boolean;
  isUsdcPot: boolean;
  isSending: boolean;
  formatPotAmount: (value: number, withSign?: boolean) => string;
  onOpenSettlementModal: (modal: SettlementModalState) => void;
  accountStatus: string;
  accountAddress0: string | null;
}

function SettlementSuggestionsList(props: SettlementSuggestionsListProps) {
  const { suggestions, members, currentUserId, isCryptoPot, isUsdcPot,
    isSending, formatPotAmount, onOpenSettlementModal, accountStatus, accountAddress0 } = props;
  if (suggestions.length === 0) return null;

  return (
    <div className="pt-3 border-t border-border/50">
      <p className="text-caption text-secondary mb-2">Suggested settlements</p>
      <div className="space-y-1.5">
        {suggestions.map((suggestion, idx) => {
          const fromMember = members.find(m => m.id === suggestion.from);
          const toMember = members.find(m => m.id === suggestion.to);
          if (!fromMember || !toMember) return null;

          const hasRecipientAddress = !!toMember.address;
          const fromMemberAddress = fromMember.address;

          const isCurrentUserSender = fromMember.id === currentUserId;
          const canSettleWithCrypto = isCryptoPot &&
            isCurrentUserSender &&
            hasRecipientAddress &&
            fromMemberAddress &&
            accountStatus === 'connected' &&
            accountAddress0 &&
            normalizeToPolkadot(fromMemberAddress) === accountAddress0;

          const displayAmount = formatPotAmount(suggestion.amount);

          return (
            <div
              key={idx}
              className={`flex items-center justify-between p-3 card rounded-lg card-hover-lift transition-shadow duration-200 ${
                !hasRecipientAddress ? 'opacity-60' : ''
              }`}
              title={!hasRecipientAddress ? `No wallet address on file for ${toMember.name}` : undefined}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-label truncate" style={{ fontWeight: 500 }}>
                  {fromMember.name}
                </span>
                <ArrowRight className="w-3 h-3 text-secondary flex-shrink-0" />
                <span className="text-label truncate" style={{ fontWeight: 500 }}>
                  {toMember.name}
                </span>
                {!hasRecipientAddress && (
                  <span className="text-micro text-secondary" title="No wallet address on file for this member">
                    (no address)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-label tabular-nums" style={{ fontWeight: 500 }}>
                  {displayAmount}
                </span>
                {canSettleWithCrypto && (
                  <button
                    onClick={() => {
                      onOpenSettlementModal({
                        fromMemberId: fromMember.id,
                        toMemberId: toMember.id,
                        fromAddress: normalizeToPolkadot(fromMemberAddress!),
                        toAddress: normalizeToPolkadot(toMember.address!),
                        fromName: fromMember.name,
                        toName: toMember.name,
                        ...(isUsdcPot
                          ? { amountUsdc: suggestion.amount }
                          : { amountDot: suggestion.amount }
                        ),
                      });
                    }}
                    className="px-2 py-1 rounded text-[10px] font-medium bg-accent text-white hover:opacity-90 transition-opacity flex items-center gap-1"
                    disabled={isSending}
                  >
                    <Wallet className="w-3 h-3" />
                    Settle with {isUsdcPot ? 'USDC' : 'DOT'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-caption text-secondary mt-2" style={{ fontSize: '10px' }}>
        {isCryptoPot
          ? `Settle directly on-chain with ${isUsdcPot ? 'USDC' : 'DOT'}. Minimal transfers to settle all balances.`
          : 'These are minimal transfers to settle all balances. Use "Settle Up" to initiate settlements.'
        }
      </p>
    </div>
  );
}

function RecentSettlements({
  history,
  members,
  onShowToast,
}: {
  history: OnchainSettlement[];
  members: Member[];
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}) {
  return (
    <div className="pt-3 border-t border-border/50">
      <p className="text-caption text-secondary mb-2">Recent settlements</p>
      <div className="space-y-1.5">
        {history.slice(0, 5).map((entry) => {
          const fromMember = members.find(m => m.id === entry.fromMemberId);
          const toMember = members.find(m => m.id === entry.toMemberId);
          const statusBadge = entry.status === 'finalized'
            ? { label: 'Finalized', color: 'var(--success)' }
            : entry.status === 'in_block'
            ? { label: 'In block', color: 'var(--accent)' }
            : { label: 'Failed', color: 'var(--danger)' };

          return (
            <div key={entry.id} className="flex items-center justify-between p-3 card rounded-lg card-hover-lift transition-shadow duration-200">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-label truncate" style={{ fontWeight: 500 }}>
                  {fromMember?.name || 'Unknown'}
                </span>
                <ArrowRight className="w-3 h-3 text-secondary flex-shrink-0" />
                <span className="text-label truncate" style={{ fontWeight: 500 }}>
                  {toMember?.name || 'Unknown'}
                </span>
                <span className="text-micro px-1.5 py-0.5 rounded" style={{
                  background: `${statusBadge.color}20`,
                  color: statusBadge.color,
                  fontWeight: 500,
                }}>
                  {statusBadge.label}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-label tabular-nums" style={{ fontWeight: 500 }}>
                  {entry.amountUsdc !== undefined
                    ? formatCurrencyAmount(parseFloat(entry.amountUsdc), 'USDC')
                    : formatCurrencyAmount(parseFloat(entry.amountDot || '0'), 'DOT')
                  }
                </span>
                {entry.status === 'finalized' && (
                  <a
                    href={entry.subscan}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="View on Subscan"
                  >
                    <ExternalLink className="w-3 h-3 text-secondary" />
                  </a>
                )}
                <button
                  onClick={async () => {
                    await copyWithToast(entry.txHash, 'Transaction hash copied', (msg) => onShowToast?.(msg, 'success'));
                  }}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Copy transaction hash"
                >
                  <Copy className="w-3 h-3 text-secondary" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

