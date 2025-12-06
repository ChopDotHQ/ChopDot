/**
 * Environment Variable Validation
 * 
 * Validates required environment variables at startup and build time.
 * Provides clear error messages when critical configuration is missing.
 */

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  errors: string[];
}

const REQUIRED_ENV_VARS = {
  VITE_SUPABASE_URL: 'Supabase project URL (e.g., https://xxx.supabase.co)',
  VITE_SUPABASE_ANON_KEY: 'Supabase anonymous/public API key',
  VITE_WALLETCONNECT_PROJECT_ID: 'WalletConnect Cloud project ID',
} as const;

/**
 * Validate all required environment variables
 */
export function validateEnvironment(): EnvValidationResult {
  const missing: string[] = [];
  const errors: string[] = [];

  // Check each required variable
  Object.entries(REQUIRED_ENV_VARS).forEach(([key, description]) => {
    const value = import.meta.env[key];
    
    if (!value || value.trim() === '') {
      missing.push(key);
      errors.push(`❌ ${key} is required but not set\n   Description: ${description}`);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
    errors,
  };
}

/**
 * Validate environment and throw if invalid
 * Use this at application startup
 */
export function requireValidEnvironment(): void {
  const result = validateEnvironment();
  
  if (!result.valid) {
    const errorMessage = [
      '\n🚨 ENVIRONMENT CONFIGURATION ERROR 🚨\n',
      'ChopDot requires the following environment variables to be set:\n',
      ...result.errors,
      '\n📝 How to fix:',
      '1. Copy .env.example to .env (if you haven\'t already)',
      '2. Fill in the missing values in your .env file',
      '3. Restart the development server\n',
      '💡 Get your credentials from:',
      '   • Supabase: https://app.supabase.com/project/_/settings/api',
      '   • WalletConnect: https://cloud.walletconnect.com/\n',
    ].join('\n');

    console.error(errorMessage);
    
    throw new Error(
      `Missing required environment variables: ${result.missing.join(', ')}`
    );
  }
}

/**
 * Log environment validation status (non-fatal)
 * Useful for build-time checks
 */
export function logEnvironmentStatus(): void {
  const result = validateEnvironment();
  
  if (result.valid) {
    console.log('✅ All required environment variables are set');
  } else {
    console.warn('\n⚠️  WARNING: Missing environment variables\n');
    result.errors.forEach(error => console.warn(error));
    console.warn('\nThe application may not function correctly.\n');
  }
}
