import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { triggerHaptic } from '../../utils/haptics';
import type { PSAStyleProps } from './section-props';
import { psaMouseHandlers } from './section-props';

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-micro">{label}</span>
      <button
        onClick={() => { triggerHaptic('light'); onChange(); }}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? 'bg-primary' : 'bg-switch-background'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export function NotificationSettingsSection(psa: PSAStyleProps) {
  const [open, setOpen] = useState(false);
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(true);
  const [settlement, setSettlement] = useState(true);
  const hover = psaMouseHandlers(psa);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          onClick={() => { triggerHaptic('light'); setOpen(!open); }}
          className={psa.isPSA
            ? `${psa.psaCardClass} w-full rounded-xl p-4 flex items-start justify-between transition-all duration-200 active:scale-[0.98]`
            : 'w-full card rounded-xl p-4 flex items-start justify-between hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]'}
          style={psa.isPSA ? psa.psaCardStyle : undefined}
          {...hover}
        >
          <div className="flex-1 text-left">
            <p className="text-label" style={{ fontWeight: 600 }}>Notifications</p>
            <p className="text-micro text-secondary mt-0.5">Manage your notification preferences</p>
          </div>
          {open ? <ChevronDown className="w-5 h-5 text-secondary flex-shrink-0 ml-2" /> : <ChevronRight className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 card rounded-xl p-4 space-y-3">
        <Toggle label="Push notifications" value={push} onChange={() => setPush(!push)} />
        <Toggle label="Email notifications" value={email} onChange={() => setEmail(!email)} />
        <Toggle label="Settlement reminders" value={settlement} onChange={() => setSettlement(!settlement)} />
      </CollapsibleContent>
    </Collapsible>
  );
}
