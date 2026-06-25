import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Screen } from '../nav';
import {
  getCaptureTokenFromSearch,
  parseCaptureRoute,
  screenFromCaptureLinkResult,
} from '../services/capture/captureRoutes';
import { CaptureLinkError } from '../services/capture/types';
import type { CaptureLinkService } from '../services/capture/CaptureLinkService';

type ToastType = 'success' | 'error' | 'info';

type UseCaptureLinkFlowParams = {
  captureLinkService: CaptureLinkService;
  authLoading: boolean;
  isAuthenticated: boolean;
  reset: (screen: Screen) => void;
  setCurrentPotId: Dispatch<SetStateAction<string | null>>;
  showToast: (message: string, type?: ToastType) => void;
};

export function useCaptureLinkFlow({
  captureLinkService,
  authLoading,
  isAuthenticated,
  reset,
  setCurrentPotId,
  showToast,
}: UseCaptureLinkFlowParams): void {
  const processedRef = useRef<string | null>(null);

  const applyCaptureRoute = useCallback(async () => {
    const route = parseCaptureRoute(window.location.pathname);
    const token = getCaptureTokenFromSearch(window.location.search);
    if (!route || !token) {
      return;
    }

    const routeKey = `${window.location.pathname}${window.location.search}`;
    if (processedRef.current === routeKey) {
      return;
    }

    processedRef.current = routeKey;

    try {
      const resolved = await captureLinkService.resolveTokenRemote(token);
      const captureScreen = screenFromCaptureLinkResult(resolved);
      if ('potId' in captureScreen && captureScreen.potId) {
        setCurrentPotId(captureScreen.potId);
      }
      reset(captureScreen);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid capture link';
      const code = error instanceof CaptureLinkError ? error.code : 'not_found';
      showToast(message, 'error');
      reset({
        type: 'capture-link-error',
        code,
        message,
        expectedName: error instanceof CaptureLinkError ? error.expectedName : undefined,
      });
    }
  }, [captureLinkService, reset, setCurrentPotId, showToast]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    void applyCaptureRoute();
  }, [applyCaptureRoute, authLoading, isAuthenticated]);
}
