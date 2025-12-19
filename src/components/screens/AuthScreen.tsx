import { SignInScreen } from './SignInScreen';

export function AuthScreen({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  return (
    <div>
      <SignInScreen onLoginSuccess={onAuthSuccess} />
    </div>
  );
}
