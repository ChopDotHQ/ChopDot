import { useEffect, useRef } from "react";
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
  const urlParams = new URLSearchParams(window.location.search);
  const cidParam = urlParams.get("cid");
  if (cidParam) {
    return { type: "import-pot" };
  }

  const pathname = window.location.pathname;
  const routeScreen = ROUTE_TO_SCREEN[pathname];
  if (routeScreen) {
    return { type: routeScreen };
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
  const lastCidRef = useRef<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const cidParam = urlParams.get("cid");

    if (cidParam !== lastCidRef.current) {
      lastCidRef.current = cidParam;

      if (cidParam && screen?.type !== "import-pot") {
        reset({ type: "import-pot" });
      } else if (!cidParam && screen?.type === "import-pot") {
        reset({ type: "pots-home" });
      }
    }
  }, [screen?.type, reset]);

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

    const isTabScreen = TAB_SCREEN_TYPES.some((tabScreen) => tabScreen === screen.type);
    const newPath = isTabScreen
      ? SCREEN_TO_ROUTE[screen.type as TabScreen]
      : undefined;
    if (
      newPath &&
      window.location.pathname !== newPath &&
      window.location.pathname !== "/"
    ) {
      if (isTabScreen && stackLength === 1) {
        window.history.replaceState({}, "", newPath);
      }
    }

    if (window.location.pathname === "/" && screen.type === "pots-home") {
      window.history.replaceState({}, "", "/pots");
    }
  }, [screen, stackLength]);
};
