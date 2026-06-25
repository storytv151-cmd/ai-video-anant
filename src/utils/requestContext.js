import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage();

const runWithRequestContext = ({ requestId, ip, path, method } = {}, handler) =>
  storage.run(
    {
      requestId: requestId || null,
      userId: null,
      ip: ip || null,
      path: path || null,
      method: method || null,
      provider: null,
      generationJobId: null,
      walletTransactionId: null,
      startAtMs: Date.now(),
    },
    handler,
  );

const getRequestContext = () => storage.getStore() || null;

const setRequestContextValue = (key, value) => {
  const store = storage.getStore();
  if (!store) {
    return;
  }
  store[key] = value;
};

export { runWithRequestContext, getRequestContext, setRequestContextValue };
