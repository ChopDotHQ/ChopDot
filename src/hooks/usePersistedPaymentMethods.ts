import { useEffect, useRef, useState } from 'react';
import type { PaymentMethod } from '../components/screens/PaymentMethods';

type StoredPaymentMethods = {
  methods?: PaymentMethod[];
  preferredMethodId?: string;
};

type UsePersistedPaymentMethodsParams = {
  storageScope: string;
  initialMethods: PaymentMethod[];
  initialPreferredMethodId: string;
};

const STORAGE_PREFIX = 'chopdot_payment_methods';

const getStorageKey = (storageScope: string) => `${STORAGE_PREFIX}:${storageScope}`;

const isPaymentMethod = (value: unknown): value is PaymentMethod => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.kind === 'string' &&
    ['bank', 'twint', 'paypal', 'crypto'].includes(candidate.kind)
  );
};

export function usePersistedPaymentMethods({
  storageScope,
  initialMethods,
  initialPreferredMethodId,
}: UsePersistedPaymentMethodsParams) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initialMethods);
  const [preferredMethodId, setPreferredMethodId] = useState<string>(initialPreferredMethodId);
  const hydratedScopeRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const key = getStorageKey(storageScope);

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        setPaymentMethods(initialMethods);
        setPreferredMethodId(initialPreferredMethodId);
        hydratedScopeRef.current = storageScope;
        return;
      }

      const parsed = JSON.parse(raw) as StoredPaymentMethods;
      const methods = Array.isArray(parsed.methods)
        ? parsed.methods.filter(isPaymentMethod)
        : [];
      const nextMethods = methods.length > 0 ? methods : initialMethods;
      const nextPreferredMethodId = nextMethods.some((method) => method.id === parsed.preferredMethodId)
        ? parsed.preferredMethodId || ''
        : nextMethods.some((method) => method.id === initialPreferredMethodId)
          ? initialPreferredMethodId
          : '';

      setPaymentMethods(nextMethods);
      setPreferredMethodId(nextPreferredMethodId);
    } catch (error) {
      console.warn('[payment-methods] Failed to hydrate saved methods, using defaults:', error);
      setPaymentMethods(initialMethods);
      setPreferredMethodId(initialPreferredMethodId);
    } finally {
      hydratedScopeRef.current = storageScope;
    }
  }, [initialMethods, initialPreferredMethodId, storageScope]);

  useEffect(() => {
    if (typeof window === 'undefined' || hydratedScopeRef.current !== storageScope) {
      return;
    }

    const normalizedPreferredMethodId = paymentMethods.some((method) => method.id === preferredMethodId)
      ? preferredMethodId
      : '';

    if (preferredMethodId !== normalizedPreferredMethodId) {
      setPreferredMethodId(normalizedPreferredMethodId);
      return;
    }

    try {
      window.localStorage.setItem(
        getStorageKey(storageScope),
        JSON.stringify({
          methods: paymentMethods,
          preferredMethodId: normalizedPreferredMethodId,
        } satisfies StoredPaymentMethods),
      );
    } catch (error) {
      console.warn('[payment-methods] Failed to persist methods:', error);
    }
  }, [paymentMethods, preferredMethodId, storageScope]);

  return {
    paymentMethods,
    setPaymentMethods,
    preferredMethodId,
    setPreferredMethodId,
  };
}
