import { SignInScreen } from './SignInScreen';

export function AuthScreen({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  return (
    <div className="h-full">
      <SignInScreen onLoginSuccess={onAuthSuccess} />
    </div>
  );
}
