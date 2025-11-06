import { useMemo, useState } from 'react';
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
  const [amount, setAmount] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [paidBy, setPaidBy] = useState<string>(currentUserId);
  const hasLast = !!(lastSplit && lastSplit.length > 0);
  void hasLast;
  // Participants to split between (defaults to all members)
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
      if (paidBy === id) setPaidBy(currentUserId);
    } else {
      next.add(id);
    }
    if (next.size === 0) next.add(currentUserId);
    setParticipantIds(next);
    if (splitType !== 'equal') {
      // Keep inputs visible only for selected members
      // No further action needed
    }
  };

  const amountNum = Number(amount);
  const totalPercent = members.reduce((sum, m) => sum + parseFloat(customPercents[m.id] || '0'), 0);
  const isSplitValid = splitType !== 'custom' || Math.abs(totalPercent - 100) < 0.01;
  // For DOT pots, allow smaller amounts (0.000001 DOT = 1 micro-DOT)
  // For USD pots, maintain minimum of 0.01
  const minAmount = baseCurrency === 'DOT' ? 0.000001 : 0.01;
  // Use >= instead of > to allow exactly minAmount, and handle floating point precision
  const isValid = amount.length > 0 && !Number.isNaN(amountNum) && amountNum >= minAmount - 0.0000001 && isSplitValid;

  // Use 6 decimals for DOT, 2 for other currencies
  const decimals = baseCurrency === 'DOT' ? 6 : 2;
  
  const computedSplit = useMemo(() => {
    if (!isValid) return [] as { memberId: string; amount: number }[];
    const participants = members.filter(m => participantIds.has(m.id));
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
    // shares
    const totalShares = participants.reduce((sum, p) => sum + parseInt(shares[p.id] || '0'), 0) || 1;
    return participants.map((m) => {
      const memberShares = parseInt(shares[m.id] || '0');
      return { memberId: m.id, amount: Number(((amountNum * memberShares) / totalShares).toFixed(decimals)) };
    });
  }, [amountNum, customPercents, isValid, members, participantIds, shares, splitType, decimals]);

  // Save CTA sublabel for context confirmation
  const sublabel = useMemo(() => {
    const payerName = members.find(m => m.id === paidBy)?.name || 'You';
    const count = Array.from(participantIds).length;
    const modeLabel = splitType === 'equal' ? 'Equal' : splitType === 'custom' ? 'Percent' : 'Shares';
    const memoPart = memo.trim().length > 0 ? ` • ${memo.trim()}` : '';
    return `${payerName === 'You' ? 'You' : payerName} pay • ${modeLabel} (${count})${memoPart}`;
  }, [members, paidBy, participantIds, splitType, memo]);

  // Previously we showed a detailed last split label; removed for cleaner UI

  // Quick picks removed for now until categories are shown

  const save = () => {
    if (!isValid) return;
          // Always use baseCurrency to ensure consistency
          onSave({
            amount: Number(amountNum.toFixed(decimals)),
            currency: baseCurrency, // Always use baseCurrency for consistency
            paidBy,
            memo: memo.trim(),
            date: new Date().toISOString(),
            split: computedSplit.length > 0 ? computedSplit : [{ memberId: currentUserId, amount: Number(amountNum.toFixed(decimals)) }],
            hasReceipt: false,
          });
    setAmount('');
    setMemo('');
    setPaidBy(currentUserId);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`Quick add (${baseCurrency})`}>
      <div className="space-y-4">
        {/* Amount first */}
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
                          // Round up to minimum if below threshold
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

        {/* Title/Memo */}
        <div>
          <label className="text-xs text-secondary mb-1 block">Title</label>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Optional"
            className="w-full px-2 py-2 input-field text-sm"
          />
        </div>

        {/* Split & details summary row */}
        {/* Two-column Paid by + Date */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-secondary mb-1 block">Paid by</label>
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="w-full px-2 py-2 input-field text-sm">
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.id === currentUserId ? 'You' : m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-secondary mb-1 block">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-2 py-2 input-field text-sm" />
          </div>
        </div>

        {/* Split control */}
        <div>
          <div className="text-caption text-secondary mb-1">Split mode</div>
          <div className="flex items-center gap-2">
            <button onClick={() => { triggerHaptic('selection'); setSplitType('equal'); }} className={`px-2 py-1 rounded-lg text-label transition-colors active:scale-95 ${splitType==='equal' ? 'border bg-transparent' : 'bg-secondary text-secondary'}`} style={splitType==='equal' ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}>Equal</button>
            <button onClick={() => { triggerHaptic('selection'); setSplitType('custom'); }} className={`px-2 py-1 rounded-lg text-label transition-colors active:scale-95 ${splitType==='custom' ? 'border bg-transparent' : 'bg-secondary text-secondary'}`} style={splitType==='custom' ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}>Custom %</button>
            <button onClick={() => { triggerHaptic('selection'); setSplitType('shares'); }} className={`px-2 py-1 rounded-lg text-label transition-colors active:scale-95 ${splitType==='shares' ? 'border bg-transparent' : 'bg-secondary text-secondary'}`} style={splitType==='shares' ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}>Shares</button>
          </div>
        </div>

        {/* Equal split list with checkboxes */}
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

        {/* Custom inputs for modes */}
        {splitType === 'custom' && (
          <div className="space-y-2">
            {members.filter(m=>participantIds.has(m.id)).map((m)=>{
              const percent = parseFloat(customPercents[m.id] || '0');
              const memberAmount = ((amountNum||0) * percent) / 100;
              return (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="flex-1 text-xs">{m.id===currentUserId?'You':m.name}</span>
                  <input value={customPercents[m.id]} onChange={(e)=> setCustomPercents({ ...customPercents, [m.id]: e.target.value })} type="number" placeholder="0" className="w-14 px-1.5 py-0.5 input-field text-xs text-right" />
                  <span className="text-xs text-secondary">%</span>
                  <span className="text-xs text-secondary tabular-nums w-14 text-right">{memberAmount.toFixed(decimals)}</span>
                </div>
              );
            })}
            <p className={`text-xs ${isSplitValid ? 'text-secondary' : 'text-destructive'}`}>Total: {totalPercent.toFixed(1)}% {!isSplitValid && '(must equal 100%)'}</p>
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
                  <input value={shares[m.id]} onChange={(e)=> setShares({ ...shares, [m.id]: e.target.value })} type="number" placeholder="1" className="w-14 px-1.5 py-0.5 input-field text-xs text-right" />
                  <span className="text-xs text-secondary">shares</span>
                  <span className="text-xs text-secondary tabular-nums w-14 text-right">{memberAmount.toFixed(decimals)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Memo field removed - using Title field above instead */}

        {/* Footer with full-width Save above nav bar */}
        <div className="pt-3 bg-card border-t border-border" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)', backdropFilter: 'blur(6px)' }}>
          <button disabled={!isValid} onClick={() => { triggerHaptic('success'); save(); }} className="w-full px-4 py-3 rounded-lg btn-accent disabled:opacity-40 active:scale-98 transition-transform">
            {isValid ? `Save ${baseCurrency} ${amountNum.toFixed(decimals)}` : 'Save'}
          </button>
          <div className="mt-1 text-center text-caption text-secondary">{sublabel}</div>
          <div className="flex justify-center mt-2">
            <button onClick={onClose} className="text-caption underline">Cancel</button>
          </div>
        </div>
        {/* Quick picks modal removed */}
      </div>
    </BottomSheet>
  );
}


