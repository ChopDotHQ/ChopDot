import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { InputField } from '../InputField';
import { PrimaryButton } from '../PrimaryButton';

export function SignUpScreen({ onSignUpSuccess }: { onSignUpSuccess: () => void }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password, username);
      onSignUpSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
      {error && <p className="text-red-500">{error}</p>}
      <div className="space-y-4">
        <InputField label="Username" value={username} onChange={setUsername} />
        <InputField label="Email" type="email" value={email} onChange={setEmail} />
        <InputField label="Password" type="password" value={password} onChange={setPassword} />
        <PrimaryButton onClick={handleSignUp} disabled={loading}>
          {loading ? 'Signing Up...' : 'Sign Up'}
        </PrimaryButton>
      </div>
    </div>
  );
}
