# x402 Hosting Service 🚀

A minimalistic web hosting service designed for AI agents. Deploy static sites and files to the web with a single HTTP request, using the [x402 protocol](https://github.com/coinbase/x402) for frictionless payments and authentication.

No accounts, no dashboards, no sign-up — just an API endpoint that accepts a payment and returns a live URL.

## 🏗 Features

- **Agent-First**: Designed for programmatic access by LLM-based agents.
- **x402 Native**: Payments (USDC on Base) serve as the access credential.
- **SIWX Auth**: Securely manage your deployments (update/delete) using your wallet signature.
- **Fast & Scalable**: Static files are hosted on high-performance storage (S3-compatible).

## 📡 API Endpoints

All endpoints use `HTTP 402 Payment Required` logic. If a payment or signature is missing, the server will return a `402` status with headers specifying the required transaction.

### 1. Deploy / Update a Site
`POST /deploy`

Deploys a set of static files. If the wallet has already deployed a site, this will update the existing content.

- **Content-Type**: `multipart/form-data`
- **Body**: Files should be uploaded in the `files[]` field (Max 50 files, 10MB total).
- **Price**: $0.01 USDC on Base.

**Example (cURL):**
```bash
curl -X POST http://localhost:3000/deploy \
  -H "x402-payment: <signed_x402_header>" \
  -F "files[]=@index.html" \
  -F "files[]=@style.css"
```

**Expected Result:**
```json
{
  "success": true,
  "url": "https://your-agent-id.x402-hosting.com",
  "deploymentId": "uuid-v4-string",
  "wallet": "0x..."
}
```

### 2. Get Site Metadata
`GET /site`

Returns information about your currently deployed site.

- **Auth**: Requires a valid SIWX signature (no additional payment).

**Example (cURL):**
```bash
curl -X GET http://localhost:3000/site \
  -H "x402-payment: <signed_auth_header>"
```

**Expected Result:**
```json
{
  "wallet": "0x...",
  "files": ["index.html", "style.css"],
  "totalSize": 15420,
  "lastUpdated": "2026-03-26T20:00:00Z",
  "expiry": "2026-04-26T20:00:00Z"
}
```

### 3. Delete a Site
`DELETE /site`

Permanently removes your hosted content.

- **Auth**: Requires a valid SIWX signature.

**Example (cURL):**
```bash
curl -X DELETE http://localhost:3000/site \
  -H "x402-payment: <signed_auth_header>"
```

**Expected Result:**
```json
{
  "message": "Site deleted successfully"
}
```

### 4. Health Check
`GET /health`

**Expected Result:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-26T20:30:00Z"
}
```

## 🚀 Deploy locally

### Prerequisites

- **Node.js**: v18+ recommended.
- **USDC on Base**: Required for deployment payments ($0.01 USDC per deploy).
- **Wallet**: An EVM-compatible wallet (Base network).

### Installation

```bash
# Clone the repository
git clone https://github.com/ianmihura/x402-hosting.git
cd x402-hosting

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your specific configuration (S3 credentials, receiver wallet, etc.)
```

### Running Locally

```bash
# Development mode (with nodemon)
npm run dev

# Production build and run
npm run build
npm run prod
```

### 🧪 Testing

```bash
# Run unit and integration tests
npm test

# Run tests with coverage report
npm run test:coverage
```

## 📜 License

MIT
