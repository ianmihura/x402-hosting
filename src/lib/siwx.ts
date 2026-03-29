import { SIWxStorage } from '@x402/extensions/sign-in-with-x';
import { getSiteMetadata } from './../services/main.js';

/*
 * 
 * NOTE: We don't need to save or retrieve anything: source of truth is resource existance in R2 itself:
 * We will later query R2 with the walletAddress looking for it's resources.
 * If we ever decouple this source of truth, we implement a persistent storage(eg.redis).
 */
class MockSIWxStorage implements SIWxStorage {
  hasPaid(resource: string, address: string): boolean {
    return true; // we will later query R2 with the wallet looking for it's resources.
  }
  recordPayment(resource: string, address: string): void {
    // Payment recorded by creating the files in R2 during the /deploy endpoint handler.
  }
}

/**
 * Storage for tracking SIWX payments and authentication.
 * 
 * Source of truth:
 * 1. Hybrid in-memory: track latest payment for existing session/server run.
 * 2. R2 Persistence: Check file modification dates to allow free re-deploys within 30 days.
 */
export class R2SIWxStorage implements SIWxStorage {
  private lastPayments = new Map<string, number>(); // wallet -> latest payment timestamp

  async hasPaid(resource: string, address?: string): Promise<boolean> {
    if (!address) {
      return false;
    }

    const wallet = address.toLowerCase();

    // Management routes (/site) are auth-only once identity is proven via SIWX signature.
    // if (resource in routes && Object.keys(routes[resource].accepts).length !== 0) { // TODO make this dynamic
    if (resource !== '/deploy') {
      return true
    }

    const memTime = this.lastPayments.get(wallet);
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (memTime && (Date.now() - memTime < thirtyDaysMs)) {
      return true;
    }

    // Check R2 for site metadata (persistence fallback)
    try {
      const metadata = await getSiteMetadata(address);
      if (metadata && metadata.files && metadata.files.length > 0) {
        let oldestDate: Date | undefined;
        for (const f of metadata.files) {
          if (f.lastModified && (!oldestDate || f.lastModified < oldestDate)) {
            oldestDate = f.lastModified;
          }
        }

        if (oldestDate && (Date.now() - oldestDate.getTime() < thirtyDaysMs)) {
          this.lastPayments.set(wallet, oldestDate.getTime());
          return true;
        }

        if (oldestDate && Date.now() - oldestDate.getTime() > thirtyDaysMs) {
          return false; // Site exists and is older than 30 days, new payment required
        }
      }
    } catch (err) {
      // S3 error (or mock error)
      return false;
    }

    return false;
  }

  recordPayment(resource: string, address: string): void {
    // This is called by the .onAfterSettle hook when a payment is verified.
    this.lastPayments.set(address.toLowerCase(), Date.now());
  }
}

export const siwxStorage = new R2SIWxStorage();
