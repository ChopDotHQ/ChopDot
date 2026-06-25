import { useEffect, useRef } from "react";
import type { Screen } from "../nav";
import {
  getCaptureTokenFromSearch,
  parseCaptureRoute,
  resolveCaptureScreenFromLocation,
} from "../services/capture/captureRoutes";

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
  const captureScreen = resolveCaptureScreenFromLocation(
    window.location.pathname,
    window.location.search,
  );
  if (captureScreen) {
    return captureScreen;
  }

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
  disabled = false,
}: {
  screen: Screen | null | undefined;
  stackLength: number;
  reset: ResetNavigation;
  disabled?: boolean;
}) => {
  const lastCidRef = useRef<string | null>(null);
  const lastCaptureRef = useRef<string | null>(null);

  useEffect(() => {
    if (disabled) {
      return;
    }

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
  }, [screen?.type, reset, disabled]);

  useEffect(() => {
    if (disabled) {
      return;
    }

    const captureRoute = parseCaptureRoute(window.location.pathname);
    const captureToken = getCaptureTokenFromSearch(window.location.search);
    const captureScreen =
      captureRoute && captureToken
        ? resolveCaptureScreenFromLocation(window.location.pathname, window.location.search)
        : null;
    const captureKey = captureScreen
      ? `${captureScreen.type}:${window.location.pathname}${window.location.search}`
      : null;

    if (
      captureKey &&
      captureScreen &&
      captureScreen.type !== "capture-link-error" &&
      captureKey !== lastCaptureRef.current
    ) {
      lastCaptureRef.current = captureKey;
      if (screen?.type !== captureScreen.type) {
        reset(captureScreen);
      }
    }
  }, [screen?.type, reset, disabled]);

  useEffect(() => {
    if (disabled) {
      return;
    }

    const handlePopState = () => {
      const captureScreen = resolveCaptureScreenFromLocation(
        window.location.pathname,
        window.location.search,
      );
      if (captureScreen && captureScreen.type !== "capture-link-error") {
        reset(captureScreen);
        return;
      }

      const pathname = window.location.pathname;
      const screenType = ROUTE_TO_SCREEN[pathname];

      if (screenType && screen?.type !== screenType) {
        reset({ type: screenType });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [screen?.type, reset, disabled]);

  useEffect(() => {
    if (disabled || !screen) {
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
  }, [screen, stackLength, disabled]);
};
