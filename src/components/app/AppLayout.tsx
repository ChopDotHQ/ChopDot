/**
 * AppLayout - Composes SwipeableScreen, BottomTabBar, and AppOverlays.
 * Extracted from App.tsx to reduce orchestration complexity.
 */

import type { ReactNode } from 'react';
import { SwipeableScreen } from '../SwipeableScreen';
import { BottomTabBar } from '../BottomTabBar';
import { AppOverlays } from './AppOverlays';
import type { LucideIcon } from 'lucide-react';

export interface AppLayoutTabBarProps {
  activeTab: 'pots' | 'people' | 'activity' | 'you';
  onTabChange: (tab: 'pots' | 'people' | 'activity' | 'you') => void;
  fabAction: () => void;
  fabVisible: boolean;
  fabIcon: LucideIcon;
  fabColor: string;
}

export interface AppLayoutProps {
  children: ReactNode;
  onSwipeBack?: () => void;
  screenKey: string;
  showTabBar: boolean;
  tabBar: AppLayoutTabBarProps;
  overlayProps: React.ComponentProps<typeof AppOverlays>;
}

export function AppLayout({
  children,
  onSwipeBack,
  screenKey,
  showTabBar,
  tabBar,
  overlayProps,
}: AppLayoutProps) {
  return (
    <>
      <SwipeableScreen onSwipeBack={onSwipeBack} key={screenKey}>
        {children}
      </SwipeableScreen>

      {showTabBar && (
        <BottomTabBar
          activeTab={tabBar.activeTab}
          onTabChange={tabBar.onTabChange}
          onFabClick={tabBar.fabAction}
          fabVisible={tabBar.fabVisible}
          fabIcon={tabBar.fabIcon}
          fabColor={tabBar.fabColor}
        />
      )}

      <AppOverlays {...overlayProps} />
    </>
  );
}
