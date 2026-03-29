# x402 Hosting Service 🚀

A minimalistic web hosting service designed for AI agents. Deploy static sites and files to the web with a single HTTP request, using the [x402 protocol](https://github.com/coinbase/x402) for frictionless payments and [Sign-In With X (SIWX)](https://github.com/coinbase/x402) for secure authentication.

No accounts, no dashboards, no sign-up — just an API endpoint that accepts a payment and returns a live URL.

## 🏗 Features

- **Agent-First**: Designed for programmatic access by LLM-based agents.
- **x402 Native**: Payments ($0.01 on Base) serve as the access credential.
- **SIWX Auth**: Securely manage your deployments (update/delete) using your wallet signature.
- **30-Day Window**: Pay once, and enjoy unlimited re-deployments for 30 days.
- **Fast & Scalable**: Static files are hosted on high-performance R2/S3 storage.

## 📡 API Endpoints

All protected endpoints use `HTTP 402 Payment Required` logic. If a payment or SIWX signature is missing, the server will return a `402` status with the following headers:

| Header | Direction | Description |
| --- | --- | --- |
| `PAYMENT-REQUIRED` | Server → Client | Base64-encoded `PaymentRequired` object |
| `PAYMENT-SIGNATURE` | Client → Server | Base64-encoded `PaymentPayload` object |
| `PAYMENT-RESPONSE` | Server → Client | Base64-encoded `SettlementResponse` object |

### 1. Deploy / Update a Site
`POST /deploy`

Deploys a set of static files. 
- **Payment**: Required for new sites or if the last deployment was > 30 days ago.
- **Content-Type**: `multipart/form-data` OR `application/json` (Base64).
- **Body**: Files should be uploaded in the `files[]` field (Multipart) or in a `files` array (JSON).
- **Price**: $0.01 USDC on Base.

**Example (cURL):**
```bash
# First request returns 402 with SIWX challenge and Payment requirements
curl -X POST http://localhost:3000/deploy \
  -H "SIGN-IN-WITH-X: <base64_siwx_payload>" \
  -H "PAYMENT-SIGNATURE: <base64_payment_payload>" \
  -F "files[]=@index.html" \
  -F "files[]=@style.css"
```

**Example (cURL - JSON):**
```bash
curl -X POST http://localhost:3000/deploy \
  -H "SIGN-IN-WITH-X: <base64_siwx_payload>" \
  -H "PAYMENT-SIGNATURE: <base64_payment_payload>" \
  -H "Content-Type: application/json" \
  -d '{"files": [{"name": "index.html", "content": "PGh0bWw+...", "type": "text/html"}]}'
```


**Expected Result (200 OK):**
```json
{
  "success": true,
  "url": "https://r2-endpoint.com/0x.../latest/index.html",
  "message": "Site deployed successfully"
}
```

### 2. Get Site Metadata
`GET /site`

Returns information about your currently deployed site.
- **Auth**: Requires a valid `SIGN-IN-WITH-X` header (no additional payment).

**Example (cURL):**
```bash
curl -X GET http://localhost:3000/site \
  -H "SIGN-IN-WITH-X: <base64_siwx_payload>"
```

### 3. Delete a Site
`DELETE /site`

Permanently removes your hosted content.
- **Auth**: Requires a valid `SIGN-IN-WITH-X` header.

**Example (cURL):**
```bash
curl -X DELETE http://localhost:3000/site \
  -H "SIGN-IN-WITH-X: <base64_siwx_payload>"
```

### 4. Health Check
`GET /health` (Public)

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18+ (uses ESM and Experimental VM Modules for tests).
- **Environment**: S3/R2 credentials and a Base network receiver address.

### Installation
```bash
git clone https://github.com/ianmihura/x402-hosting.git
cd x402-hosting
npm install
cp .env.example .env # Configure your R2 and Facilitator settings
```

### Running Locally
```bash
npm run dev   # Development mode
npm test      # Run unit and integration tests
```

## 📜 License
MIT
