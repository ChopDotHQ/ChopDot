import { createClient } from '@supabase/supabase-js';

// Test script to verify Supabase auth signup
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

console.log('Testing Supabase Auth Signup');
console.log('URL:', SUPABASE_URL);
console.log('Anon Key:', SUPABASE_ANON_KEY.substring(0, 30) + '...');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

async function testSignup() {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'testpassword123';

  console.log('\n1. Testing signup with:', testEmail);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: { username: 'testuser' }
      }
    });

    if (error) {
      console.error('❌ Signup failed:', error.message);
      console.error('Error details:', error);
      process.exit(1);
    }

    console.log('✅ Signup successful!');
    console.log('User ID:', data.user?.id);
    console.log('Email:', data.user?.email);
    console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
    console.log('Session:', data.session ? 'Created' : 'None (email confirmation required)');

  } catch (err) {
    console.error('❌ Exception during signup:', err);
    process.exit(1);
  }
}

testSignup();
