import { useState } from 'react';
import { MousePointerClick, Layout, TextCursorInput, Mail } from 'lucide-react';

export function ComponentsView() {
    // Button State
    const [btnVariant, setBtnVariant] = useState<'default' | 'primary' | 'accent'>('primary');
    const [btnState, setBtnState] = useState<'default' | 'loading' | 'disabled'>('default');

    // Card State
    const [cardPadding, setCardPadding] = useState<'p-4' | 'p-8'>('p-8');

    // Input State
    const [inputState, setInputState] = useState<'default' | 'focus' | 'error' | 'success'>('default');

    return (
        <div className="space-y-16 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">

            {/* Header */}
            <div className="space-y-4 max-w-2xl">
                <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--ink)] to-[var(--ink)]/60 dark:to-white/60">
                    Component Playgrounds
                </h1>
                <p className="text-section text-[var(--muted)] leading-relaxed">
                    Test the interactive behaviors, paddings, and conditional states of base UI components before utilizing them in complex blueprints.
                </p>
            </div>

            {/* Button Playground */}
            <section className="space-y-8">
                <div className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 pb-4">
                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                        <MousePointerClick className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Interactive Buttons</h2>
                        <p className="text-sm text-muted">Core action triggers with ripple and hover states</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-[300px_1fr] gap-8 max-w-5xl">
                    {/* Controls */}
                    <div className="space-y-6 p-6 rounded-2xl border border-border bg-black/5 dark:bg-white/5">
                        <div className="space-y-3">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Variant</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setBtnVariant('default')}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${btnVariant === 'default' ? 'bg-white dark:bg-black shadow-sm text-[var(--ink)]' : 'hover:bg-black/10 dark:hover:bg-white/10 text-muted'}`}
                                >Default</button>
                                <button
                                    onClick={() => setBtnVariant('primary')}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${btnVariant === 'primary' ? 'bg-white dark:bg-black shadow-sm text-[var(--ink)]' : 'hover:bg-black/10 dark:hover:bg-white/10 text-muted'}`}
                                >Primary</button>
                                <button
                                    onClick={() => setBtnVariant('accent')}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${btnVariant === 'accent' ? 'bg-white dark:bg-black shadow-sm text-[var(--ink)]' : 'hover:bg-black/10 dark:hover:bg-white/10 text-muted'}`}
                                >Accent</button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted">State</label>
                            <select
                                value={btnState}
                                onChange={(e) => setBtnState(e.target.value as any)}
                                className="w-full p-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                            >
                                <option value="default">Default</option>
                                <option value="loading">Loading</option>
                                <option value="disabled">Disabled</option>
                            </select>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="bg-card rounded-3xl border border-border shadow-[var(--shadow-card)] p-12 flex items-center justify-center relative overflow-hidden">

                        {/* The Component Under Test */}
                        <button
                            disabled={btnState === 'disabled' || btnState === 'loading'}
                            className={`
                  relative overflow-hidden w-full max-w-xs py-4 font-semibold rounded-2xl transition-all duration-300 flex justify-center items-center gap-2 group/btn
                  ${btnVariant === 'primary'
                                    ? 'bg-[var(--ink)] text-[var(--bg)] shadow-[var(--shadow-elev)] hover:bg-[var(--ink)]/90'
                                    : btnVariant === 'accent'
                                        ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30 hover:shadow-[var(--accent)]/40 hover:-translate-y-0.5'
                                        : 'bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[var(--ink)] hover:bg-black/10 dark:hover:bg-white/10 shadow-sm'
                                }
                  ${btnState === 'disabled' ? 'opacity-50 cursor-not-allowed grayscale' : 'active:scale-[0.98] cursor-pointer'}
                `}
                        >
                            <span className={`relative z-10 flex items-center gap-2 ${btnState === 'loading' ? 'opacity-0' : 'opacity-100'}`}>
                                Execute Action
                            </span>

                            {btnState === 'loading' && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                </div>
                            )}

                            {btnState !== 'disabled' && btnState !== 'loading' && (
                                <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover/btn:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
                            )}
                        </button>
                    </div>
                </div>
            </section>

            {/* Cards Playground */}
            <section className="space-y-8">
                <div className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 pb-4">
                    <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                        <Layout className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Flexible Cards</h2>
                        <p className="text-sm text-muted">Surface materials, padding, and borders</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-[300px_1fr] gap-8 max-w-5xl">
                    {/* Controls */}
                    <div className="space-y-6 p-6 rounded-2xl border border-border bg-black/5 dark:bg-white/5">
                        <div className="space-y-3">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Padding Scale</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCardPadding('p-4')}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${cardPadding === 'p-4' ? 'bg-white dark:bg-black shadow-sm text-[var(--ink)]' : 'hover:bg-black/10 dark:hover:bg-white/10 text-muted'}`}
                                >Compact (p-4)</button>
                                <button
                                    onClick={() => setCardPadding('p-8')}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${cardPadding === 'p-8' ? 'bg-white dark:bg-black shadow-sm text-[var(--ink)]' : 'hover:bg-black/10 dark:hover:bg-white/10 text-muted'}`}
                                >Relaxed (p-8)</button>
                            </div>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="bg-black/5 dark:bg-white/5 rounded-3xl border border-border p-8 flex items-center justify-center relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] dark:opacity-80">

                        {/* The Component Under Test */}
                        <div className={`
                bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/10 shadow-[var(--shadow-card)] transition-all duration-300 ease-in-out w-full max-w-sm
                ${cardPadding}
             `}>
                            <div className="h-32 bg-black/5 dark:bg-white/5 rounded-xl mb-4 border border-black/5 flex items-center justify-center">
                                <span className="text-muted text-sm font-medium">Image Slot</span>
                            </div>
                            <h3 className="text-section font-semibold text-[var(--ink)]">Asset Portfolio</h3>
                            <p className="text-body text-[var(--muted)] mt-1 line-clamp-2">This card dynamically adjusts its internal layout breathing room based on the active padding token applied from the controls.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Inputs Playground */}
            <section className="space-y-8">
                <div className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 pb-4">
                    <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
                        <TextCursorInput className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Form Inputs</h2>
                        <p className="text-sm text-muted">Text fields with integrated validation states</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-[300px_1fr] gap-8 max-w-5xl">
                    {/* Controls */}
                    <div className="space-y-6 p-6 rounded-2xl border border-border bg-black/5 dark:bg-white/5">
                        <div className="space-y-3">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Validation State</label>
                            <select
                                value={inputState}
                                onChange={(e) => setInputState(e.target.value as any)}
                                className="w-full p-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                            >
                                <option value="default">Default / Unfocused</option>
                                <option value="focus">Focused (Active)</option>
                                <option value="success">Success / Validated</option>
                                <option value="error">Error / Invalid</option>
                            </select>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl border border-black/5 dark:border-white/10 shadow-[var(--shadow-card)] p-12 flex items-center justify-center">

                        {/* The Component Under Test */}
                        <div className="w-full max-w-sm space-y-2">
                            <label className="text-label text-[var(--ink)] font-medium block">Secure Email</label>
                            <div className="relative group/input">
                                <div
                                    className={`absolute inset-y-0 flex items-center pointer-events-none transition-colors duration-300
                    ${inputState === 'default' ? 'text-[var(--muted)]' : ''}
                    ${inputState === 'focus' ? 'text-[var(--accent)]' : ''}
                    ${inputState === 'success' ? 'text-[var(--success)]' : ''}
                    ${inputState === 'error' ? 'text-[var(--danger)]' : ''}
                 `}
                                    style={{ left: '1.25rem' }}
                                >
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    type="email"
                                    value="alice@wonderland.com"
                                    readOnly
                                    className={`
                     w-full pr-4 py-4 rounded-2xl bg-black/5 dark:bg-white/5 text-[var(--ink)] placeholder-[var(--muted)]/50 transition-all duration-300 outline-none
                     ${inputState === 'default' ? 'border border-black/10 dark:border-white/10' : ''}
                     ${inputState === 'focus' ? 'border-transparent ring-2 ring-[var(--accent)] bg-transparent' : ''}
                     ${inputState === 'success' ? 'border-transparent ring-2 ring-[var(--success)] bg-[var(--success)]/5' : ''}
                     ${inputState === 'error' ? 'border-transparent ring-2 ring-[var(--danger)] bg-[var(--danger)]/5 text-[var(--danger)]' : ''}
                   `}
                                    style={{ paddingLeft: '3.5rem' }}
                                />

                                {/* State Message */}
                                <div className="h-6 mt-1 flex items-end">
                                    {inputState === 'error' && <span className="text-micro text-[var(--danger)] font-medium animate-in slide-in-from-top-1">Invalid email format detected.</span>}
                                    {inputState === 'success' && <span className="text-micro text-[var(--success)] font-medium animate-in slide-in-from-top-1">Email address verified.</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}
