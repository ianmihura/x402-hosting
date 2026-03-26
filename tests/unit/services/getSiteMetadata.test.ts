import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSiteMetadata } from '../../../src/services/main.js';
import { BUCKET_NAME } from '../../../src/config.js';

const s3Mock = mockClient(S3Client);

describe('getSiteMetadata', () => {
  const walletAddress = '0x1234567890abcdef';

  beforeEach(() => {
    s3Mock.reset();
  });

  it('should return null if no files are found (empty payload)', async () => {
    s3Mock.on(ListObjectsV2Command).resolves({ Contents: [] });

    const result = await getSiteMetadata(walletAddress);

    expect(result).toBeNull();
    expect(s3Mock.calls().length).toBe(1);
    const callArgs = s3Mock.call(0).args[0].input as ListObjectsV2Command['input'];
    expect(callArgs.Bucket).toBe(BUCKET_NAME);
    expect(callArgs.Prefix).toBe(`${walletAddress}/latest/`);
  });

  it('should return null if no files are found (undefined payload)', async () => {
    s3Mock.on(ListObjectsV2Command).resolves({ }); // Contents is undefined

    const result = await getSiteMetadata(walletAddress);

    expect(result).toBeNull();
  });

  it('should return correct metadata when files are found', async () => {
    const mockFiles = [
      {
        Key: `${walletAddress}/latest/index.html`,
        Size: 1024,
        LastModified: new Date('2026-03-26T12:00:00Z'),
      },
      {
        Key: `${walletAddress}/latest/assets/image.png`,
        Size: 2048,
        LastModified: new Date('2026-03-26T12:05:00Z'),
      }
    ];

    s3Mock.on(ListObjectsV2Command).resolves({ Contents: mockFiles });

    const result = await getSiteMetadata(walletAddress);

    expect(result).not.toBeNull();
    expect(result!.wallet).toBe(walletAddress);
    expect(result!.fileCount).toBe(2);
    expect(result!.totalSize).toBe(3072);

    expect(result!.files[0].name).toBe('index.html');
    expect(result!.files[0].size).toBe(1024);
    expect(result!.files[0].lastModified).toEqual(new Date('2026-03-26T12:00:00Z'));

    expect(result!.files[1].name).toBe('assets/image.png');
    expect(result!.files[1].size).toBe(2048);
  });
});
