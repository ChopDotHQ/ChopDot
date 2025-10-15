# ChopDot Backend API Documentation

## Overview

The ChopDot backend API is a RESTful API built with Node.js/Express that handles authentication, data persistence, and blockchain interactions.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL 16 (or SQLite for development)
- **ORM**: Prisma or Drizzle ORM
- **Authentication**: JWT + Wallet Signatures
- **Validation**: Zod
- **Blockchain**: @polkadot/api, ethers.js

## Project Structure

```
backend/
├── src/
│   ├── controllers/       # Route handlers
│   │   ├── auth.controller.ts
│   │   ├── pots.controller.ts
│   │   ├── expenses.controller.ts
│   │   ├── settlements.controller.ts
│   │   └── users.controller.ts
│   ├── middleware/        # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/            # API routes
│   │   ├── auth.routes.ts
│   │   ├── pots.routes.ts
│   │   ├── expenses.routes.ts
│   │   ├── settlements.routes.ts
│   │   └── users.routes.ts
│   ├── services/          # Business logic
│   │   ├── auth.service.ts
│   │   ├── wallet.service.ts
│   │   ├── pots.service.ts
│   │   └── blockchain.service.ts
│   ├── models/            # Database models (if not using ORM)
│   ├── utils/             # Utilities
│   │   ├── jwt.ts
│   │   ├── crypto.ts
│   │   └── validation.ts
│   ├── types/             # TypeScript types
│   └── index.ts           # App entry point
├── prisma/                # Prisma schema (if using Prisma)
│   └── schema.prisma
├── Dockerfile
├── package.json
└── tsconfig.json
```

## API Endpoints

### Authentication

#### POST /api/auth/wallet/login

Login or register with wallet signature.

**Request:**
```json
{
  "walletAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "signature": "0x...",
  "message": "Sign this message to authenticate...",
  "authMethod": "polkadot" | "metamask" | "rainbow"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "walletAddress": "5GrwvaEF...",
    "authMethod": "polkadot",
    "name": "Polkadot User",
    "createdAt": "2025-10-13T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST /api/auth/email/register

Register with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "authMethod": "email",
    "createdAt": "2025-10-13T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST /api/auth/email/login

Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** Same as register

#### POST /api/auth/logout

Logout and invalidate token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true
}
```

#### GET /api/auth/me

Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "walletAddress": null,
    "authMethod": "email",
    "name": "John Doe",
    "createdAt": "2025-10-13T..."
  }
}
```

### Pots

All pot endpoints require authentication.

#### GET /api/pots

Get all pots for the current user.

**Response:**
```json
{
  "pots": [
    {
      "id": "uuid",
      "name": "🏠 SF Roommates",
      "type": "expense",
      "baseCurrency": "USD",
      "budget": 500.00,
      "budgetEnabled": true,
      "members": [...],
      "expenseCount": 6,
      "totalExpenses": 500.50,
      "createdAt": "2025-10-13T..."
    }
  ]
}
```

#### GET /api/pots/:id

Get pot details with expenses and members.

**Response:**
```json
{
  "pot": {
    "id": "uuid",
    "name": "🏠 SF Roommates",
    "type": "expense",
    "baseCurrency": "USD",
    "budget": 500.00,
    "budgetEnabled": true,
    "checkpointEnabled": true,
    "members": [
      {
        "id": "uuid",
        "userId": "uuid",
        "name": "Alice",
        "role": "owner",
        "status": "active"
      }
    ],
    "expenses": [...],
    "currentCheckpoint": {...}
  }
}
```

#### POST /api/pots

Create a new pot.

**Request:**
```json
{
  "name": "🌴 Bali Trip 2025",
  "type": "expense",
  "baseCurrency": "USD",
  "budget": 3000.00,
  "budgetEnabled": true,
  "members": [
    {
      "userId": "uuid",
      "role": "member"
    }
  ]
}
```

**Response:**
```json
{
  "pot": {...}
}
```

#### PATCH /api/pots/:id

Update pot settings.

#### DELETE /api/pots/:id

Delete/archive a pot.

### Expenses

#### GET /api/pots/:potId/expenses

Get all expenses for a pot.

#### POST /api/pots/:potId/expenses

Create a new expense.

**Request:**
```json
{
  "amount": 120.50,
  "currency": "USD",
  "memo": "Groceries at Whole Foods",
  "expenseDate": "2025-10-13",
  "hasReceipt": true,
  "splits": [
    {
      "userId": "uuid",
      "amount": 40.17
    },
    {
      "userId": "uuid",
      "amount": 40.17
    },
    {
      "userId": "uuid",
      "amount": 40.16
    }
  ]
}
```

**Response:**
```json
{
  "expense": {
    "id": "uuid",
    "potId": "uuid",
    "amount": 120.50,
    "currency": "USD",
    "memo": "Groceries at Whole Foods",
    "expenseDate": "2025-10-13",
    "paidBy": "uuid",
    "hasReceipt": true,
    "splits": [...],
    "attestations": [],
    "createdAt": "2025-10-13T..."
  }
}
```

#### PATCH /api/expenses/:id

Update an expense.

#### DELETE /api/expenses/:id

Delete an expense.

#### POST /api/expenses/:id/attest

Attest/confirm an expense.

**Response:**
```json
{
  "expense": {...},
  "attestation": {
    "id": "uuid",
    "userId": "uuid",
    "attestedAt": "2025-10-13T..."
  }
}
```

### Settlements

#### GET /api/settlements

Get settlement history for current user.

**Query Parameters:**
- `potId` (optional): Filter by pot
- `counterpartyId` (optional): Filter by counterparty
- `limit` (default: 50)
- `offset` (default: 0)

#### POST /api/settlements

Record a new settlement.

**Request:**
```json
{
  "counterpartyId": "uuid",
  "amount": 45.50,
  "currency": "USD",
  "method": "bank",
  "potIds": ["uuid"],
  "reference": "Bank transfer ref: 123456",
  "txHash": null
}
```

**Response:**
```json
{
  "settlement": {...}
}
```

#### GET /api/settlements/balances

Get current balances (who owes whom).

**Query Parameters:**
- `potId` (optional): Calculate balances for specific pot

**Response:**
```json
{
  "youOwe": [
    {
      "userId": "uuid",
      "name": "Alice",
      "totalAmount": 83.50,
      "breakdown": [
        {
          "potId": "uuid",
          "potName": "🏠 SF Roommates",
          "amount": 83.50
        }
      ]
    }
  ],
  "owedToYou": [...]
}
```

### Payment Methods

#### GET /api/payment-methods

Get all payment methods for current user.

#### POST /api/payment-methods

Add a new payment method.

**Request:**
```json
{
  "kind": "bank",
  "iban": "CH93 0076 2011 6238 5295 7",
  "bankName": "UBS",
  "isPreferred": true
}
```

#### PATCH /api/payment-methods/:id

Update a payment method.

#### DELETE /api/payment-methods/:id

Delete a payment method.

### Users

#### GET /api/users/search

Search for users (for adding to pots).

**Query Parameters:**
- `q`: Search query (name, email)

#### GET /api/users/:id

Get user profile (public info only).

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Error Codes

- `UNAUTHORIZED`: 401 - Not authenticated
- `FORBIDDEN`: 403 - Not authorized to access resource
- `NOT_FOUND`: 404 - Resource not found
- `VALIDATION_ERROR`: 400 - Invalid request data
- `CONFLICT`: 409 - Resource already exists
- `INTERNAL_ERROR`: 500 - Server error

## Authentication

Use JWT Bearer tokens:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Tokens expire after 7 days (configurable).

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- Other endpoints: 100 requests per minute

## Wallet Signature Verification

### Polkadot

```typescript
import { signatureVerify } from '@polkadot/util-crypto';
import { hexToU8a, stringToHex } from '@polkadot/util';

function verifyPolkadotSignature(
  address: string,
  message: string,
  signature: string
): boolean {
  const result = signatureVerify(
    stringToHex(message),
    hexToU8a(signature),
    address
  );
  return result.isValid;
}
```

### EVM (MetaMask, Rainbow)

```typescript
import { ethers } from 'ethers';

function verifyEvmSignature(
  address: string,
  message: string,
  signature: string
): boolean {
  const recoveredAddress = ethers.verifyMessage(message, signature);
  return recoveredAddress.toLowerCase() === address.toLowerCase();
}
```

## Database Migrations

Run migrations on startup:

```bash
npm run migrate
```

Or with Docker:

```bash
docker-compose exec api npm run migrate
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

## Deployment

### Environment Variables

See `.env.example` for all required variables.

### Health Check Endpoint

```
GET /health
```

Returns:
```json
{
  "status": "ok",
  "database": "connected",
  "uptime": 12345
}
```

## Security Best Practices

1. **Always verify wallet signatures** before creating/updating users
2. **Use parameterized queries** to prevent SQL injection
3. **Implement rate limiting** on all endpoints
4. **Validate all input** with Zod schemas
5. **Use HTTPS** in production
6. **Rotate JWT secrets** regularly
7. **Implement CORS** properly
8. **Log security events** (failed logins, etc.)
9. **Keep dependencies updated**
10. **Never log sensitive data** (passwords, tokens)
