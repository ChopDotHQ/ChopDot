# ChopDot Authentication System

## Overview

ChopDot implements a comprehensive authentication system supporting multiple login methods:

- **Wallet-based authentication**: Polkadot, MetaMask, Rainbow (via WalletConnect)
- **Email/password authentication**: Traditional username/password

This hybrid approach allows users to choose their preferred authentication method while maintaining a unified user experience.

## Architecture

```
┌─────────────────┐
│  LoginScreen    │ ← User selects auth method
└────────┬────────┘
         │
         ├─ Wallet Auth ──→ walletAuth.ts ──→ Sign message ──→ Verify
         │                                                        │
         └─ Email Auth ───→ AuthContext ────→ API /auth/login ──┘
                                                                  │
                                            ┌─────────────────────┘
                                            ↓
                                    Store JWT + User Data
                                            │
                                            ↓
                                    AuthContext provides:
                                    - user
                                    - isAuthenticated
                                    - login()
                                    - logout()
```

## Components

### 1. AuthContext (`/contexts/AuthContext.tsx`)

Central authentication state management.

**Provides:**
- `user`: Current user object or null
- `isLoading`: Loading state during auth checks
- `isAuthenticated`: Boolean authentication status
- `login()`: Login with wallet or email
- `logout()`: Logout and clear session
- `refreshUser()`: Refresh user data from backend

**Usage:**
```typescript
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <p>Please log in</p>;
  }
  
  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 2. Wallet Authentication (`/utils/walletAuth.ts`)

Handles wallet connections and signature verification.

**Supported Wallets:**

#### Polkadot Ecosystem
- Polkadot.js Extension
- SubWallet
- Talisman

**Flow:**
1. Connect to wallet extension
2. Request accounts
3. Generate sign-in message
4. Request signature from wallet
5. Verify signature server-side
6. Create/retrieve user
7. Issue JWT token

**Code Example:**
```typescript
import { connectPolkadotWallet, signPolkadotMessage, generateSignInMessage } from './utils/walletAuth';

// Connect wallet
const connection = await connectPolkadotWallet();
// connection = { address, provider, name }

// Generate message to sign
const message = generateSignInMessage(connection.address);

// Sign message
const signature = await signPolkadotMessage(connection.address, message);

// Send to backend for verification
const response = await fetch('/api/auth/wallet/login', {
  method: 'POST',
  body: JSON.stringify({
    walletAddress: connection.address,
    signature,
    message,
    authMethod: 'polkadot',
  }),
});
```

#### EVM Wallets (MetaMask, Rainbow)

**MetaMask:**
- Direct browser extension integration
- Uses `window.ethereum`

**Rainbow & Others:**
- Via WalletConnect v2
- QR code scanning on mobile

**Flow:** Same as Polkadot, but uses EVM signature verification

### 3. LoginScreen (`/components/screens/LoginScreen.tsx`)

User-facing authentication interface.

**Features:**
- Wallet connection buttons
- Email/password form
- Sign up / Sign in toggle
- Error handling and display
- Loading states

**Modes:**
- `select`: Show all auth options
- `email`: Email/password sign in
- `signup`: Email/password registration

## Security

### Wallet Authentication

#### Message Signing
Each login generates a unique message containing:
- Wallet address
- Timestamp
- Random nonce

```typescript
function generateSignInMessage(address: string): string {
  const timestamp = new Date().toISOString();
  const nonce = Math.random().toString(36).substring(7);
  
  return `Sign this message to authenticate with ChopDot

Address: ${address}
Timestamp: ${timestamp}
Nonce: ${nonce}`;
}
```

#### Signature Verification

**Polkadot:**
```typescript
import { signatureVerify } from '@polkadot/util-crypto';

const result = signatureVerify(message, signature, address);
if (result.isValid) {
  // Proceed with authentication
}
```

**EVM:**
```typescript
import { ethers } from 'ethers';

const recoveredAddress = ethers.verifyMessage(message, signature);
if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
  // Proceed with authentication
}
```

#### Best Practices
- Always verify signatures server-side
- Use HTTPS in production
- Implement replay attack protection (timestamp + nonce)
- Rate limit signature verification attempts
- Store wallet addresses in lowercase for consistency

### Email Authentication

#### Password Storage
- Use bcrypt with salt rounds ≥ 12
- Never store plain-text passwords
- Implement password complexity requirements

```typescript
import bcrypt from 'bcrypt';

// Hashing
const hash = await bcrypt.hash(password, 12);

// Verification
const isValid = await bcrypt.compare(password, hash);
```

#### JWT Tokens
- Use strong secrets (32+ characters)
- Set reasonable expiration (7 days default)
- Include minimal claims (user ID, auth method)
- Implement token refresh mechanism

```typescript
import jwt from 'jsonwebtoken';

// Generate token
const token = jwt.sign(
  { userId: user.id, authMethod: 'email' },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Verify token
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

## Database Schema

### users table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,           -- For email auth
  password_hash VARCHAR(255),          -- For email auth
  wallet_address VARCHAR(255) UNIQUE,  -- For wallet auth
  auth_method VARCHAR(20) NOT NULL,    -- 'polkadot' | 'metamask' | 'rainbow' | 'email'
  name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_login_at TIMESTAMP,
  
  CONSTRAINT user_auth_check CHECK (
    (email IS NOT NULL AND auth_method = 'email') OR
    (wallet_address IS NOT NULL AND auth_method IN ('polkadot', 'metamask', 'rainbow'))
  )
);
```

### sessions table

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token VARCHAR(500) UNIQUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
);
```

## API Endpoints

### POST /api/auth/wallet/login

Authenticate with wallet signature.

**Request:**
```json
{
  "walletAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "signature": "0x...",
  "message": "Sign this message...",
  "authMethod": "polkadot"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "walletAddress": "5GrwvaEF...",
    "authMethod": "polkadot",
    "name": "Polkadot User"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST /api/auth/email/register

Register with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

### POST /api/auth/email/login

Login with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### POST /api/auth/logout

Logout and invalidate session.

**Headers:**
```
Authorization: Bearer <token>
```

### GET /api/auth/me

Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

## Integration with App

### App Wrapper

```typescript
// App.tsx
import { AuthProvider } from './contexts/AuthContext';
import { LoginScreen } from './components/screens/LoginScreen';

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <LoginScreen />;
  }
  
  return <MainApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
```

### Protected Routes

```typescript
function ProtectedComponent() {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <YourComponent user={user} />;
}
```

### Logout Implementation

```typescript
const handleLogout = async () => {
  try {
    await logout(); // Clears token, updates state
    // User automatically redirected to LoginScreen
  } catch (error) {
    console.error('Logout failed:', error);
  }
};
```

## Testing

### Wallet Auth Testing

```typescript
// Mock wallet for testing
const mockWallet = {
  address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  sign: (message: string) => '0xmocksignature...',
};

test('wallet login creates user session', async () => {
  const { result } = renderHook(() => useAuth());
  
  await act(async () => {
    await result.current.login('polkadot', {
      type: 'wallet',
      address: mockWallet.address,
      signature: mockWallet.sign('test message'),
      message: 'test message',
    });
  });
  
  expect(result.current.isAuthenticated).toBe(true);
  expect(result.current.user.walletAddress).toBe(mockWallet.address);
});
```

### Email Auth Testing

```typescript
test('email login with valid credentials', async () => {
  const { result } = renderHook(() => useAuth());
  
  await act(async () => {
    await result.current.login('email', {
      type: 'email',
      email: 'test@example.com',
      password: 'password123',
    });
  });
  
  expect(result.current.isAuthenticated).toBe(true);
  expect(result.current.user.email).toBe('test@example.com');
});
```

## Troubleshooting

### Wallet Not Detected

**Problem:** "No Polkadot extension found"

**Solutions:**
1. Install Polkadot.js Extension, SubWallet, or Talisman
2. Ensure extension is unlocked
3. Check browser compatibility
4. Try refreshing the page

### Signature Verification Failed

**Problem:** Signature verification fails on backend

**Solutions:**
1. Ensure message format matches exactly
2. Check for encoding issues (hex vs UTF-8)
3. Verify wallet provider compatibility
4. Check server-side signature verification library

### JWT Token Expired

**Problem:** User logged out unexpectedly

**Solutions:**
1. Implement token refresh mechanism
2. Adjust token expiration time
3. Add "Remember me" option for longer sessions
4. Handle token refresh in API interceptor

## Future Enhancements

- [ ] Multi-factor authentication (2FA)
- [ ] Social login (Google, GitHub)
- [ ] Biometric authentication
- [ ] Hardware wallet support (Ledger, Trezor)
- [ ] Session management (view active sessions)
- [ ] Account recovery mechanisms
- [ ] OAuth2 provider for third-party integrations
