# ChopDot Backend API

Production-ready Express.js API server for ChopDot.

## Features

- ✅ IPFS upload proxy (Crust Network integration)
- ✅ CORS enabled
- ✅ Security headers (Helmet)
- ✅ Request logging (Morgan)
- ✅ Error handling
- ✅ Health check endpoint

## Quick Start

### Development

```bash
cd backend
npm install
npm run dev
```

Server runs on `http://localhost:3001`

### Production

```bash
npm run build
npm start
```

Or with Docker:

```bash
docker-compose up api
```

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Required variables:
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - Allowed CORS origins (comma-separated)
- `CRUST_IPFS_API` - Crust IPFS API endpoint
- `CRUST_IPFS_GATEWAY` - Crust IPFS gateway URL

## API Endpoints

### Health Check

```
GET /health
```

Returns server status and uptime.

### IPFS Upload

```
POST /api/ipfs/upload
Content-Type: multipart/form-data
Body: { file: File }
```

Uploads a file to IPFS via Crust Network.

**Response:**
```json
{
  "cid": "Qm...",
  "gatewayUrl": "https://gw.crustfiles.app/ipfs/Qm...",
  "filename": "example.json",
  "size": 1234
}
```

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Server entry point
│   ├── routes/                # API routes
│   │   └── ipfs.routes.ts
│   ├── controllers/          # Route handlers
│   │   └── ipfs.controller.ts
│   ├── services/              # Business logic
│   │   └── ipfs.service.ts
│   └── middleware/            # Express middleware
│       └── upload.middleware.ts
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Development

The server uses `tsx` for development with hot reload:

```bash
npm run dev
```

## Production Deployment

1. Build the TypeScript code:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Or use Docker:
   ```bash
   docker build -t chopdot-api .
   docker run -p 3001:3001 chopdot-api
   ```

## Security

- Helmet.js for security headers
- CORS configured for specific origins
- File size limits (10MB)
- Input validation
- Error handling without exposing internals

## Logging

All requests are logged using Morgan. Check console output for:
- Request method and path
- Response status
- Response time

