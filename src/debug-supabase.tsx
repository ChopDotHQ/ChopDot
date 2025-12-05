import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { getSupabase } from './utils/supabase-client';

function SupabaseDebugger() {
  const supabase = getSupabase();

  const handleTestSignup = async () => {
    if (!supabase) {
      console.error('Supabase not configured');
      alert('Supabase not configured! Check your .env file.');
      return;
    }

    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';

    console.log('Testing signup with:', testEmail);
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: { username: 'testuser' }
        }
      });

      console.log('Signup result:', { data, error });

      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        alert(`Success! User ID: ${data.user?.id}\nSession: ${data.session ? 'Yes' : 'No'}`);
      }
    } catch (err: any) {
      console.error('Exception:', err);
      alert(`Exception: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Supabase Debug Tool</h1>
      <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Configuration</h2>
        <p><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL || '❌ Not set'}</p>
        <p><strong>Supabase Key:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'}</p>
        <p><strong>Client Status:</strong> {supabase ? '✅ Initialized' : '❌ Not initialized'}</p>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <button 
          onClick={handleTestSignup}
          style={{
            padding: '1rem 2rem',
            fontSize: '16px',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Test Signup
        </button>
      </div>
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f9f9f9', borderRadius: '8px' }}>
        <h3>Instructions</h3>
        <ol>
          <li>Check that configuration shows ✅ for all items</li>
          <li>Click "Test Signup" button</li>
          <li>Check browser console for detailed logs</li>
          <li>Check alert message for result</li>
          <li>Verify user in database with: <code>psql ... -c "SELECT * FROM auth.users;"</code></li>
        </ol>
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <SupabaseDebugger />
    </StrictMode>
  );
}
