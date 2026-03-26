import { SIWxStorage } from '@x402/extensions/sign-in-with-x';

/**
 * Storage for tracking SIWX payments and authentication.
 * 
 * NOTE: We don't need to save or retrieve anything: source of truth is resource existance in R2 itself:
 * We will later query R2 with the walletAddress looking for it's resources.
 * If we ever decouple this source of truth, we implement a persistent storage (eg. redis).
 */
class InMemorySIWxStorage implements SIWxStorage {
  hasPaid(resource: string, address: string): boolean {
    return true; // we will later query R2 with the wallet looking for it's resources.
  }
  recordPayment(resource: string, address: string): void {
    return; // nothing saved
  }
}

export const siwxStorage = new InMemorySIWxStorage();
