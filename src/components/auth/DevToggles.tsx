import type { PanelMode } from './SignInThemes';

type ViewModeOption = 'auto' | 'desktop' | 'mobile';

export const ViewModeToggle = ({
  value,
  onChange,
  resolvedView,
  mode,
}: {
  value: ViewModeOption;
  onChange: (value: ViewModeOption) => void;
  resolvedView: 'desktop' | 'mobile';
  mode: PanelMode;
}) => {
  const options: { id: ViewModeOption; label: string }[] = [
    { id: 'auto', label: `Auto (${resolvedView})` },
    { id: 'desktop', label: 'Desktop' },
    { id: 'mobile', label: 'Mobile' },
  ];
  const isDark = mode === 'dark';

  return (
    <div className="fixed top-4 right-4 z-[80]">
      <div className={`flex items-center gap-2 rounded-full border ${isDark ? 'border-white/20 bg-black/60 text-white' : 'border-black/20 bg-white/90 text-black'} px-3 py-2 shadow-lg backdrop-blur-lg`}>
        <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${isDark ? 'text-white/70' : 'text-black/70'}`}>Login view</span>
        <div className={`flex rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'} p-0.5`}>
          {options.map((option) => {
            const isActive = value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange(option.id)}
                className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${
                  isActive
                    ? (isDark ? 'bg-white text-black' : 'bg-black text-white')
                    : (isDark ? 'text-white/70 hover:text-white' : 'text-black/70 hover:text-black')
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const LoginVariantToggle = ({
  value,
  onChange,
  mode,
}: {
  value: 'default' | 'polkadot-second-age-glass';
  onChange: (value: 'default' | 'polkadot-second-age-glass') => void;
  mode: PanelMode;
}) => {
  const isDark = mode === 'dark';
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] pointer-events-auto">
      <div className={`flex items-center gap-2 rounded-full border ${isDark ? 'border-white/20 bg-black/60 text-white' : 'border-black/20 bg-white/90 text-black'} px-3 py-2 shadow-lg backdrop-blur-lg`}>
        <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${isDark ? 'text-white/70' : 'text-black/70'}`}>Style</span>
        <div className="flex rounded-full bg-muted/50 p-0.5">
          <button
            type="button"
            onClick={(event) => { event.preventDefault(); event.stopPropagation(); onChange('default'); }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              value === 'default'
                ? (isDark ? 'bg-white/20 text-white' : 'bg-black/10 text-black')
                : (isDark ? 'text-white/60' : 'text-black/60')
            }`}
          >
            Default
          </button>
          <button
            type="button"
            onClick={(event) => { event.preventDefault(); event.stopPropagation(); onChange('polkadot-second-age-glass'); }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              value === 'polkadot-second-age-glass'
                ? (isDark ? 'bg-white/20 text-white' : 'bg-black/10 text-black')
                : (isDark ? 'text-white/60' : 'text-black/60')
            }`}
          >
            PSA Glass
          </button>
        </div>
      </div>
    </div>
  );
};

export const WalletConnectModalToggle = ({
  enabled,
  onChange,
  mode,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  mode: PanelMode;
}) => {
  const isDark = mode === 'dark';
  return (
    <div className="fixed top-4 left-4 z-[80]">
      <div className={`flex items-center gap-2 rounded-full border ${isDark ? 'border-white/20 bg-black/60 text-white' : 'border-black/20 bg-white/90 text-black'} px-3 py-2 shadow-lg backdrop-blur-lg`}>
        <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${isDark ? 'text-white/70' : 'text-black/70'}`}>WC Modal</span>
        <div className={`flex rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'} p-0.5`}>
          <button
            type="button"
            onClick={() => {
              const newValue = !enabled;
              onChange(newValue);
              localStorage.setItem('chopdot.wcModal.enabled', String(newValue));
            }}
            className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${
              enabled
                ? (isDark ? 'bg-white text-black' : 'bg-black text-white')
                : (isDark ? 'text-white/70 hover:text-white' : 'text-black/70 hover:text-black')
            }`}
          >
            {enabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
};
