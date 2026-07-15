import { useEffect } from "react";
import type { Screen } from "../nav";

type ResetNavigation = (screen: Screen) => void;
type TabScreen = "pots-home" | "activity-home" | "people-home" | "you-tab";

const ROUTE_TO_SCREEN: Record<string, TabScreen> = {
  "/": "pots-home",
  "/pots": "pots-home",
  "/activity": "activity-home",
  "/people": "people-home",
  "/you": "you-tab",
};

const SCREEN_TO_ROUTE: Record<TabScreen, string> = {
  "pots-home": "/pots",
  "activity-home": "/activity",
  "people-home": "/people",
  "you-tab": "/you",
};

const TAB_SCREEN_TYPES = [
  "pots-home",
  "activity-home",
  "people-home",
  "you-tab",
] as const satisfies readonly TabScreen[];

export const getInitialScreenFromLocation = (): Screen => {
  const pathname = window.location.pathname;
  const routeScreen = ROUTE_TO_SCREEN[pathname];
  if (routeScreen) {
    return { type: routeScreen };
  }

  // Preserve capture routes without redirecting
  if (pathname === '/pay' || pathname === '/confirm' || pathname === '/spend') {
    // We return 'pots-home' as a placeholder. The URL will remain /pay
    // and useCaptureLinkFlow will intercept it once auth is resolved.
    return { type: "pots-home" };
  }

  return { type: "pots-home" };
};

export const useUrlSync = ({
  screen,
  stackLength,
  reset,
}: {
  screen: Screen | null | undefined;
  stackLength: number;
  reset: ResetNavigation;
}) => {
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      const screenType = ROUTE_TO_SCREEN[pathname];

      if (screenType && screen?.type !== screenType) {
        reset({ type: screenType });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [screen?.type, reset]);

  useEffect(() => {
    if (!screen) {
      return;
    }

    const pathname = window.location.pathname;
    // Do not overwrite the URL if we are on a capture route
    if (pathname === '/pay' || pathname === '/confirm' || pathname === '/spend') {
      return;
    }

    const isTabScreen = TAB_SCREEN_TYPES.some((tabScreen) => tabScreen === screen.type);
    const newPath = isTabScreen
      ? SCREEN_TO_ROUTE[screen.type as TabScreen]
      : undefined;
    if (
      newPath &&
      pathname !== newPath &&
      pathname !== "/"
    ) {
      if (isTabScreen && stackLength === 1) {
        window.history.replaceState({}, "", newPath);
      }
    }

    if (pathname === "/" && screen.type === "pots-home") {
      window.history.replaceState({}, "", "/pots");
    }
  }, [screen, stackLength]);
};
