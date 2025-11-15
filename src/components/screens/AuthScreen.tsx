import { useState } from 'react';
import { SignInScreen } from './SignInScreen';
import { SignUpScreen } from './SignUpScreen';

export function AuthScreen({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div>
      {isLogin ? (
        <SignInScreen onLoginSuccess={onAuthSuccess} />
      ) : (
        <SignUpScreen onSignUpSuccess={onAuthSuccess} />
      )}
      <div className="text-center p-4">
        <button onClick={() => setIsLogin(!isLogin)} className="text-blue-500">
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
        </button>
      </div>
    </div>
  );
}
