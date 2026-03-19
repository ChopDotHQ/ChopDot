import { CreditCard, ArrowUpRight, ArrowDownLeft, ShieldCheck, Mail, Lock } from 'lucide-react';

interface BlueprintsViewProps {
    theme: 'light' | 'dark';
    brandVariant: 'default' | 'polkadot-second-age';
}

export function BlueprintsView({ theme, brandVariant }: BlueprintsViewProps) {
    const isPSA = brandVariant === 'polkadot-second-age';

    const psaStyles = {
        panel: {
            background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.4)',
            border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.4)'}`,
            backdropFilter: 'blur(24px) saturate(150%)',
            boxShadow: theme === 'dark'
                ? '0 20px 40px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.2), inset 0 -1px 20px rgba(255, 255, 255, 0.05)'
                : '0 20px 40px rgba(0, 0, 0, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.8), inset 0 -1px 20px rgba(255, 255, 255, 0.2)',
            borderRadius: '28px'
        },
        card: {
            background: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.6)',
            border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)'}`,
            borderRadius: '20px',
            backdropFilter: 'blur(12px)',
            boxShadow: theme === 'dark'
                ? '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
                : '0 8px 24px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
        }
    };

    return (
        <div className="space-y-16 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out z-10 relative">
            <div className="space-y-4 max-w-2xl">
                <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--ink)] to-[var(--ink)]/60 dark:to-white/60">
                    Page Blueprints
                </h1>
                <p className="text-section text-[var(--muted)] leading-relaxed">
                    High-fidelity layouts and mockups demonstrating how the Base Components compose together to create full pages.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-10">

                {/* Main App Panel variant vs Default Card */}
                <div className="space-y-4">
                    <h3 className="text-label text-[var(--muted)] pl-2">Dashboard Panel (Hover active)</h3>

                    <div
                        className={`group transition-all duration-500 ease-out ${isPSA ? 'hover:-translate-y-1' : 'bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 border border-black/5 dark:border-white/10 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elev)]'}`}
                        style={isPSA ? { ...psaStyles.panel, padding: '32px' } : undefined}
                    >
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-screen-title mb-1">Activity Feed</h3>
                                <p className="text-body text-[var(--text-secondary)]">Your recent group expenses.</p>
                            </div>
                            <div className="p-3 bg-[var(--accent)]/10 text-[var(--accent)] rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                                <CreditCard className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Transaction Cards */}
                            <div
                                className={`flex items-center justify-between p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${isPSA ? '' : 'bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/10 shadow-sm hover:shadow-md'}`}
                                style={isPSA ? { ...psaStyles.card, padding: '16px' } : undefined}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-[var(--danger)]/10 text-[var(--danger)] rounded-xl">
                                        <ArrowUpRight className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-body font-semibold">Dinner at Noma</div>
                                        <div className="text-caption text-[var(--muted)]">Paid by Alice</div>
                                    </div>
                                </div>
                                <span className="text-body font-bold text-[var(--danger)]">-$125.00</span>
                            </div>

                            <div
                                className={`flex items-center justify-between p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${isPSA ? '' : 'bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/10 shadow-sm hover:shadow-md'}`}
                                style={isPSA ? { ...psaStyles.card, padding: '16px' } : undefined}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-[var(--success)]/10 text-[var(--success)] rounded-xl">
                                        <ArrowDownLeft className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-body font-semibold">Uber Split</div>
                                        <div className="text-caption text-[var(--muted)]">From Bob</div>
                                    </div>
                                </div>
                                <span className="text-body font-bold text-[var(--success)]">+$15.50</span>
                            </div>
                        </div>

                        <button className="mt-8 relative overflow-hidden w-full py-4 bg-[var(--ink)] text-[var(--bg)] font-semibold rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-[var(--shadow-elev)] flex justify-center items-center gap-2 group/btn hover:bg-[var(--ink)]/90">
                            <span className="relative z-10">View All Activity</span>
                            <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover/btn:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
                        </button>
                    </div>
                </div>

                {/* Form/Inputs Preview */}
                <div className="space-y-4">
                    <h3 className="text-label text-[var(--muted)] pl-2">Authentication Form</h3>

                    <div
                        className={isPSA ? '' : 'bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 border border-black/5 dark:border-white/10 shadow-[var(--shadow-card)]'}
                        style={isPSA ? { ...psaStyles.panel, padding: '32px' } : undefined}
                    >
                        <div className="text-center mb-8">
                            <div className="inline-flex p-4 rounded-full bg-[var(--success)]/10 text-[var(--success)] mb-4">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold tracking-tight">Secure Login</h3>
                            <p className="text-body text-[var(--muted)] mt-2">Access your end-to-end encrypted pots.</p>
                        </div>

                        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                            <div className="space-y-2">
                                <label className="text-label text-[var(--ink)] font-medium block">Email Address</label>
                                <div className="relative group/input">
                                    <div
                                        className="absolute inset-y-0 flex items-center pointer-events-none text-[var(--muted)] group-focus-within/input:text-[var(--accent)] transition-colors"
                                        style={{ left: '1.25rem' }}
                                    >
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="alice@wonderland.com"
                                        className="w-full pr-4 py-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[var(--ink)] placeholder-[var(--muted)]/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:bg-transparent backdrop-blur-sm transition-all duration-300"
                                        style={{ paddingLeft: '3.5rem' }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-label text-[var(--ink)] font-medium block">Password</label>
                                    <a href="#" className="text-caption text-[var(--accent)] font-medium hover:underline">Forgot?</a>
                                </div>
                                <div className="relative group/input">
                                    <div
                                        className="absolute inset-y-0 flex items-center pointer-events-none text-[var(--muted)] group-focus-within/input:text-[var(--accent)] transition-colors"
                                        style={{ left: '1.25rem' }}
                                    >
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full pr-4 py-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[var(--ink)] placeholder-[var(--muted)]/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:bg-transparent backdrop-blur-sm transition-all duration-300"
                                        style={{ paddingLeft: '3.5rem' }}
                                    />
                                </div>
                            </div>

                            <div className="pt-2 pb-4">
                                <label className="flex items-center gap-3 cursor-pointer group/check w-fit">
                                    <div className="relative flex items-center justify-center w-6 h-6">
                                        <input type="checkbox" className="peer w-6 h-6 appearance-none rounded-lg border border-black/20 dark:border-white/20 checked:bg-[var(--accent)] checked:border-[var(--accent)] transition-all cursor-pointer group-hover/check:border-[var(--accent)]/50" />
                                        <svg className="absolute w-3.5 h-3.5 pointer-events-none text-white opacity-0 peer-checked:opacity-100 transition-opacity scale-50 peer-checked:scale-100 duration-200" viewBox="0 0 14 14" fill="none">
                                            <path d="M3 8L6 11L11 3.5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"></path>
                                        </svg>
                                    </div>
                                    <span className="text-body font-medium text-[var(--text-secondary)] select-none">Remember this device</span>
                                </label>
                            </div>

                            <button
                                type="button"
                                className="relative overflow-hidden w-full py-4 bg-[var(--accent)] text-white font-semibold rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-[var(--shadow-fab)] flex justify-center items-center gap-2 group/btn hover:-translate-y-0.5"
                            >
                                <span className="relative z-10">Sign In</span>
                                <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover/btn:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
