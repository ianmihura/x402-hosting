import nock from 'nock';
// 1. MUST BE FIRST: Allow real network connections for R2 and Anvil
nock.enableNetConnect();

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import request from 'supertest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createSIWxPayload, encodeSIWxHeader, CompleteSIWxInfo } from '@x402/extensions/sign-in-with-x';
import net from 'node:net';

// Manually load .env variables for real R2
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

// Global variables to hold the dynamically imported app
let app: any;
let R2_BUCKET_ENDPOINT: string;
let server: any;
let isAnvilRunning = false;

const mockPaymentPayload = Buffer.from(JSON.stringify({
  x402Version: 1,
  accepted: {
    scheme: 'exact',
    network: 'eip155:8453',
  },
  receipt: 'random-mockauth-receipt'
})).toString('base64');

describe('E2E Hosting Full Lifecycle (Anvil + Real R2)', () => {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const evmAddress = account.address.toLowerCase();

  beforeAll(async () => {
    // Check if anvil is already running on port 8545 (Requirement)
    isAnvilRunning = await new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
      socket.on('error', () => { socket.destroy(); resolve(false); });
      socket.connect(8545, '127.0.0.1');
    });

    if (!isAnvilRunning) {
      console.warn('Anvil not detected on port 8545. To run E2E tests spinup anvil instance in port 8545 or `npm run test:e2e`.');
      console.log('Skipping E2E Test Suite.')
      return;
    }

    // Load application modules dynamically AFTER env vars are set
    const main = await import('../../src/index.js');
    app = main.default;

    const config = await import('../../src/config.js');
    R2_BUCKET_ENDPOINT = config.R2_BUCKET_ENDPOINT;

    // Fire up the local server
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
  }, 60000);

  afterAll(async () => {
    if (server) server.close();
    nock.restore();
    nock.cleanAll();
  }, 60000);

  it('should complete the full payment/deployment/metadata/deletion lifecycle', async () => {
    if (!isAnvilRunning) {
      // Gracefully skip if anvil is not available
      return;
    }

    const port = server.address().port;
    const serverUrl = `http://127.0.0.1:${port}`;
    const facilitatorUrl = process.env.FACILITATOR_URL!;

    // --- Step 1: Upload without SIWX -> expect 402 with challenge ---
    // Note: We MUST include the PAYMENT-SIGNATURE in the first request for deployments.
    const res1 = await request(server)
      .post('/deploy')
      .set('PAYMENT-SIGNATURE', mockPaymentPayload)
      .attach('files[]', Buffer.from('<html><body>E2E TEST</body></html>'), 'index.html');

    expect(res1.status).toBe(402);
    expect(res1.headers['payment-required']).toBeDefined();

    // Parse the x402 requirements from the 402 response
    const paymentRequiredHeader = res1.headers['payment-required'] as string;
    const b64Data = paymentRequiredHeader.includes(' ') ? paymentRequiredHeader.split(' ')[1] : paymentRequiredHeader;
    const prData = JSON.parse(Buffer.from(b64Data, 'base64').toString());
    const siwxExt = prData.extensions['sign-in-with-x'];
    expect(siwxExt).toBeDefined();

    // --- Step 2: Prepare SIWX Payment Proof ---
    const completeInfo: CompleteSIWxInfo = {
      ...siwxExt.info,
      address: account.address,
      chainId: 'eip155:8453', // Base
      type: 'eip191',
      domain: siwxExt.info.domain || 'localhost',
      uri: siwxExt.info.uri || `${serverUrl}/deploy`
    };

    // Sign the challenge
    const payload = await createSIWxPayload(completeInfo, {
      signMessage: async (args: { message: string }) => account.signMessage({ message: args.message }),
      account: { address: account.address }
    });
    const siwxHeader = encodeSIWxHeader(payload);

    // Mock Facilitator to verify and settle payment successfully
    nock(facilitatorUrl)
      .persist()
      .post(/\/verify/)
      .reply(200, (uri) => {
        console.log(`[Mock Facilitator E2E] Hit: ${uri}`);
        return {
          isValid: true,
          payer: account.address,
        };
      });

    nock(facilitatorUrl)
      .persist()
      .post(/\/settle/)
      .reply(200, (uri) => {
        console.log(`[Mock Facilitator E2E] Hit: ${uri}`);
        return {
          success: true,
          payer: account.address,
          transaction: '0xmockhash-e2e',
          network: 'eip155:8453',
        };
      });

    // --- Step 3: Upload with both payment and SIWX -> expect 200 SUCCESS ---
    const res2 = await request(server)
      .post('/deploy')
      .set('PAYMENT-SIGNATURE', mockPaymentPayload)
      .set('SIGN-IN-WITH-X', siwxHeader)
      .attach('files[]', Buffer.from('<html><body>E2E SUCCESS</body></html>'), 'index.html')
      .attach('files[]', Buffer.from('body { background: white; }'), 'style.css');

    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    const siteUrl = res2.body.url;
    expect(siteUrl.toLowerCase()).toContain(evmAddress.toLowerCase());

    // --- Step 4: GET /site to see metadata ---
    const res3 = await request(server)
      .get('/site')
      .set('SIGN-IN-WITH-X', siwxHeader);

    expect(res3.status).toBe(200);
    expect(res3.body.wallet.toLowerCase()).toBe(evmAddress.toLowerCase());
    expect(res3.body.fileCount).toBe(2);

    // --- Step 5: Fetch URL to verify hosted content ---
    const fetchRes = await fetch(siteUrl);
    expect(fetchRes.status).toBe(200);
    const content = await fetchRes.text();
    expect(content).toBe('<html><body>E2E SUCCESS</body></html>');

    // --- Step 6: DELETE /site to remove the site ---
    const res4 = await request(server)
      .delete('/site')
      .set('SIGN-IN-WITH-X', siwxHeader);

    expect(res4.status).toBe(200);
    expect(res4.body.message).toBe('Site deleted successfully');

    // --- Step 7: Final verification ---
    const res5 = await request(server)
      .get('/site')
      .set('SIGN-IN-WITH-X', siwxHeader);
    expect(res5.status).toBe(404);

    const fetchResFinal = await fetch(siteUrl);
    expect(fetchResFinal.status).not.toBe(200);
  }, 60000);
});
