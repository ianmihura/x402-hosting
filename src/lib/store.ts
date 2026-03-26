import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId: string;
}

export const storage = new AsyncLocalStorage<RequestContext>();

export const getRequestId = () => {
  const store = storage.getStore();
  return store?.requestId || 'system';
};
