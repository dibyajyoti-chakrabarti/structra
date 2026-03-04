import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';

const INITIAL_STATE = {
  runId: null,
  status: 'idle', // 'idle' | 'scoring' | 'awaiting_ai' | 'complete' | 'error'
  score: null,
  summary: null,
  results: [],
  suggestions: null,
  creditsExhausted: false,
  creditsRemaining: null,
  workspaceTier: null,
  geminiError: false,
  error: null,
};

export function useEvaluation() {
  const [state, setState] = useState(INITIAL_STATE);
  const pollTimerRef = useRef(null);
  const isUnmountedRef = useRef(false);

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      clearPollTimer();
    };
  }, [clearPollTimer]);

  const pollRunStatus = useCallback((runId) => {
    const tick = async () => {
      if (!runId || isUnmountedRef.current) return;

      try {
        const response = await api.get(`evaluate/${runId}/`, { cache: false });
        const data = response.data || {};
        const runStatus = data.status;

        if (runStatus === 'pending') {
          setState((prev) => ({ ...prev, status: 'scoring', runId }));
          pollTimerRef.current = setTimeout(tick, 1200);
          return;
        }

        if (runStatus === 'running') {
          setState((prev) => ({ ...prev, status: 'awaiting_ai', runId }));
          pollTimerRef.current = setTimeout(tick, 1800);
          return;
        }

        if (runStatus === 'completed') {
          clearPollTimer();
          setState((prev) => ({
            ...prev,
            runId,
            status: 'complete',
            score: data.score ?? null,
            summary: data.summary ?? null,
            results: Array.isArray(data.results) ? data.results : [],
            suggestions: data.suggestions ?? null,
            creditsExhausted: Boolean(data.creditsExhausted),
            creditsRemaining: data.creditsRemaining ?? null,
            workspaceTier: data.workspaceTier ?? null,
            geminiError: Boolean(data.geminiError),
            error: null,
          }));
          return;
        }

        clearPollTimer();
        setState((prev) => ({
          ...prev,
          runId,
          status: 'error',
          error: data.error || 'Evaluation failed in background processing.',
        }));
      } catch {
        pollTimerRef.current = setTimeout(tick, 1800);
      }
    };

    tick();
  }, [clearPollTimer]);

  const runEvaluation = useCallback(async (canvasState, workspaceId, systemId) => {
    clearPollTimer();
    setState((prev) => ({ ...prev, status: 'scoring', error: null, geminiError: false }));

    try {
      const response = await api.post('evaluate/', {
        workspaceId,
        systemId,
        canvasState,
      });

      const data = response.data || {};
      const runId = data.runId || null;
      if (!runId) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: 'Evaluation run could not be queued.',
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        runId,
        status: data.status === 'running' ? 'awaiting_ai' : 'scoring',
        workspaceTier: data.workspaceTier ?? prev.workspaceTier,
      }));
      pollRunStatus(runId);
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data || {};

      if (status === 429) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error:
            data.error === 'rate_limit'
              ? 'Evaluation limit reached. Try again in a few minutes.'
              : data.message || 'Evaluation request is temporarily throttled.',
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        status: 'error',
        error: 'Evaluation request failed. Please try again.',
      }));
    }
  }, [clearPollTimer, pollRunStatus]);

  const reset = useCallback(() => {
    clearPollTimer();
    setState(INITIAL_STATE);
  }, [clearPollTimer]);

  return {
    ...state,
    runEvaluation,
    reset,
  };
}
