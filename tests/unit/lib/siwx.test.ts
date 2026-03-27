import { jest } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { R2SIWxStorage } from '../../../src/lib/siwx.js';
import { BUCKET_NAME } from '../../../src/config.js';

const s3Mock = mockClient(S3Client);

describe('R2SIWxStorage', () => {
  let storage: R2SIWxStorage;
  const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const resource = '/deploy';

  beforeEach(() => {
    s3Mock.reset();
    storage = new R2SIWxStorage();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('hasPaid', () => {
    it('should return false if address is missing', async () => {
      const result = await storage.hasPaid(resource, undefined);
      expect(result).toBe(false);
    });

    it('should return true for non-deploy routes (auth-only)', async () => {
      const result = await storage.hasPaid('/site', walletAddress);
      expect(result).toBe(true);
    });

    it('should return true if payment is found in memory', async () => {
      const now = Date.now();
      storage.recordPayment(resource, walletAddress);
      
      const result = await storage.hasPaid(resource, walletAddress);
      expect(result).toBe(true);
      expect(s3Mock.calls().length).toBe(0); // Should not call R2
    });

    it('should return true if payment is found in R2 (within 30 days)', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10); // 10 days ago

      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: [
          { Key: `${walletAddress}/latest/index.html`, LastModified: recentDate }
        ]
      });

      const result = await storage.hasPaid(resource, walletAddress);
      expect(result).toBe(true);
      expect(s3Mock.calls().length).toBe(1);
    });

    it('should return false if site in R2 is older than 30 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31); // 31 days ago

      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: [
          { Key: `${walletAddress}/latest/index.html`, LastModified: oldDate }
        ]
      });

      const result = await storage.hasPaid(resource, walletAddress);
      expect(result).toBe(false);
    });

    it('should return true for /deploy even if not in R2 (unblock settlement)', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({ Contents: [] });

      const result = await storage.hasPaid(resource, walletAddress);
      // It returns true to let core x402Middleware handle the settlement
      expect(result).toBe(true);
    });

    it('should return false on S3 error (fallback to payment requirement)', async () => {
      s3Mock.on(ListObjectsV2Command).rejects(new Error('S3 Connection Failed'));

      const result = await storage.hasPaid(resource, walletAddress);
      expect(result).toBe(false);
    });
  });

  describe('recordPayment', () => {
    it('should update internal state and allow subsequent hasPaid to return true', async () => {
      // 1. Initial check (not in memory, not in R2)
      s3Mock.on(ListObjectsV2Command).resolves({ Contents: [] });
      let result = await storage.hasPaid(resource, walletAddress);
      expect(result).toBe(true); // Unblocked for settlement
      expect(s3Mock.calls().length).toBe(1);

      // 2. Record payment
      storage.recordPayment(resource, walletAddress);

      // 3. Check again
      s3Mock.reset(); // Reset mock to ensure it's not called
      result = await storage.hasPaid(resource, walletAddress);
      expect(result).toBe(true);
      expect(s3Mock.calls().length).toBe(0); // Memory hit
    });
  });
});
