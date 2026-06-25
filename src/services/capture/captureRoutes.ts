import type { Screen } from '../../nav';
import { captureLinkService } from './CaptureLinkService';
import type { CaptureLinkResolveResult } from './types';
import { CaptureLinkError } from './types';

export type CaptureRouteKind = 'spend' | 'pay' | 'confirm';

export function parseCaptureRoute(pathname: string): CaptureRouteKind | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/spend') return 'spend';
  if (normalized === '/pay') return 'pay';
  if (normalized === '/confirm') return 'confirm';
  return null;
}

export function getCaptureTokenFromSearch(search: string): string | null {
  return new URLSearchParams(search).get('t');
}

export function screenFromCaptureLinkResult(resolved: CaptureLinkResolveResult): Screen {
  if (resolved.type === 'spend') {
    return {
      type: 'spend-card',
      potId: resolved.payload.potId,
      spendCardId: resolved.payload.spendCardId,
      captureToken: resolved.token,
      actingMemberId: resolved.payload.payerId,
    };
  }

  if (resolved.type === 'pay') {
    return {
      type: 'capture-handoff',
      potId: resolved.payload.potId,
      legId: resolved.payload.legId,
      captureToken: resolved.token,
      actingMemberId: resolved.payload.fromMemberId,
    };
  }

  return {
    type: 'capture-confirm',
    potId: resolved.payload.potId,
    legId: resolved.payload.legId,
    captureToken: resolved.token,
    receiverId: resolved.payload.receiverId,
  };
}

export function resolveCaptureScreenFromLocation(pathname: string, search: string): Screen | null {
  const route = parseCaptureRoute(pathname);
  const token = getCaptureTokenFromSearch(search);
  if (!route || !token) {
    return null;
  }

  try {
    const resolved = captureLinkService.resolveToken(token);
    return screenFromCaptureLinkResult(resolved);
  } catch (error) {
    if (error instanceof CaptureLinkError) {
      return {
        type: 'capture-link-error',
        code: error.code,
        message: error.message,
        expectedName: error.expectedName,
      };
    }
    return {
      type: 'capture-link-error',
      code: 'not_found',
      message: 'Invalid or expired link',
    };
  }
}
