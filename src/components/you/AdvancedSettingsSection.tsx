import { useState } from 'react';
import { Code, Database, ChevronRight, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { triggerHaptic } from '../../utils/haptics';
import type { PSAStyleProps } from './section-props';
import { psaMouseHandlers } from './section-props';

export function AdvancedSettingsSection(psa: PSAStyleProps) {
  const [open, setOpen] = useState(false);
  const [developerMode, setDeveloperMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('chopdot_dev_mode') === '1';
  });
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
            <p className="text-label" style={{ fontWeight: 600 }}>Advanced</p>
            <p className="text-micro text-secondary mt-0.5">Developer features and app information</p>
          </div>
          {open ? <ChevronDown className="w-5 h-5 text-secondary flex-shrink-0 ml-2" /> : <ChevronRight className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent
        className={psa.isPSA ? `mt-2 ${psa.psaCardClass} rounded-xl p-4 space-y-2` : 'mt-2 card rounded-xl p-4 space-y-2'}
        style={psa.isPSA ? psa.psaCardStyle : undefined}
      >
        <button
          onClick={() => {
            triggerHaptic('light');
            const next = !developerMode;
            setDeveloperMode(next);
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('chopdot_dev_mode', next ? '1' : '0');
            }
          }}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left"
        >
          <Code className="w-4 h-4 text-secondary" />
          <span className="text-micro">Developer mode: {developerMode ? 'On' : 'Off'}</span>
        </button>
        <button
          onClick={() => {
            triggerHaptic('medium');
            if (typeof window === 'undefined') return;
            ['chopdot_pots', 'chopdot_pots_backup', 'chopdot_settlements', 'chopdot_notifications']
              .forEach((key) => window.localStorage.removeItem(key));
            window.location.reload();
          }}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left"
        >
          <Database className="w-4 h-4 text-secondary" />
          <span className="text-micro">Clear cache</span>
        </button>
        <div className="flex items-center justify-between p-2">
          <span className="text-micro text-secondary">App version</span>
          <span className="text-micro text-secondary">1.0.0</span>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
