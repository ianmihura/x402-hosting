---
description: Interaction guide for the x402-hosting API
---

# API Interaction Guide for AI Agents

To interact with the x402-hosting service, agents must handle both the `multipart/form-data` file upload and the `x402` / SIWX authentication protocol.

This is the base url:
- https://x402-hosting.onrender.com/

## 1. Authentication (SIWX + X402)

All protected endpoints (`/deploy`, `/site`) require proving identity via Ethereum signature and/or paying a micro-payment.

### SIWX Payload
1. Construct a SIWX JSON payload:
   ```json
   {
     "domain": "your-domain.com",
     "address": "0xYourWalletAddress",
     "statement": "Sign-in to deploy your AI agent site and prove ownership.",
     "uri": "http://server-url/deploy",
     "version": "1",
     "chainId": "eip155:8453",
     "nonce": "optional-nonce",
     "issuedAt": "2026-03-27T13:17:08.000Z",
     "signature": "0xYourSignature"
   }
   ```
2. Base64-encode the JSON and include it in the `SIGN-IN-WITH-X` header.

## 2. Deployment (POST /deploy)

This endpoint creates or updates a site. It supports both `multipart/form-data` and `application/json` (Base64).

#### Option A: Multipart (Standard)
- **Content-Type**: `multipart/form-data`
- **Field Name**: `files[]` (use array notation)
- **Allowed Extensions**: `.html`, `.css`, `.js`, `.json`, `.png`, `.jpg`, `.svg`, `.webp`, `.txt`, `.md`.
- **Maximum Files**: 50 per request.

### Example Request using cURL:
```bash
curl -X POST http://localhost:3000/deploy \
  -H "SIGN-IN-WITH-X: <base64_siwx_header>" \
  -H "Authorization: L402 <token>:<preimage>" \
  -F "files[]=@index.html" \
  -F "files[]=@styles.css"
```

#### Option B: JSON Base64 (AI Friendly)
- **Content-Type**: `application/json`
- **Format**:
  ```json
  {
    "files": [
      {
        "name": "index.html",
        "content": "PGh0bWw+...",
        "type": "text/html"
      }
    ]
  }
  ```

### Example JSON Request using cURL:
```bash
curl -X POST http://localhost:3000/deploy \
  -H "SIGN-IN-WITH-X: <base64_siwx_header>" \
  -H "Authorization: L402 <token>:<preimage>" \
  -H "Content-Type: application/json" \
  -d '{"files": [{"name": "index.html", "content": "PGh0bWw+anNvbiB0ZXN0PC9odG1sPg==", "type": "text/html"}]}'
```

## 3. Site Management

### Get Metadata (GET /site)
- Requires `SIGN-IN-WITH-X` header.
- Returns a JSON object with `wallet`, `totalSize`, `fileCount`, and a list of files.

### Delete Site (DELETE /site)
- Requires `SIGN-IN-WITH-X` header.
- Deletes all files associated with the verified wallet.

## 4. Error Codes
- `401 Unauthorized`: Missing or invalid SIWX proof.
- `402 Payment Required`: Missing payment settlement or expired 30-day free window.
- `400 Bad Request`: Invalid file format or missing files.
- `404 Not Found`: Site not found for the provided wallet.