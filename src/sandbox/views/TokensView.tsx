import { useState } from 'react';
import { Settings2, Copy, Check, Type, Layers } from 'lucide-react';

interface TokensViewProps {
    brandVariant: 'default' | 'polkadot-second-age';
}

const COLORS = [
    { name: 'Background', varName: '--bg', desc: 'App canvas' },
    { name: 'Card Material', varName: '--card', desc: 'Surfaces' },
    { name: 'Primary Text', varName: '--ink', desc: 'Standard text' },
    { name: 'Accent Pink', varName: '--accent', desc: 'Brand highlight' },
    { name: 'Success Green', varName: '--success', desc: 'Positive actions' },
    { name: 'Danger Red', varName: '--danger', desc: 'Destructive' },
    { name: 'Muted Hint', varName: '--muted', desc: 'Placeholders' },
    { name: 'Border Lines', varName: '--border', desc: 'Separators' },
];

const SHADOWS = [
    { name: 'Card Elevation', varName: '--shadow-card', desc: 'Standard cards, list rows', class: 'shadow-[var(--shadow-card)]' },
    { name: 'Floating Action', varName: '--shadow-fab', desc: 'Floating buttons, dropdowns', class: 'shadow-[var(--shadow-fab)]' },
    { name: 'Modal Reveal', varName: '--shadow-elev', desc: 'Dialogs, high overlays', class: 'shadow-[var(--shadow-elev)]' },
];

export function TokensView({ brandVariant }: TokensViewProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [customText, setCustomText] = useState("We've sent a notification to confirm this transaction.");

    const isPSA = brandVariant === 'polkadot-second-age';

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(`var(${text})`);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-16 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">

            {/* Header */}
            <div className="space-y-4 max-w-2xl">
                <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--ink)] to-[var(--ink)]/60 dark:to-white/60">
                    Design Tokens
                </h1>
                <p className="text-section text-[var(--muted)] leading-relaxed">
                    The foundational atoms of the design system. Click heavily on color variables to copy them to your clipboard as CSS variables (e.g., <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-sm">var(--bg)</code>).
                </p>
            </div>

            {/* Colors Utility */}
            <section className="space-y-8">
                <div className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 pb-4">
                    <div className="p-2 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg">
                        <Settings2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Semantic Colors</h2>
                        <p className="text-sm text-muted">Core application palette</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
                    {COLORS.map((color) => (
                        <button
                            key={color.varName}
                            onClick={() => copyToClipboard(color.varName, color.varName)}
                            className="group relative flex flex-col gap-3 p-3 rounded-2xl border border-transparent hover:border-black/5 dark:hover:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300 text-left w-full focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                        >
                            <div
                                className="h-24 w-full rounded-xl border border-black/10 dark:border-white/10 shadow-sm group-hover:shadow-md group-hover:scale-[1.02] transition-all duration-300 ease-out overflow-hidden relative"
                                style={{ backgroundColor: `var(${color.varName})` }}
                            >
                                {/* Copy Overlay */}
                                <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200 ${copiedId === color.varName ? 'opacity-100' : 'opacity-0'}`}>
                                    {copiedId === color.varName ? (
                                        <Check className="w-6 h-6 text-white" />
                                    ) : (
                                        <Copy className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </div>
                            </div>
                            <div className="px-1 flex-1">
                                <div className="flex items-center justify-between">
                                    <div className="text-body font-semibold text-[var(--ink)]">{color.name}</div>
                                </div>
                                <div className="text-micro text-[var(--muted)] font-mono tracking-wider mt-0.5">{color.varName}</div>
                                <div className="text-micro text-muted opacity-70 mt-1">{color.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* Typography Utility */}
            <section className="space-y-8">
                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                            <Type className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight">Typography Scaler</h2>
                            <p className="text-sm text-muted">Test custom text strings across the hierarchy</p>
                        </div>
                    </div>
                </div>

                {/* Live Input */}
                <div className="max-w-xl">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 block">Edit Preview Text</label>
                    <input
                        type="text"
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        className="w-full px-4 py-3 bg-card border border-border shadow-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                        placeholder="Type something to preview..."
                    />
                </div>

                <div className="bg-card dark:bg-[#1C1C1E] border border-border rounded-3xl p-8 shadow-sm space-y-10" style={isPSA ? { background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' } : undefined}>

                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-baseline border-b border-border/50 pb-6 group">
                        <div className="flex flex-col">
                            <span className="text-caption text-muted uppercase tracking-widest font-semibold font-mono">Screen Title</span>
                            <span className="text-micro text-muted mt-1 opacity-0 group-hover:opacity-100 transition-opacity">.text-screen-title</span>
                        </div>
                        <h1 className="text-screen-title text-[var(--ink)] break-words">{customText || 'Title'}</h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-baseline border-b border-border/50 pb-6 group">
                        <div className="flex flex-col">
                            <span className="text-caption text-muted uppercase tracking-widest font-semibold font-mono">Section Heading</span>
                            <span className="text-micro text-muted mt-1 opacity-0 group-hover:opacity-100 transition-opacity">.text-section</span>
                        </div>
                        <h2 className="text-section text-[var(--ink)] break-words">{customText || 'Heading'}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-baseline border-b border-border/50 pb-6 group">
                        <div className="flex flex-col">
                            <span className="text-caption text-muted uppercase tracking-widest font-semibold font-mono">Body / Primary</span>
                            <span className="text-micro text-muted mt-1 opacity-0 group-hover:opacity-100 transition-opacity">.text-body</span>
                        </div>
                        <p className="text-body text-[var(--ink)] break-words">{customText || 'Body text'}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-baseline border-b border-border/50 pb-6 group">
                        <div className="flex flex-col">
                            <span className="text-caption text-muted uppercase tracking-widest font-semibold font-mono">Label / Medium</span>
                            <span className="text-micro text-muted mt-1 opacity-0 group-hover:opacity-100 transition-opacity">.text-label</span>
                        </div>
                        <span className="text-label text-[var(--text-secondary)] break-words">{customText || 'Label'}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-baseline group">
                        <div className="flex flex-col">
                            <span className="text-caption text-muted uppercase tracking-widest font-semibold font-mono">Caption / Small</span>
                            <span className="text-micro text-muted mt-1 opacity-0 group-hover:opacity-100 transition-opacity">.text-caption</span>
                        </div>
                        <span className="text-caption text-[var(--muted)] break-words">{customText || 'Caption'}</span>
                    </div>
                </div>
            </section>

            {/* Shadows Utility */}
            <section className="space-y-8">
                <div className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 pb-4">
                    <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Elevation & Depth</h2>
                        <p className="text-sm text-muted">Standardized inset and drop shadows</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {SHADOWS.map((shadow) => (
                        <button
                            key={shadow.varName}
                            onClick={() => copyToClipboard(shadow.varName, shadow.varName)}
                            className="group text-left focus:outline-none"
                        >
                            <div className={`h-32 bg-card rounded-2xl flex items-center justify-center border border-transparent transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-2 relative overflow-hidden ${shadow.class} ${isPSA ? 'bg-white/10 backdrop-blur-md border-white/20' : ''}`}>

                                {/* Copy Overlay */}
                                <div className={`absolute inset-0 bg-black/10 dark:bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-200 ${copiedId === shadow.varName ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100`}>
                                    {copiedId === shadow.varName ? (
                                        <Check className="w-6 h-6 text-[var(--ink)] dark:text-white" />
                                    ) : (
                                        <div className="flex items-center gap-2 text-[var(--ink)] dark:text-white font-medium bg-black/5 dark:bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-md">
                                            <Copy className="w-4 h-4" /> Copy Var
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 px-2">
                                <div className="text-body font-semibold">{shadow.name}</div>
                                <div className="text-micro text-muted font-mono mt-1">{shadow.varName}</div>
                                <div className="text-xs text-muted mt-2 opacity-80">{shadow.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

        </div>
    );
}
