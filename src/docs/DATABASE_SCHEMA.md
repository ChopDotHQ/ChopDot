# ChopDot Database Schema

This document describes the PostgreSQL/SQLite database schema for ChopDot.

## Overview

The database supports:
- Multi-method authentication (wallet-based and email/password)
- Multi-pot expense tracking
- Custom expense splitting logic
- Attestations and confirmations
- Settlement history
- Payment methods management

## Schema Design

### users

Primary user table supporting both wallet and email authentication.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255), -- Only for email auth
  wallet_address VARCHAR(255) UNIQUE,
  auth_method VARCHAR(20) NOT NULL CHECK (auth_method IN ('polkadot', 'metamask', 'rainbow', 'email')),
  name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure either email or wallet_address is set
  CONSTRAINT user_auth_check CHECK (
    (email IS NOT NULL AND auth_method = 'email') OR
    (wallet_address IS NOT NULL AND auth_method IN ('polkadot', 'metamask', 'rainbow'))
  )
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_auth_method ON users(auth_method);
```

### sessions

Track user sessions for authentication.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### pots

Expense pots and savings pots.

```sql
CREATE TABLE pots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'savings')),
  base_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  budget DECIMAL(15, 2),
  budget_enabled BOOLEAN DEFAULT FALSE,
  
  -- Savings pot fields
  total_pooled DECIMAL(15, 2),
  yield_rate DECIMAL(5, 2),
  defi_protocol VARCHAR(50),
  goal_amount DECIMAL(15, 2),
  goal_description TEXT,
  
  -- Checkpoint system for expense pots
  checkpoint_enabled BOOLEAN DEFAULT TRUE,
  
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_pots_created_by ON pots(created_by);
CREATE INDEX idx_pots_type ON pots(type);
CREATE INDEX idx_pots_archived_at ON pots(archived_at);
```

### pot_members

Junction table for pot membership.

```sql
CREATE TABLE pot_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'member')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'removed')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(pot_id, user_id)
);

CREATE INDEX idx_pot_members_pot_id ON pot_members(pot_id);
CREATE INDEX idx_pot_members_user_id ON pot_members(user_id);
CREATE INDEX idx_pot_members_status ON pot_members(status);
```

### expenses

Individual expenses within pots.

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  paid_by UUID NOT NULL REFERENCES users(id),
  memo TEXT NOT NULL,
  expense_date DATE NOT NULL,
  has_receipt BOOLEAN DEFAULT FALSE,
  receipt_url TEXT,
  
  -- Blockchain attestation data
  attestation_tx_hash VARCHAR(255),
  attestation_timestamp TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_expenses_pot_id ON expenses(pot_id);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_deleted_at ON expenses(deleted_at);
```

### expense_splits

How an expense is divided among members.

```sql
CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(15, 2) NOT NULL,
  
  UNIQUE(expense_id, user_id)
);

CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id);
```

### attestations

Track who has confirmed/attested to each expense.

```sql
CREATE TABLE attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  attested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(expense_id, user_id)
);

CREATE INDEX idx_attestations_expense_id ON attestations(expense_id);
CREATE INDEX idx_attestations_user_id ON attestations(user_id);
```

### checkpoints

Expense checkpoints for batch confirmation.

```sql
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'bypassed')),
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Auto-confirm after 48h
  bypassed_by UUID REFERENCES users(id),
  bypassed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_checkpoints_pot_id ON checkpoints(pot_id);
CREATE INDEX idx_checkpoints_status ON checkpoints(status);
CREATE INDEX idx_checkpoints_expires_at ON checkpoints(expires_at);
```

### checkpoint_confirmations

Track member confirmations for checkpoints.

```sql
CREATE TABLE checkpoint_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(checkpoint_id, user_id)
);

CREATE INDEX idx_checkpoint_confirmations_checkpoint_id ON checkpoint_confirmations(checkpoint_id);
CREATE INDEX idx_checkpoint_confirmations_user_id ON checkpoint_confirmations(user_id);
```

### settlements

Settlement history between users.

```sql
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES users(id),
  to_user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  method VARCHAR(20) NOT NULL CHECK (method IN ('cash', 'bank', 'paypal', 'twint', 'dot')),
  
  -- Optional: Link to specific pots
  pot_ids UUID[],
  
  -- Payment reference/proof
  reference TEXT,
  tx_hash VARCHAR(255), -- For blockchain settlements
  
  settled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_settlements_from_user_id ON settlements(from_user_id);
CREATE INDEX idx_settlements_to_user_id ON settlements(to_user_id);
CREATE INDEX idx_settlements_settled_at ON settlements(settled_at);
CREATE INDEX idx_settlements_tx_hash ON settlements(tx_hash);
```

### payment_methods

User payment methods for settlements.

```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('bank', 'twint', 'paypal', 'crypto')),
  is_preferred BOOLEAN DEFAULT FALSE,
  
  -- Bank transfer
  iban VARCHAR(34),
  bank_name VARCHAR(100),
  
  -- Mobile payments
  phone VARCHAR(20),
  
  -- PayPal
  email VARCHAR(255),
  
  -- Crypto
  wallet_address VARCHAR(255),
  network VARCHAR(50),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_kind ON payment_methods(kind);
```

### contributions

Contributions to savings pots.

```sql
CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(15, 2) NOT NULL,
  tx_hash VARCHAR(255),
  contributed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contributions_pot_id ON contributions(pot_id);
CREATE INDEX idx_contributions_user_id ON contributions(user_id);
CREATE INDEX idx_contributions_contributed_at ON contributions(contributed_at);
```

### notifications

In-app notifications.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('attestation', 'settlement', 'invite', 'reminder')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

## SQLite Adaptations

For SQLite, make these changes:

1. Replace `UUID` with `TEXT` and use custom UUID generation
2. Replace `gen_random_uuid()` with application-level UUID generation
3. Replace `TIMESTAMP WITH TIME ZONE` with `TEXT` (store ISO 8601 strings)
4. Replace `DECIMAL` with `REAL` for numeric values
5. Replace `ARRAY` types (e.g., `pot_ids UUID[]`) with JSON text

Example SQLite conversion for `users` table:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  wallet_address TEXT UNIQUE,
  auth_method TEXT NOT NULL CHECK (auth_method IN ('polkadot', 'metamask', 'rainbow', 'email')),
  name TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT
);
```

## Migrations

For production use, implement proper database migrations using:
- PostgreSQL: Flyway, Liquibase, or custom migration scripts
- SQLite: Custom migration system with version tracking

## Security Considerations

1. **Password Storage**: Use bcrypt or Argon2 for password hashing
2. **Session Tokens**: Use secure random tokens, rotate regularly
3. **Wallet Signatures**: Verify signatures server-side before authentication
4. **SQL Injection**: Always use parameterized queries
5. **Access Control**: Implement row-level security (RLS) in PostgreSQL

## Indexes

All primary and foreign keys automatically create indexes. Additional indexes are created for:
- Frequently queried fields (email, wallet_address, status)
- Date range queries (created_at, expires_at, settled_at)
- Soft delete patterns (deleted_at, archived_at)

## Triggers

Consider adding triggers for:
- Auto-updating `updated_at` timestamps
- Cascading soft deletes
- Audit logging
- Notification generation
