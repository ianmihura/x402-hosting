import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { deploySite } from '../../../src/services/main.js';
import { R2_BUCKET_ENDPOINT, BUCKET_NAME } from '../../../src/config.js';

// Mock the S3Client globally. All instances of S3Client created in the app will use this mock.
const s3Mock = mockClient(S3Client);

describe('deploySite', () => {
  beforeEach(() => {
    // Reset the mock before each test to clear call history and behavior
    s3Mock.reset();
  });

  it('uploads files to R2 and return the site URL', async () => {
    // Mock the response for PutObjectCommand
    s3Mock.on(PutObjectCommand).resolves({});

    const walletAddress = '0x1234567890abcdef';
    const mockFiles: Partial<Express.Multer.File>[] = [
      {
        originalname: 'index.html',
        buffer: Buffer.from('<html>Hello World</html>'),
        mimetype: 'text/html',
      },
      {
        originalname: 'style.css',
        buffer: Buffer.from('body { color: red; }'),
        mimetype: 'text/css',
      }
    ];

    const result = await deploySite(walletAddress, mockFiles as Express.Multer.File[]);

    // Ensure the expected URL is returned
    expect(result.url).toBe(`${R2_BUCKET_ENDPOINT}/${walletAddress}/latest/index.html`);
    expect(result.message).toBe('Site deployed successfully');

    // Ensure S3 calls were made correctly
    expect(s3Mock.calls().length).toBe(2);

    // Verify the arguments passed to PutObjectCommand for the first file
    const firstCallArgs = s3Mock.call(0).args[0].input as PutObjectCommand['input'];
    expect(firstCallArgs.Bucket).toBe(BUCKET_NAME);
    expect(firstCallArgs.Key).toBe(`${walletAddress}/latest/index.html`);
    expect(firstCallArgs.ContentType).toBe('text/html');

    // Verify the arguments passed to PutObjectCommand for the second file
    const secondCallArgs = s3Mock.call(1).args[0].input as PutObjectCommand['input'];
    expect(secondCallArgs.Key).toBe(`${walletAddress}/latest/style.css`);
    expect(secondCallArgs.ContentType).toBe('text/css');
  });
});
