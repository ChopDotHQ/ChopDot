import { useState, useEffect, type FormEvent } from 'react';
import { getSupabase } from '../utils/supabase-client';
import { triggerHaptic } from '../utils/haptics';

interface EmailUpdateState {
  value: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
}

export function useEmailUpdate(initialEmail?: string) {
  const [state, setState] = useState<EmailUpdateState>({
    value: initialEmail ?? '',
    status: 'idle',
    message: '',
  });

  useEffect(() => {
    setState((prev) => ({ ...prev, value: initialEmail ?? '' }));
  }, [initialEmail]);

  const setValue = (value: string) => {
    setState((prev) => ({ ...prev, value, status: 'idle', message: '' }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    triggerHaptic('light');
    if (!state.value.trim()) {
      setState((prev) => ({ ...prev, status: 'error', message: 'Enter a valid email address.' }));
      triggerHaptic('error');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setState((prev) => ({ ...prev, status: 'error', message: 'Email auth is not configured.' }));
      triggerHaptic('error');
      return;
    }
    try {
      setState((prev) => ({ ...prev, status: 'loading', message: '' }));
      const { error } = await supabase.auth.updateUser({ email: state.value.trim() });
      if (error) throw error;
      setState((prev) => ({
        ...prev,
        status: 'success',
        message: 'Check your inbox to confirm the new email.',
      }));
      triggerHaptic('medium');
    } catch (error: any) {
      console.error('[YouTab] Email update failed:', error);
      setState((prev) => ({
        ...prev,
        status: 'error',
        message: error?.message || 'Unable to update email right now.',
      }));
      triggerHaptic('error');
    }
  };

  return { ...state, setValue, handleSubmit };
}
