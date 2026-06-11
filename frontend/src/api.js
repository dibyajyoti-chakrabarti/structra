import axios from 'axios';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const requestCache = new Map();
const inflightRequests = new Map();

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';

const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${key}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

const cloneData = (data) => {
  if (data == null) return data;
  if (typeof structuredClone === 'function') {
    return structuredClone(data);
  }
  return JSON.parse(JSON.stringify(data));
};

const getSessionCacheScope = () => localStorage.getItem('structra-user-plan') || 'anonymous';

const normalizeUrlPath = (url = '') => url.replace(/^\/+/, '');

const resolveCacheTtlMs = (url = '') => {
  const normalized = normalizeUrlPath(url);

  if (normalized === 'auth/profile/') return 120000;
  if (normalized === 'users/search/') return 10000;
  if (normalized === 'workspaces/') return 60000;
  if (normalized === 'workspaces/starred/') return 30000;
  if (normalized === 'workspaces/public/search/') return 15000;
  if (/^workspaces\/[^/]+\/canvases\/[^/]+\/$/.test(normalized)) return 20000;
  if (/^systems\/[^/]+\/comments\/$/.test(normalized)) return 10000;
  if (/^systems\/[^/]+\/comments\/[^/]+\/$/.test(normalized)) return 10000;
  if (/^systems\/[^/]+\/canvas\/$/.test(normalized)) return 8000;
  if (/^workspaces\/[^/]+\/$/.test(normalized)) return 45000;
  if (/^users\/[^/]+\/profile\/$/.test(normalized)) return 45000;
  if (url.includes('/members/') || url.includes('/invitations/')) return 30000;
  if (url.includes('/canvases/') || url.includes('/system-permissions/')) return 30000;
  if (url.startsWith('workspaces/')) return 45000;
  return 30000;
};

const shouldCacheRequest = (method, config = {}) =>
  method === 'get' && config.cache !== false;

const buildCacheKey = (method, url, config = {}) => {
  const sessionScope = getSessionCacheScope();
  const params = stableStringify(config.params || {});
  return `${sessionScope}|${method.toLowerCase()}|${url}|${params}`;
};

const createCachedAxiosResponse = (cached, config) => ({
  data: cloneData(cached.data),
  status: cached.status,
  statusText: cached.statusText,
  headers: cached.headers,
  config,
  request: null,
});

const clearApiCache = () => {
  requestCache.clear();
  inflightRequests.clear();
};

const invalidateApiCacheByPredicate = (predicate) => {
  for (const key of requestCache.keys()) {
    if (predicate(key)) {
      requestCache.delete(key);
    }
  }
};

const invalidateApiCacheByUrlHint = (url = '') => {
  if (!url) {
    clearApiCache();
    return;
  }
  const normalized = normalizeUrlPath(url);
  const systemCommentListMatch = normalized.match(/^systems\/([^/]+)\/comments\/[^/]+\/$/);
  const systemId = normalized.match(/^systems\/([^/]+)\//)?.[1] || null;

  invalidateApiCacheByPredicate((key) => {
    if (normalized.startsWith('notifications/')) {
      return key.includes('|notifications/');
    }

    if (key.includes(`|${normalized}|`) || key.includes('|workspaces/')) {
      return true;
    }

    if (systemCommentListMatch) {
      const [, commentSystemId] = systemCommentListMatch;
      if (key.includes(`|systems/${commentSystemId}/comments/|`)) {
        return true;
      }
    }

    if (normalized.startsWith('systems/') && systemId) {
      if (
        key.includes('|systems/') ||
        key.includes('|workspaces/') ||
        key.includes('/canvases/')
      ) {
        return true;
      }
    }

    return false;
  });
};

const rawGet = api.get.bind(api);
api.get = (url, config = {}) => {
  const method = 'get';
  if (!shouldCacheRequest(method, config)) {
    return rawGet(url, config);
  }

  const cacheKey = buildCacheKey(method, url, config);
  const now = Date.now();
  const cached = requestCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return Promise.resolve(createCachedAxiosResponse(cached, config));
  }

  const inflight = inflightRequests.get(cacheKey);
  if (inflight) {
    return inflight.then((response) => createCachedAxiosResponse({
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      expiresAt: now + resolveCacheTtlMs(url),
    }, config));
  }

  const requestPromise = rawGet(url, config)
    .then((response) => {
      const ttlMs = typeof config.cacheTtlMs === 'number'
        ? config.cacheTtlMs
        : resolveCacheTtlMs(url);
      requestCache.set(cacheKey, {
        data: cloneData(response.data),
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        expiresAt: Date.now() + ttlMs,
      });
      return response;
    })
    .finally(() => {
      inflightRequests.delete(cacheKey);
    });

  inflightRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

const withMutationInvalidation = (methodName) => {
  const rawMethod = api[methodName].bind(api);
  api[methodName] = async (...args) => {
    const response = await rawMethod(...args);
    const [url] = args;
    invalidateApiCacheByUrlHint(typeof url === 'string' ? url : '');
    return response;
  };
};

withMutationInvalidation('post');
withMutationInvalidation('put');
withMutationInvalidation('patch');
withMutationInvalidation('delete');

// Request interceptor: attach Cognito ID token
api.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      const idToken = session?.tokens?.idToken?.toString();
      console.debug('[api] session.tokens:', session?.tokens, '| idToken present:', !!idToken);
      if (idToken) {
        config.headers.Authorization = `Bearer ${idToken}`;
      }
    } catch (e) {
      console.debug('[api] fetchAuthSession threw:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on 401 sign out (Amplify handles token refresh transparently)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config?._retry) {
      error.config._retry = true;
      try {
        // Force a token refresh then retry once
        const session = await fetchAuthSession({ forceRefresh: true });
        const idToken = session?.tokens?.idToken?.toString();
        if (idToken) {
          error.config.headers.Authorization = `Bearer ${idToken}`;
          clearApiCache();
          return api(error.config);
        }
      } catch {
        // Refresh failed — sign out
      }
      clearApiCache();
      await signOut();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const createSystem = (workspaceId, systemData) =>
  api.post(`workspaces/${workspaceId}/canvases/`, systemData);
export { clearApiCache };

export default api;
