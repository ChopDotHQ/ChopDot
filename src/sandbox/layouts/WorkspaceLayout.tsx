import { ReactNode } from 'react';
import { Moon, Sun, Hexagon, Palette, Layers, BoxSelect, PanelsTopLeft } from 'lucide-react';

interface WorkspaceLayoutProps {
    children: ReactNode;
    theme: 'light' | 'dark';
    setTheme: (t: 'light' | 'dark') => void;
    brandVariant: 'default' | 'polkadot-second-age';
    setBrandVariant: (v: 'default' | 'polkadot-second-age') => void;
    activeTab: 'tokens' | 'components' | 'blueprints';
    setActiveTab: (t: 'tokens' | 'components' | 'blueprints') => void;
}

export function WorkspaceLayout({
    children,
    theme, setTheme,
    brandVariant, setBrandVariant,
    activeTab, setActiveTab
}: WorkspaceLayoutProps) {

    const isPSA = brandVariant === 'polkadot-second-age';

    const NavItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === id
                ? 'bg-black/5 dark:bg-white/10 text-[var(--ink)] font-semibold shadow-sm'
                : 'text-[var(--muted)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--ink)]'
                }`}
        >
            <Icon className={`w-5 h-5 ${activeTab === id ? 'text-[var(--accent)]' : ''}`} />
            <span>{label}</span>
        </button>
    );

    return (
        <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'dark bg-[#0a0a0a]' : 'bg-[#FAFAFA]'} text-foreground transition-colors duration-500 ease-out`}>

            {/* Sidebar Navigation */}
            <aside className="w-64 border-r border-black/5 dark:border-white/5 bg-card/50 backdrop-blur-xl flex flex-col z-20">
                <div className="p-6 flex items-center gap-3 border-b border-black/5 dark:border-white/5">
                    <div className="bg-gradient-to-br from-[var(--accent)] to-purple-600 p-2.5 rounded-xl shadow-[var(--shadow-elev)]">
                        <ComponentsTopLeftIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-body font-bold leading-none tracking-tight text-[var(--ink)]">UI/UX Workspace</h1>
                        <p className="text-micro text-muted font-medium mt-1">Design System v2</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <div className="px-2 pb-2 text-xs font-semibold text-muted uppercase tracking-widest mt-4 mb-2">Systems</div>
                    <NavItem id="tokens" label="Design Tokens" icon={Palette} />

                    <div className="px-2 pb-2 text-xs font-semibold text-muted uppercase tracking-widest mt-8 mb-2">Library</div>
                    <NavItem id="components" label="Base Components" icon={BoxSelect} />
                    <NavItem id="blueprints" label="Page Blueprints" icon={Layers} />
                </nav>

                <div className="p-6 border-t border-black/5 dark:border-white/5">
                    <div className="text-micro text-muted flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Workspace Active
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 relative">

                {/* Top Control Bar */}
                <header className="h-16 flex items-center justify-end px-6 border-b border-black/5 dark:border-white/5 bg-card/30 backdrop-blur-md z-10 supports-[backdrop-filter]:bg-background/20">
                    <div className="flex gap-4 items-center">

                        {/* Segmented Control - Brand Variant */}
                        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl shadow-inner border border-black/5 dark:border-white/5">
                            <button
                                onClick={() => setBrandVariant('default')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 ${brandVariant === 'default' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-black dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'}`}
                            >
                                <Hexagon className="w-4 h-4" />
                                Default iOS
                            </button>
                            <button
                                onClick={() => setBrandVariant('polkadot-second-age')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 ${brandVariant === 'polkadot-second-age' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-black dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'}`}
                            >
                                <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-[var(--accent)] to-orange-400" />
                                PSA Glass
                            </button>
                        </div>

                        {/* Segmented Control - Theme */}
                        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl shadow-inner border border-black/5 dark:border-white/5">
                            <button
                                onClick={() => setTheme('light')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 ${theme === 'light' ? 'bg-white shadow-sm text-black' : 'text-zinc-500 hover:text-black'}`}
                            >
                                <Sun className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 ${theme === 'dark' ? 'bg-[#2C2C2E] shadow-sm text-white' : 'text-zinc-500 hover:text-white'}`}
                            >
                                <Moon className="w-4 h-4" />
                            </button>
                        </div>

                    </div>
                </header>

                {/* Ambient PSA Backgrounds */}
                {isPSA && (
                    <div className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000 ease-in-out">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 mix-blend-overlay" />
                        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
                        <div className="absolute bottom-1/4 right-1/4 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[140px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
                    </div>
                )}

                {/* Viewport for Active Tab */}
                <main className="flex-1 overflow-y-auto z-10">
                    <div className="p-10 max-w-6xl mx-auto h-full">
                        {children}
                    </div>
                </main>

            </div>
        </div>
    );
}

// Just an alias to avoid naming collision with `Component` prop
const ComponentsTopLeftIcon = PanelsTopLeft;
