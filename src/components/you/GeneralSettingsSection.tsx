import { useState } from 'react';
import { Globe, Languages, Palette, ChevronRight, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { triggerHaptic } from '../../utils/haptics';
import type { Theme } from '../../utils/useTheme';
import type { PSAStyleProps } from './section-props';
import { psaMouseHandlers } from './section-props';

interface GeneralSettingsSectionProps extends PSAStyleProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  brandVariant: string;
  setBrandVariant: (variant: 'default' | 'polkadot-second-age') => void;
}

export function GeneralSettingsSection({
  theme,
  onThemeChange,
  brandVariant,
  setBrandVariant,
  ...psa
}: GeneralSettingsSectionProps) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('English');
  const hover = psaMouseHandlers(psa);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          onClick={() => { triggerHaptic('light'); setOpen(!open); }}
          className={psa.isPSA
            ? `w-full ${psa.psaCardClass} rounded-xl p-4 flex items-start justify-between transition-all duration-200 active:scale-[0.98]`
            : 'w-full card rounded-xl p-4 flex items-start justify-between hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]'}
          style={psa.isPSA ? psa.psaCardStyle : undefined}
          {...hover}
        >
          <div className="flex-1 text-left">
            <p className="text-label" style={{ fontWeight: 600 }}>General</p>
            <p className="text-micro text-secondary mt-0.5">Currency, language and appearance</p>
          </div>
          {open ? <ChevronDown className="w-5 h-5 text-secondary flex-shrink-0 ml-2" /> : <ChevronRight className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent
        className={psa.isPSA ? `mt-2 ${psa.psaCardClass} rounded-xl p-4 space-y-3` : 'mt-2 card rounded-xl p-4 space-y-3'}
        style={psa.isPSA ? psa.psaCardStyle : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-secondary" />
            <span className="text-micro">Currency</span>
          </div>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="text-micro bg-transparent text-secondary">
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="DOT">DOT</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Languages className="w-4 h-4 text-secondary" />
            <span className="text-micro">Language</span>
          </div>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="text-micro bg-transparent text-secondary">
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="German">German</option>
          </select>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-3">
            <Palette className="w-4 h-4 text-secondary" />
            <span className="text-micro">Appearance</span>
          </div>
          <div className="p-1 bg-secondary/50 dark:bg-secondary/30 rounded-lg flex gap-1">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { triggerHaptic('light'); onThemeChange(t); }}
                className={`flex-1 py-1.5 px-2 text-micro rounded-md transition-all duration-200 ${theme === t ? 'bg-card shadow-sm text-foreground' : 'text-secondary'}`}
              >
                {t === 'system' ? 'Auto' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-3">
            <Palette className="w-4 h-4 text-secondary" />
            <span className="text-micro">Style Variant</span>
          </div>
          <div className="p-1 bg-secondary/50 dark:bg-secondary/30 rounded-lg flex gap-1">
            <button
              onClick={() => { triggerHaptic('light'); setBrandVariant('default'); }}
              className={`flex-1 py-1.5 px-2 text-micro rounded-md transition-all duration-200 ${brandVariant === 'default' ? 'bg-card shadow-sm text-foreground' : 'text-secondary'}`}
            >
              Default
            </button>
            <button
              onClick={() => { triggerHaptic('light'); setBrandVariant('polkadot-second-age'); }}
              className={`flex-1 py-1.5 px-2 text-micro rounded-md transition-all duration-200 ${brandVariant === 'polkadot-second-age' ? 'bg-card shadow-sm text-foreground' : 'text-secondary'}`}
            >
              PSA Glass
            </button>
          </div>
          {brandVariant === 'polkadot-second-age' && (
            <p className="text-micro text-secondary px-1">Polkadot Second Age glassmorphism style</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
