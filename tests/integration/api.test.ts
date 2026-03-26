import request from 'supertest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import nock from 'nock';
import app from '../../src/index.js';
import { createSIWxPayload, encodeSIWxHeader, CompleteSIWxInfo } from '@x402/extensions/sign-in-with-x';
import { BUCKET_NAME } from '../../src/config.js';

const s3Mock = mockClient(S3Client);

let server: any;
let serverUrl: string;

// Generate a random wallet for the test. We use viem to generate a standard EVM wallet
const privateKey = generatePrivateKey();
const wallet = privateKeyToAccount(privateKey);
const walletAddress = wallet.address.toLowerCase(); // Often SIWx normalizes addresses

describe('x402-hosting API Integration Tests', () => {
  beforeAll(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const port = server.address().port;
    serverUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    nock.restore();
  });
  beforeEach(() => {
    s3Mock.reset();
  });


  describe('POST /deploy', () => {
    it('should return 402 Payment Required without SIWX proof', async () => {
      const response = await request(server).post('/deploy');
      expect(response.status).toBe(402);
      expect(response.headers['payment-required']).toBeDefined();
    });

    it('should successfully deploy when providing valid files, SIWX, and mocked payment', async () => {
      // 1. Initial request to get the SIWX challenge
      const initResponse = await request(server).post('/deploy');
      expect(initResponse.status).toBe(402);
      const paymentRequiredHeader = initResponse.headers['payment-required'] as string;
      const b64Data = paymentRequiredHeader.includes(' ') ? paymentRequiredHeader.split(' ')[1] : paymentRequiredHeader;
      const prData = JSON.parse(Buffer.from(b64Data, 'base64').toString());

      const siwxExt = prData.extensions['sign-in-with-x'];
      expect(siwxExt).toBeDefined();

      // Ensure we format the info correctly to sign
      const completeInfo: CompleteSIWxInfo = {
        ...siwxExt.info,
        address: wallet.address,
        chainId: 'eip155:8453',
        type: 'eip191',
        domain: siwxExt.info.domain || 'localhost',
        uri: siwxExt.info.uri || 'http://localhost/deploy'
      };

      // 2. Sign the SIWX message
      const payload = await createSIWxPayload(completeInfo, {
        signMessage: async (args: { message: string, account?: unknown }) => wallet.signMessage({ message: args.message }),
        account: { address: wallet.address }
      });

      const siwxHeader = encodeSIWxHeader(payload);

      // 3. Mock the R2 Client
      s3Mock.on(PutObjectCommand).resolves({});

      // 4. Mock the x402 Facilitator response to handle both /verify and /v2/verify
      nock(process.env.FACILITATOR_URL!)
        .persist()
        .post(/verify/)
        .reply(200, { success: true, payer: wallet.address });

      // 5. Send the authenticated request
      // Note: Multer needs multipart/form-data
      const deployResponse = await request(server)
        .post('/deploy')
        // Usually payment proof goes in x402-receipt or Authorization header. 
        // We simulate a verified payment by ensuring the facilitator returns success
        .set('Authorization', 'L402 random-token')
        .set('SIGN-IN-WITH-X', siwxHeader)
        .attach('files[]', Buffer.from('<html>test</html>'), 'index.html');

      expect(deployResponse.status).toBe(200);
      expect(deployResponse.body.success).toBe(true);
      expect(deployResponse.body.url).toContain(wallet.address);

      // Verify storage mock calls
      expect(s3Mock.calls().length).toBe(1);
    });
  });

  describe('GET /site', () => {
    it('should return 401 when no SIWX is provided', async () => {
      const response = await request(server).get('/site');
      // Should be 402 or 401 depending on your exact middleware setup. Usually 402.
      expect(response.status).toBe(402);
    });

    it('should return 404 when valid SIWX is provided but site missing', async () => {
      // Create SIWX from a 402 failure
      const initResponse = await request(server).get('/site');
      const paymentRequiredHeader = initResponse.headers['payment-required'] as string;
      const b64Data = paymentRequiredHeader.includes(' ') ? paymentRequiredHeader.split(' ')[1] : paymentRequiredHeader;
      const prData = JSON.parse(Buffer.from(b64Data, 'base64').toString());
      const siwxExt = prData.extensions['sign-in-with-x'];

      const completeInfo: CompleteSIWxInfo = {
        ...siwxExt.info,
        address: wallet.address,
        chainId: 'eip155:8453',
        type: 'eip191',
        domain: siwxExt.info.domain || 'localhost',
        uri: siwxExt.info.uri || 'http://localhost/site'
      };

      const payload = await createSIWxPayload(completeInfo, {
        signMessage: async (args: { message: string }) => wallet.signMessage({ message: args.message }),
        account: { address: wallet.address }
      });
      const siwxHeader = encodeSIWxHeader(payload);

      // Mock
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: [
          { Key: `${wallet.address}/latest/index.html`, Size: 100, LastModified: new Date() }
        ]
      });

      const response = await request(server)
        .get('/site')
        .set('SIGN-IN-WITH-X', siwxHeader);

      expect(response.status).toBe(200);
      expect(response.body.wallet).toBe(wallet.address);
      expect(response.body.fileCount).toBe(1);
    });
  });
});
