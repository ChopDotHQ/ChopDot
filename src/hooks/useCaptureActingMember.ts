import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'chopdot_capture_acting_member';

export function useCaptureActingMember(defaultMemberId: string): {
  actingMemberId: string;
  setActingMemberId: (memberId: string) => void;
} {
  const [actingMemberId, setActingMemberIdState] = useState(defaultMemberId);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActingMemberIdState(stored);
    } else {
      setActingMemberIdState(defaultMemberId);
    }
  }, [defaultMemberId]);

  const setActingMemberId = useCallback((memberId: string) => {
    setActingMemberIdState(memberId);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(STORAGE_KEY, memberId);
    }
  }, []);

  return { actingMemberId, setActingMemberId };
}

export function readCaptureActingMember(defaultMemberId: string): string {
  if (typeof window === 'undefined') {
    return defaultMemberId;
  }
  return window.sessionStorage.getItem(STORAGE_KEY) ?? defaultMemberId;
}
