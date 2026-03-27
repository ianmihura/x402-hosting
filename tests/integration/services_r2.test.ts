import nock from 'nock';
// 1. MUST BE FIRST: Allow real network connections for this test suite
// tests/setup.ts disables them globally, so we enable them here.
nock.enableNetConnect();

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// 2. Load .env variables before importing any application code.
// In ESM, we must use dynamic imports later to ensure these env vars
// are present when src/config.ts (the R2 client initializer) is evaluated.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

// Global variables to hold the dynamically imported functions
let deploySite: any;
let getSiteMetadata: any;
let deleteSite: any;
let R2_BUCKET_ENDPOINT: string;

describe('R2 Services Integration Test Suite (No Mocks)', () => {
  const walletAddress = '0xtest';

  beforeAll(async () => {
    // 3. Dynamic imports: this ensures the code inside these modules
    // sees the updated process.env values.
    const main = await import('../../src/services/main.js');
    deploySite = main.deploySite;
    getSiteMetadata = main.getSiteMetadata;
    deleteSite = main.deleteSite;

    const config = await import('../../src/config.js');
    R2_BUCKET_ENDPOINT = config.R2_BUCKET_ENDPOINT;

    // Initial cleanup of the test folder
    await cleanup();
  });

  afterAll(async () => {
    // Final cleanup
    await cleanup();
  });

  const cleanup = async () => {
    return
    try {
      if (deleteSite) {
        await deleteSite(walletAddress);
      }
    } catch (err) {
      // Ignore errors if site doesn't exist yet
    }
  };

  it('should perform a full deployment lifecycle: deploy, get metadata, and delete', async () => {
    expect(deploySite).toBeDefined();

    // Mimic Multer files similar to unit tests
    const mockFiles: Partial<Express.Multer.File>[] = [
      {
        originalname: 'index.html',
        buffer: Buffer.from('<html><body>R2 Integration Test</body></html>'),
        mimetype: 'text/html',
      },
      {
        originalname: 'style.css',
        buffer: Buffer.from('body { background: #f0f0f0; }'),
        mimetype: 'text/css',
      }
    ];

    // --- Step 1: Deploy ---
    const deployResult = await deploySite(walletAddress, mockFiles as Express.Multer.File[]);

    expect(deployResult.message).toBe('Site deployed successfully');
    expect(deployResult.url).toBe(`${R2_BUCKET_ENDPOINT}/${walletAddress}/latest/index.html`);

    // Fetch the deployResult.url and verify we see the same file contents we pushed
    const fetchResponse = await fetch(deployResult.url);
    expect(fetchResponse.status).toBe(200);
    const content = await fetchResponse.text();
    expect(content).toBe('<html><body>R2 Integration Test</body></html>');


    // --- Step 2: Get Metadata (Verify) ---
    const metadata = await getSiteMetadata(walletAddress);

    expect(metadata).not.toBeNull();
    if (metadata) {
      expect(metadata.wallet).toBe(walletAddress);
      expect(metadata.fileCount).toBe(2);

      const fileNames = metadata.files.map((f: any) => f.name);
      expect(fileNames).toContain('index.html');
      expect(fileNames).toContain('style.css');
    }

    // --- Step 3: Delete(Cleanup)-- -
    const deleted = await deleteSite(walletAddress);
    expect(deleted).toBe(true);

    // --- Step 4: Final verification ---
    const metadataAfterDelete = await getSiteMetadata(walletAddress);
    expect(metadataAfterDelete).toBeNull();
  }, 30000); // 30s timeout for R2 network calls
});
