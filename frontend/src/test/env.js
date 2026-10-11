// Minimal browser globals for `node --test`. Import this module first in every test file.
function makeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    clear: () => map.clear(),
  };
}

function define(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

export const storage = makeStorage();
export const session = makeStorage();
define('localStorage', storage);
define('sessionStorage', session);

const fakeWindow = new EventTarget();
fakeWindow.location = { origin: 'http://localhost:5173', pathname: '/app', assigned: [], assign(url) { this.assigned.push(url); } };
define('window', fakeWindow);

export function resetEnv() {
  storage.clear();
  session.clear();
  fakeWindow.location.pathname = '/app';
  fakeWindow.location.assigned.length = 0;
  delete globalThis.navigator?.locks;
}

// A fetch stand-in that replays queued responses and records the calls.
export function mockFetch(...responses) {
  const calls = [];
  const queue = [...responses];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, body: init.body ? JSON.parse(init.body) : null, init });
    const next = queue.length > 1 ? queue.shift() : queue[0];
    if (next instanceof Error) throw next;
    return next;
  };
  return calls;
}

export function jsonResponse(status, data, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (data === undefined) throw new Error('no body');
      return data;
    },
    headers: { get: (name) => headers[name] ?? null },
  };
}

export function installLocks(onRequest) {
  const locks = { requested: [], request: async (name, task) => { locks.requested.push(name); await onRequest?.(); return task(); } };
  Object.defineProperty(globalThis.navigator, 'locks', { value: locks, configurable: true });
  return locks;
}
