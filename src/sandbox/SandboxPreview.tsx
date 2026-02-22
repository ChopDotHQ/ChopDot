interface SandboxPreviewProps {
    theme: 'light' | 'dark';
    brandVariant: 'default' | 'polkadot-second-age';
}

export function SandboxPreview({ theme, brandVariant }: SandboxPreviewProps) {

    // Custom mock hook values for usePSAStyle since we are running outside main app context
    const isPSA = brandVariant === 'polkadot-second-age';

    const psaStyles = {
        panel: {
            background: theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.2)',
            border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)'}`,
            backdropFilter: 'blur(16px) saturate(120%)',
            boxShadow: theme === 'dark'
                ? '0 10px 40px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.7), inset 0 -1px 20px rgba(255, 255, 255, 0.1)'
                : '0 10px 40px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.7), inset 0 -1px 20px rgba(255, 255, 255, 0.1)',
            borderRadius: '24px'
        },
        card: {
            background: theme === 'dark' ? 'rgba(28, 25, 23, 0.4)' : 'rgba(255, 255, 255, 0.5)',
            border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.4)'}`,
            borderRadius: '16px',
            boxShadow: theme === 'dark'
                ? '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 -1px 10px rgba(255, 255, 255, 0.08)'
                : '0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.7), inset 0 -1px 10px rgba(255, 255, 255, 0.15)',
        }
    };

    const ColorSwatch = ({ name, varName }: { name: string, varName: string }) => (
        <div className="flex flex-col gap-2">
            <div
                className="h-20 w-full rounded-xl border border-black/10 dark:border-white/10 shadow-sm"
                style={{ backgroundColor: `var(${varName})` }}
            />
            <div>
                <div className="text-label font-medium">{name}</div>
                <div className="text-micro text-muted font-mono">{varName}</div>
            </div>
        </div>
    );

    return (
        <div className="space-y-12">

            {/* Colors Section */}
            <section>
                <h2 className="text-section-heading mb-6 border-b pb-2">Primary Colors</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ColorSwatch name="Background" varName="--bg" />
                    <ColorSwatch name="Card Material" varName="--card" />
                    <ColorSwatch name="Primary Text (Ink)" varName="--ink" />
                    <ColorSwatch name="Pink Accent" varName="--accent" />
                    <ColorSwatch name="Success/Money" varName="--success" />
                    <ColorSwatch name="Danger/Error" varName="--danger" />
                    <ColorSwatch name="Muted/Hints" varName="--muted" />
                    <ColorSwatch name="Border" varName="--border" />
                </div>
            </section>

            {/* Typography Section */}
            <section>
                <h2 className="text-section-heading mb-6 border-b pb-2">Typography Setup</h2>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <span className="text-caption text-muted md:col-span-1">Screen Title (.text-screen-title)</span>
                        <div className="md:col-span-3">
                            <h1 className="text-screen-title">The quick brown fox jumps over the lazy dog</h1>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <span className="text-caption text-muted md:col-span-1">Section Heading (.text-section)</span>
                        <div className="md:col-span-3">
                            <h2 className="text-section">Sphinx of black quartz, judge my vow</h2>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <span className="text-caption text-muted md:col-span-1">Body Text (.text-body)</span>
                        <div className="md:col-span-3">
                            <p className="text-body">Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <span className="text-caption text-muted md:col-span-1">Label / Medium (.text-label)</span>
                        <div className="md:col-span-3">
                            <span className="text-label">Enter your wallet address here</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <span className="text-caption text-muted md:col-span-1">Caption / Small (.text-caption)</span>
                        <div className="md:col-span-3">
                            <span className="text-caption">This action cannot be undone. Please proceed with caution.</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Components Preview */}
            <section>
                <h2 className="text-section-heading mb-6 border-b pb-2">Functional Components</h2>

                <div className="grid md:grid-cols-2 gap-8">

                    {/* Main App Panel variant vs Default Card */}
                    <div className="space-y-4">
                        <h3 className="text-label text-muted">Main Panel / Container</h3>

                        <div
                            className={isPSA ? '' : 'bg-card rounded-2xl p-6 shadow-[var(--shadow-card)]'}
                            style={isPSA ? { ...psaStyles.panel, padding: '24px' } : undefined}
                        >
                            <h3 className="text-screen-title mb-2">Overview</h3>
                            <p className="text-body text-secondary mb-4">This is the default look for high-level main content areas.</p>

                            <div className="space-y-3">
                                {/* Nested cards simulating list items */}
                                <div
                                    className={isPSA ? '' : 'bg-card rounded-xl p-4 border border-border shadow-[var(--shadow-card)]'}
                                    style={isPSA ? { ...psaStyles.card, padding: '16px' } : undefined}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-body font-medium">Coffee</span>
                                        <span className="text-body text-[var(--danger)]">-$4.50</span>
                                    </div>
                                </div>

                                <div
                                    className={isPSA ? '' : 'bg-card rounded-xl p-4 border border-border shadow-[var(--shadow-card)]'}
                                    style={isPSA ? { ...psaStyles.card, padding: '16px' } : undefined}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-body font-medium">Dinner Refund</span>
                                        <span className="text-body text-[var(--success)]">+$25.00</span>
                                    </div>
                                </div>
                            </div>

                            <button className="mt-6 w-full py-3 px-4 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-[var(--shadow-fab)] flex justify-center items-center">
                                Primary Button
                            </button>
                        </div>
                    </div>

                    {/* Form/Inputs Preview */}
                    <div className="space-y-4">
                        <h3 className="text-label text-muted">Form Elements</h3>

                        <div
                            className={isPSA ? '' : 'bg-card rounded-2xl p-6 shadow-[var(--shadow-card)]'}
                            style={isPSA ? { ...psaStyles.panel, padding: '24px' } : undefined}
                        >
                            <form className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-label text-[var(--ink)] block">Email Address</label>
                                    <input
                                        type="email"
                                        placeholder="name@example.com"
                                        className="w-full px-4 py-3 bg-transparent border border-border text-[var(--ink)] placeholder-[var(--muted)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                                        style={isPSA ? { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)', borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' } : undefined}
                                    />
                                    <p className="text-micro text-muted">We'll never share your email with anyone else.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-label text-[var(--ink)] block">Password</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 bg-transparent border border-border text-[var(--ink)] placeholder-[var(--muted)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                                        style={isPSA ? { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)', borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' } : undefined}
                                    />
                                </div>

                                <div className="pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center justify-center w-5 h-5">
                                            <input type="checkbox" className="peer w-5 h-5 appearance-none rounded border border-border checked:bg-[var(--accent)] checked:border-[var(--accent)] transition-all cursor-pointer" />
                                            <svg className="absolute w-3 h-3 pointer-events-none text-white opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 14" fill="none">
                                                <path d="M3 8L6 11L11 3.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"></path>
                                            </svg>
                                        </div>
                                        <span className="text-body text-[var(--text-secondary)] select-none">Remember my details</span>
                                    </label>
                                </div>

                                <button
                                    type="button"
                                    className="w-full py-3 px-4 mt-2 bg-transparent text-[var(--ink)] border border-[var(--border)] font-medium rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all"
                                    style={isPSA ? { borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' } : undefined}
                                >
                                    Secondary Action
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}
