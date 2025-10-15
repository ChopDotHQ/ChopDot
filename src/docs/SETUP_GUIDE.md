# ChopDot Setup Guide

Complete guide to set up ChopDot with authentication, database, and Docker.

## Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose (for containerized setup)
- PostgreSQL 16+ (for local development without Docker)
- Git

## Quick Start with Docker

### 1. Clone and Configure

```bash
# Clone the repository
git clone https://github.com/yourusername/chopdot.git
cd chopdot

# Copy environment file
cp .env.example .env

# Edit .env and set your values
nano .env
```

### 2. Set Up WalletConnect

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Create a new project
3. Copy your Project ID
4. Update `.env`:
   ```
   WALLETCONNECT_PROJECT_ID=your_project_id_here
   ```

### 3. Start All Services

```bash
# Start all services (database, API, frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 4. Initialize Database

```bash
# Run migrations
docker-compose exec api npm run migrate

# (Optional) Seed with demo data
docker-compose exec api npm run seed
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **pgAdmin** (optional): http://localhost:5050
- **API Health**: http://localhost:3001/health

### 6. Create Your First Account

1. Open http://localhost:3000
2. Click "Continue with email" or connect a wallet
3. Create an account
4. Start using ChopDot!

## Local Development (Without Docker)

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Set Up PostgreSQL

```bash
# Create database
createdb chopdot

# Or with psql
psql -U postgres
CREATE DATABASE chopdot;
\q
```

### 3. Configure Environment

```bash
# Copy and edit .env
cp .env.example .env

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://yourusername:yourpassword@localhost:5432/chopdot
```

### 4. Run Migrations

```bash
cd backend
npm run migrate
cd ..
```

### 5. Start Development Servers

```bash
# Terminal 1: Start backend API
cd backend
npm run dev

# Terminal 2: Start frontend
npm run dev
```

### 6. Access Application

- Frontend: http://localhost:3000
- API: http://localhost:3001

## Authentication Setup

### Wallet Authentication

#### 1. Polkadot Wallets

Install browser extension:
- [Polkadot.js Extension](https://polkadot.js.org/extension/)
- [SubWallet](https://www.subwallet.app/)
- [Talisman](https://talisman.xyz/)

Add dependency:
```bash
npm install @polkadot/extension-dapp @polkadot/util @polkadot/util-crypto
```

#### 2. MetaMask

Install [MetaMask](https://metamask.io/) browser extension.

No additional dependencies needed (uses window.ethereum).

#### 3. Rainbow & WalletConnect

Add dependencies:
```bash
npm install @walletconnect/ethereum-provider
```

Get Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com).

### Email Authentication

Backend handles email/password with:
- bcrypt for password hashing
- JWT for session management

Add dependencies:
```bash
cd backend
npm install bcrypt jsonwebtoken
npm install -D @types/bcrypt @types/jsonwebtoken
```

## Database Setup

### PostgreSQL (Recommended for Production)

```bash
# Install PostgreSQL
# macOS
brew install postgresql@16

# Ubuntu/Debian
sudo apt install postgresql-16

# Start service
brew services start postgresql@16  # macOS
sudo systemctl start postgresql     # Linux

# Create user and database
createuser chopdot
createdb chopdot -O chopdot
```

### SQLite (Alternative for Development)

```bash
# Install dependency
cd backend
npm install better-sqlite3

# Update .env
DATABASE_URL=file:./chopdot.db
```

### Run Migrations

```bash
cd backend

# Using Prisma
npx prisma migrate dev

# Or using custom migrations
npm run migrate
```

## API Setup

### 1. Initialize Backend

```bash
cd backend
mkdir -p src/{controllers,middleware,routes,services,utils,types}
npm init -y
```

### 2. Install Dependencies

```bash
npm install express cors helmet morgan dotenv
npm install @polkadot/api @polkadot/util @polkadot/util-crypto
npm install ethers
npm install bcrypt jsonwebtoken
npm install zod
npm install pg # PostgreSQL client
npm install -D typescript @types/node @types/express @types/cors
npm install -D @types/bcrypt @types/jsonwebtoken
npm install -D nodemon ts-node
```

### 3. Configure TypeScript

Create `backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Add Scripts to package.json

```json
{
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate": "node scripts/migrate.js",
    "seed": "node scripts/seed.js"
  }
}
```

### 5. Create Entry Point

Create `backend/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected', uptime: process.uptime() });
});

// Routes
// TODO: Add routes here

// Start server
app.listen(port, () => {
  console.log(`ChopDot API running on http://localhost:${port}`);
});
```

## Frontend Setup

### 1. Install Dependencies

```bash
npm install @polkadot/extension-dapp @polkadot/util @polkadot/util-crypto
npm install @walletconnect/ethereum-provider
npm install ethers
```

### 2. Configure API Client

Create `src/api/client.ts`:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiCall(
  endpoint: string,
  options?: RequestInit
): Promise<any> {
  const token = localStorage.getItem('chopdot_auth_token');
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }
  
  return response.json();
}
```

## Testing

### Backend Tests

```bash
cd backend

# Install test dependencies
npm install -D jest @types/jest ts-jest supertest @types/supertest

# Run tests
npm test
```

### Frontend Tests

```bash
# Install test dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Run tests
npm run test
```

## Production Deployment

### Option 1: Docker Compose

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Manual Deployment

#### Backend

```bash
cd backend
npm run build
node dist/index.js
```

#### Frontend

```bash
npm run build
# Serve dist/ folder with nginx or any static file server
```

### Environment Variables for Production

Update `.env` for production:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db-host:5432/chopdot
JWT_SECRET=<generate strong secret>
CORS_ORIGIN=https://yourdomain.com
```

### Security Checklist

- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable HTTPS in production
- [ ] Set secure CORS policy
- [ ] Enable rate limiting
- [ ] Use environment variables for secrets
- [ ] Enable database SSL
- [ ] Regular security updates
- [ ] Set up monitoring and logging
- [ ] Enable database backups
- [ ] Implement CSRF protection

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # PostgreSQL

# Kill process
kill -9 <PID>
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart service
docker-compose restart postgres
```

### Wallet Connection Issues

1. **Polkadot**: Ensure extension is installed and unlocked
2. **MetaMask**: Check if MetaMask is installed
3. **WalletConnect**: Verify Project ID is correct in `.env`

### Migration Errors

```bash
# Reset database (CAUTION: Deletes all data)
cd backend
npm run migrate:reset

# Or manually
docker-compose exec postgres psql -U chopdot -d chopdot
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
\q

# Re-run migrations
npm run migrate
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/chopdot/issues
- Documentation: /docs
- API Docs: http://localhost:3001/api-docs (when running)

## Next Steps

1. [ ] Set up email service for notifications
2. [ ] Configure cloud storage for receipts (S3/Supabase)
3. [ ] Set up monitoring (Sentry, DataDog)
4. [ ] Enable CI/CD pipeline
5. [ ] Set up staging environment
6. [ ] Configure backup strategy
7. [ ] Set up analytics
