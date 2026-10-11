import { useCallback, useEffect, useRef, useState } from 'react';
import { BACKEND_READY, BACKEND_UNAVAILABLE, emit } from '../auth/events';
import {
  BACKGROUND_POLL_MS,
  FAIL_AFTER_MS,
  POLL_INTERVAL_MS,
  SHOW_LOADER_AFTER_MS,
  pingHealth,
} from './health';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// status: "checking" (first moments), "waking" (loader), "ready", or "failed" (gave up).
// Once ready it stays ready. A later outage only raises `reconnecting`, so a page the user
// is working on is never replaced by a loader and loses unsaved work.
export default function useBackendStatus() {
  const [status, setStatus] = useState('checking');
  const [elapsed, setElapsed] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);
  const generation = useRef(0);
  const statusRef = useRef('checking');

  const update = useCallback((next) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const run = useCallback(
    async ({ background = false } = {}) => {
      const mine = ++generation.current;
      const startedAt = Date.now();
      if (!background) {
        update('checking');
        setElapsed(0);
      }
      const loaderTimer = background
        ? null
        : setTimeout(() => {
            if (generation.current === mine && statusRef.current === 'checking') update('waking');
          }, SHOW_LOADER_AFTER_MS);

      try {
        while (generation.current === mine) {
          const ok = await pingHealth();
          if (generation.current !== mine) return;
          if (ok) {
            update('ready');
            setReconnecting(false);
            emit(BACKEND_READY);
            return;
          }
          if (!background && Date.now() - startedAt >= FAIL_AFTER_MS) {
            update('failed');
            return;
          }
          if (!background && statusRef.current === 'checking') update('waking');
          await sleep(background ? BACKGROUND_POLL_MS : POLL_INTERVAL_MS);
        }
      } finally {
        clearTimeout(loaderTimer);
      }
    },
    [update],
  );

  useEffect(() => {
    run();
    const onUnavailable = () => {
      if (statusRef.current === 'ready') {
        setReconnecting(true);
        run({ background: true });
      }
    };
    window.addEventListener(BACKEND_UNAVAILABLE, onUnavailable);
    return () => {
      generation.current += 1; // stops any running loop
      window.removeEventListener(BACKEND_UNAVAILABLE, onUnavailable);
    };
  }, [run]);

  // Count up while the loader is on screen, from the moment waiting began.
  useEffect(() => {
    if (status !== 'waking') return undefined;
    const startedAt = Date.now() - elapsed * 1000;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return { status, elapsed, reconnecting, retry: () => run() };
}
