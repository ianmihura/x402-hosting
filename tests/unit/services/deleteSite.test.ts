import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { deleteSite } from '../../../src/services/main.js';
import { BUCKET_NAME } from '../../../src/config.js';

const s3Mock = mockClient(S3Client);

describe('deleteSite', () => {
  const walletAddress = '0x1010101010101010';

  beforeEach(() => {
    s3Mock.reset();
  });

  it('should return false if the site does not exist', async () => {
    // 1. Mock ListObjectsV2Command to return nothing
    s3Mock.on(ListObjectsV2Command).resolves({ Contents: [] });

    const result = await deleteSite(walletAddress);

    expect(result).toBe(false);

    // Verify DeleteObjectsCommand was NOT called
    const deleteCalls = s3Mock.commandCalls(DeleteObjectsCommand);
    expect(deleteCalls.length).toBe(0);
  });

  it('should list and delete all objects associated with the site, returning true', async () => {
    const mockFiles = [
      { Key: `${walletAddress}/latest/index.html` },
      { Key: `${walletAddress}/latest/assets/image.png` }
    ];

    // 1. Mock ListObjectsV2Command to return the objects
    s3Mock.on(ListObjectsV2Command).resolves({ Contents: mockFiles });

    // 2. Mock DeleteObjectsCommand to resolve successfully
    s3Mock.on(DeleteObjectsCommand).resolves({});

    const result = await deleteSite(walletAddress);

    // 3. Assertions
    expect(result).toBe(true);
    expect(s3Mock.calls().length).toBe(2);

    // Verify List command
    const listArgs = s3Mock.call(0).args[0].input as ListObjectsV2Command['input'];
    expect(listArgs.Bucket).toBe(BUCKET_NAME);
    expect(listArgs.Prefix).toBe(`${walletAddress}/latest/`);

    // Verify Delete command
    const deleteArgs = s3Mock.call(1).args[0].input as DeleteObjectsCommand['input'];
    expect(deleteArgs.Bucket).toBe(BUCKET_NAME);
    expect(deleteArgs.Delete?.Objects).toHaveLength(2);
    expect(deleteArgs.Delete?.Objects).toContainEqual({ Key: `${walletAddress}/latest/index.html` });
    expect(deleteArgs.Delete?.Objects).toContainEqual({ Key: `${walletAddress}/latest/assets/image.png` });
  });
});
