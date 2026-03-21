import { useState, useEffect } from 'react';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';
import { TokensView } from './views/TokensView';
import { ComponentsView } from './views/ComponentsView';
import { BlueprintsView } from './views/BlueprintsView';

export function SandboxApp() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [brandVariant, setBrandVariant] = useState<'default' | 'polkadot-second-age'>('polkadot-second-age');
    const [activeTab, setActiveTab] = useState<'tokens' | 'components' | 'blueprints'>('tokens');

    // Sync theme to document body
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
            root.style.colorScheme = 'dark';
        } else {
            root.classList.remove('dark');
            root.style.colorScheme = 'light';
        }
    }, [theme]);

    // Fix: Add explicit max-h-screen to the wrapper so WorkspaceLayout scrolling works natively
    return (
        <div className="max-h-screen h-screen w-full overflow-hidden">
            <WorkspaceLayout
                theme={theme}
                setTheme={setTheme}
                brandVariant={brandVariant}
                setBrandVariant={setBrandVariant}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            >
                {activeTab === 'tokens' && <TokensView brandVariant={brandVariant} />}
                {activeTab === 'components' && <ComponentsView />}
                {activeTab === 'blueprints' && <BlueprintsView theme={theme} brandVariant={brandVariant} />}
            </WorkspaceLayout>
        </div>
    );
}
