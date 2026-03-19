import { useCallback } from 'react';

type Tab = 'pots' | 'people' | 'activity' | 'you';
type Screen = { type: string; [key: string]: unknown } | null;

interface UseTabNavigationParams {
  screen: Screen;
  stack: Screen[];
  reset: (screen: { type: string }) => void;
}

export function useTabNavigation({ screen, stack, reset }: UseTabNavigationParams) {
  const getActiveTab = useCallback((): Tab => {
    if (screen?.type === 'activity-home') return 'activity';
    if (screen?.type === 'settlements-home' || screen?.type === 'people-home') return 'people';
    if (screen?.type === 'settle-selection' || screen?.type === 'settle-home') return 'activity';
    if (screen?.type === 'you-tab') return 'you';
    return 'pots';
  }, [screen?.type]);

  const handleTabChange = useCallback((tab: Tab) => {
    const routes: Record<Tab, string> = {
      pots: '/pots',
      people: '/people',
      activity: '/activity',
      you: '/you',
    };

    const newPath = routes[tab];
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
    }

    const screenMap: Record<Tab, string> = {
      pots: 'pots-home',
      people: 'people-home',
      activity: 'activity-home',
      you: 'you-tab',
    };

    reset({ type: screenMap[tab] });
  }, [reset]);

  const shouldShowTabBar = useCallback((): boolean => {
    const tabBarScreens = [
      'activity-home', 'pots-home', 'settlements-home', 'people-home',
      'you-tab', 'pot-home', 'expense-detail', 'settle-selection', 'settle-home',
    ];
    return screen ? tabBarScreens.includes(screen.type) : false;
  }, [screen]);

  const canSwipeBack = useCallback((): boolean => {
    const rootScreens = [
      'activity-home', 'pots-home', 'settlements-home', 'people-home', 'you-tab',
    ];
    if (!screen) return false;
    if (stack.length <= 1) return false;
    return !rootScreens.includes(screen.type);
  }, [screen, stack.length]);

  return { getActiveTab, handleTabChange, shouldShowTabBar, canSwipeBack };
}
