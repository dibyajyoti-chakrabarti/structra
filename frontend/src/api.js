import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
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

const getSessionCacheScope = () => localStorage.getItem('refresh') || 'anonymous';

const resolveCacheTtlMs = (url = '') => {
  if (url === 'auth/profile/') return 120000;
  if (url === 'workspaces/') return 60000;
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

const invalidateApiCacheByUrlHint = (url = '') => {
  if (!url) {
    clearApiCache();
    return;
  }
  const normalized = url.replace(/^\/+/, '');
  for (const key of requestCache.keys()) {
    if (key.includes(`|${normalized}|`) || key.includes('|workspaces/')) {
      requestCache.delete(key);
    }
  }
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
      requestCache.set(cacheKey, {
        data: cloneData(response.data),
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        expiresAt: Date.now() + resolveCacheTtlMs(url),
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

// 1. Request Interceptor: Attach Token Automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Handle Token Refresh
api.interceptors.response.use(
  (response) => response, // If successful, just return response
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 (Unauthorized) and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh');

      if (refreshToken) {
        try {
          // Use a clean axios instance to avoid infinite loops
          const response = await axios.post('http://127.0.0.1:8000/api/auth/token/refresh/', {
            refresh: refreshToken,
          });

          // Save new tokens
          localStorage.setItem('access', response.data.access);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return api(originalRequest);
        } catch (refreshError) {
          // If refresh fails (token expired), logout user
          console.error("Session expired", refreshError);
          clearApiCache();
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        // No refresh token available, force logout
        clearApiCache();
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Export helper functions AFTER api is created
export const createSystem = (workspaceId, systemData) => 
  api.post(`workspaces/${workspaceId}/canvases/`, systemData);
export { clearApiCache };

export default api;
