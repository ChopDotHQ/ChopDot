import { useEffect, useMemo, useState } from 'react';
import { triggerHaptic } from '../utils/haptics';
import { BottomSheet } from './BottomSheet';

type Member = { id: string; name: string };

interface QuickKeypadSheetProps {
  isOpen: boolean;
  onClose: () => void;
  baseCurrency: string;
  members: Member[];
  currentUserId: string;
  defaultMode?: 'equal' | 'last';
  lastSplit?: { memberId: string; amount: number }[];
  onSave: (data: {
    amount: number;
    currency: string;
    paidBy: string;
    memo: string;
    date: string;
    split: { memberId: string; amount: number }[];
    hasReceipt: boolean;
  }) => void;
}

export function QuickKeypadSheet({
  isOpen,
  onClose,
  baseCurrency,
  members,
  currentUserId,
  defaultMode: _defaultMode = 'equal',
  lastSplit,
  onSave,
}: QuickKeypadSheetProps) {
  const fallbackPayerId = useMemo(() => {
    if (members.some((member) => member.id === currentUserId)) {
      return currentUserId;
    }
    return members[0]?.id ?? currentUserId;
  }, [members, currentUserId]);

  const [amount, setAmount] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [paidBy, setPaidBy] = useState<string>(fallbackPayerId);
  const [didAttemptSave, setDidAttemptSave] = useState(false);
  const hasLast = !!(lastSplit && lastSplit.length > 0);
  void hasLast;
  const [participantIds, setParticipantIds] = useState<Set<string>>(new Set(members.map(m => m.id)));
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0] || '');
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'shares'>('equal');
  const [customPercents, setCustomPercents] = useState<Record<string, string>>(
    Object.fromEntries(members.map(m => [m.id, '0']))
  );
  const [shares, setShares] = useState<Record<string, string>>(
    Object.fromEntries(members.map(m => [m.id, '1']))
  );

  const toggleMember = (id: string) => {
    const next = new Set(participantIds);
    if (next.has(id)) {
      next.delete(id);
      if (paidBy === id) setPaidBy(fallbackPayerId);
    } else {
      next.add(id);
    }
    if (next.size === 0) next.add(fallbackPayerId);
    setParticipantIds(next);
    if (splitType !== 'equal') {
    }
  };

  const handleCustomPercentChange = (memberId: string, value: string) => {
    setCustomPercents(prev => ({ ...prev, [memberId]: value }));
  };

  const handleSharesChange = (memberId: string, value: string) => {
    setShares(prev => ({ ...prev, [memberId]: value }));
  };

  const amountNum = Number(amount);
  const participants = useMemo(() => members.filter((m) => participantIds.has(m.id)), [members, participantIds]);
  const totalPercent = participants.reduce((sum, m) => sum + parseFloat(customPercents[m.id] || '0'), 0);
  const isSplitValid = splitType !== 'custom' || Math.abs(totalPercent - 100) < 0.01;
  const minAmount = baseCurrency === 'DOT' ? 0.000001 : 0.01;
  const paidByValid = members.some((m) => m.id === paidBy);
  const memoValid = memo.trim().length > 0;
  const amountValid =
    amount.length > 0 &&
    !Number.isNaN(amountNum) &&
    amountNum >= minAmount - 0.0000001;
  const isValid =
    amountValid &&
    isSplitValid &&
    paidByValid &&
    memoValid;

  const decimals = baseCurrency === 'DOT' ? 6 : 2;
  
  const computedSplit = useMemo(() => {
    if (!isValid) return [] as { memberId: string; amount: number }[];
    if (splitType === 'equal') {
      const count = participants.length || 1;
      const per = Number((amountNum / count).toFixed(decimals));
      const remainder = Number((amountNum - per * (count - 1)).toFixed(decimals));
      return participants.map((m, idx) => ({ memberId: m.id, amount: idx === count - 1 ? remainder : per }));
    }
    if (splitType === 'custom') {
      return participants.map((m) => {
        const pct = parseFloat(customPercents[m.id] || '0');
        return { memberId: m.id, amount: Number(((amountNum * pct) / 100).toFixed(decimals)) };
      });
    }
    const totalShares = participants.reduce((sum, p) => sum + parseInt(shares[p.id] || '0'), 0) || 1;
    return participants.map((m) => {
      const memberShares = parseInt(shares[m.id] || '0');
      return { memberId: m.id, amount: Number(((amountNum * memberShares) / totalShares).toFixed(decimals)) };
    });
  }, [amountNum, customPercents, isValid, members, participantIds, shares, splitType, decimals]);

  const sublabel = useMemo(() => {
    const payerName = members.find(m => m.id === paidBy)?.name || 'You';
    const count = Array.from(participantIds).length;
    const modeLabel = splitType === 'equal' ? 'Equal' : splitType === 'custom' ? 'Percent' : 'Shares';
    const memoPart = memo.trim().length > 0 ? ` • ${memo.trim()}` : '';
    return `${payerName === 'You' ? 'You' : payerName} pay • ${modeLabel} (${count})${memoPart}`;
  }, [members, paidBy, participantIds, splitType, memo]);

  const save = () => {
    if (!isValid) {
      setDidAttemptSave(true);
      triggerHaptic('warning');
      return;
    }
    onSave({
      amount: Number(amountNum.toFixed(decimals)),
      currency: baseCurrency,
      paidBy,
      memo: memo.trim(),
      date,
      split: computedSplit.length > 0 ? computedSplit : [{ memberId: fallbackPayerId, amount: Number(amountNum.toFixed(decimals)) }],
      hasReceipt: false,
    });
    setAmount('');
    setMemo('');
    setPaidBy(fallbackPayerId);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setDidAttemptSave(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!members.some((m) => m.id === paidBy)) {
      setPaidBy(fallbackPayerId);
    }
  }, [fallbackPayerId, members, paidBy]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`Quick add (${baseCurrency})`}>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 mt-1">
          <label className="text-xs text-secondary">Amount</label>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1.5 rounded bg-secondary text-secondary text-label">{baseCurrency}</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
                      onBlur={() => {
                        const n = Number(amount);
                        if (!Number.isNaN(n) && n >= minAmount) {
                          setAmount(n.toFixed(decimals));
                        } else if (!Number.isNaN(n) && n > 0 && n < minAmount) {
                          setAmount(minAmount.toFixed(decimals));
                        }
                      }}
                      placeholder={baseCurrency === 'DOT' ? '0.000000' : '0.00'}
                      type="number"
                      step={baseCurrency === 'DOT' ? '0.000001' : '0.01'}
                      min={minAmount.toString()}
              className="flex-1 px-2 py-2 input-field tabular-nums"
              style={{ fontSize: '32px' }}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-secondary mb-1 block">Title</label>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Required"
            className="w-full px-2 py-2 input-field text-sm"
          />
          {didAttemptSave && !memoValid && (
            <div className="mt-1 text-xs text-destructive">Title is required.</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-secondary mb-1 block">Paid by</label>
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="w-full px-2 py-2 input-field text-sm">
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.id === currentUserId ? 'You' : m.name}</option>
              ))}
            </select>
            {didAttemptSave && !paidByValid && (
              <div className="mt-1 text-xs text-destructive">Select who paid.</div>
            )}
          </div>
          <div>
            <label className="text-xs text-secondary mb-1 block">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-2 py-2 input-field text-sm" />
          </div>
        </div>

        <div>
          <div className="text-caption text-secondary mb-1">Split mode</div>
          <div className="flex items-center gap-2">
            <button onClick={() => { triggerHaptic('selection'); setSplitType('equal'); }} className={`px-2 py-1 rounded-lg text-label transition-colors active:scale-95 ${splitType==='equal' ? 'border bg-transparent' : 'bg-secondary text-secondary'}`} style={splitType==='equal' ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}>Equal</button>
            <button onClick={() => { triggerHaptic('selection'); setSplitType('custom'); }} className={`px-2 py-1 rounded-lg text-label transition-colors active:scale-95 ${splitType==='custom' ? 'border bg-transparent' : 'bg-secondary text-secondary'}`} style={splitType==='custom' ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}>Custom %</button>
            <button onClick={() => { triggerHaptic('selection'); setSplitType('shares'); }} className={`px-2 py-1 rounded-lg text-label transition-colors active:scale-95 ${splitType==='shares' ? 'border bg-transparent' : 'bg-secondary text-secondary'}`} style={splitType==='shares' ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}>Shares</button>
          </div>
        </div>

        {splitType === 'equal' && (
          <div className="space-y-1">
            {members.map((m) => {
              const isIncluded = participantIds.has(m.id);
              const count = Array.from(participantIds).length || 1;
              const perPerson = isIncluded ? (amountNum || 0) / count : 0;
              return (
                <label key={m.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5" checked={isIncluded} onChange={() => toggleMember(m.id)} />
                  <span className="flex-1 text-xs">{m.id === currentUserId ? 'You' : m.name}</span>
                  {isIncluded && <span className="text-xs text-secondary tabular-nums">{perPerson.toFixed(decimals)}</span>}
                </label>
              );
            })}
          </div>
        )}

        {splitType === 'custom' && (
          <div className="space-y-2">
            {members.filter(m=>participantIds.has(m.id)).map((m)=>{
              const percent = parseFloat(customPercents[m.id] || '0');
              const memberAmount = ((amountNum||0) * percent) / 100;
              return (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="flex-1 text-xs">{m.id===currentUserId?'You':m.name}</span>
                  <input value={customPercents[m.id]} onChange={(e)=> handleCustomPercentChange(m.id, e.target.value)} type="number" placeholder="0" className="w-14 px-1.5 py-0.5 input-field text-xs text-right" />
                  <span className="text-xs text-secondary">%</span>
                  <span className="text-xs text-secondary tabular-nums w-14 text-right">{memberAmount.toFixed(decimals)}</span>
                </div>
              );
            })}
            <p className={`text-xs ${isSplitValid ? 'text-secondary' : 'text-destructive'}`}>Total: {totalPercent.toFixed(1)}% {!isSplitValid && '(must equal 100%)'}</p>
            {didAttemptSave && !isSplitValid && (
              <div className="text-xs text-destructive">Percent split must total 100%.</div>
            )}
          </div>
        )}
        {splitType === 'shares' && (
          <div className="space-y-2">
            {members.filter(m=>participantIds.has(m.id)).map((m)=>{
              const totalShares = members.filter(mm=>participantIds.has(mm.id)).reduce((sum, mm)=> sum + parseInt(shares[mm.id] || '0'), 0) || 1;
              const memberShares = parseInt(shares[m.id] || '0');
              const memberAmount = ((amountNum||0) * memberShares) / totalShares;
              return (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="flex-1 text-xs">{m.id===currentUserId?'You':m.name}</span>
                  <input value={shares[m.id]} onChange={(e)=> handleSharesChange(m.id, e.target.value)} type="number" placeholder="1" className="w-14 px-1.5 py-0.5 input-field text-xs text-right" />
                  <span className="text-xs text-secondary">shares</span>
                  <span className="text-xs text-secondary tabular-nums w-14 text-right">{memberAmount.toFixed(decimals)}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-3 bg-card border-t border-border" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)', backdropFilter: 'blur(6px)' }}>
          <button
            onClick={() => {
              if (isValid) {
                triggerHaptic('success');
              }
              save();
            }}
            className={`w-full px-4 py-3 rounded-lg btn-accent active:scale-98 transition-transform ${!isValid ? 'opacity-40' : ''}`}
          >
            {isValid ? `Save ${baseCurrency} ${amountNum.toFixed(decimals)}` : 'Save'}
          </button>
          {didAttemptSave && !amountValid && (
            <div className="mt-2 text-center text-xs text-destructive">
              {amount.length === 0
                ? 'Enter an amount.'
                : Number.isNaN(amountNum)
                  ? 'Amount must be a number.'
                  : `Minimum is ${minAmount.toFixed(decimals)} ${baseCurrency}.`}
            </div>
          )}
          <div className="mt-1 text-center text-caption text-secondary">{sublabel}</div>
          <div className="flex justify-center mt-2">
            <button onClick={onClose} className="text-caption underline">Cancel</button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
