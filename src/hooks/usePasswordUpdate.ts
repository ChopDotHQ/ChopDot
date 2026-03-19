import { useState, type FormEvent } from 'react';
import { getSupabase } from '../utils/supabase-client';
import { triggerHaptic } from '../utils/haptics';

interface PasswordUpdateState {
  newPassword: string;
  confirmPassword: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
}

export function usePasswordUpdate() {
  const [state, setState] = useState<PasswordUpdateState>({
    newPassword: '',
    confirmPassword: '',
    status: 'idle',
    message: '',
  });

  const setNewPassword = (newPassword: string) => {
    setState((prev) => ({ ...prev, newPassword, status: 'idle', message: '' }));
  };

  const setConfirmPassword = (confirmPassword: string) => {
    setState((prev) => ({ ...prev, confirmPassword, status: 'idle', message: '' }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    triggerHaptic('light');
    if (state.newPassword.length < 8) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        message: 'Password must be at least 8 characters long.',
      }));
      triggerHaptic('error');
      return;
    }
    if (state.newPassword !== state.confirmPassword) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        message: 'Passwords do not match.',
      }));
      triggerHaptic('error');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        message: 'Password auth is not configured.',
      }));
      triggerHaptic('error');
      return;
    }
    try {
      setState((prev) => ({ ...prev, status: 'loading', message: '' }));
      const { error } = await supabase.auth.updateUser({ password: state.newPassword });
      if (error) throw error;
      setState({
        newPassword: '',
        confirmPassword: '',
        status: 'success',
        message: 'Password updated.',
      });
      triggerHaptic('medium');
    } catch (error: any) {
      console.error('[YouTab] Password update failed:', error);
      setState((prev) => ({
        ...prev,
        status: 'error',
        message: error?.message || 'Unable to update password right now.',
      }));
      triggerHaptic('error');
    }
  };

  return { ...state, setNewPassword, setConfirmPassword, handleSubmit };
}
