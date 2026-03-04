import { useCallback, useState } from 'react';
import api from '../api';

const INITIAL_STATE = {
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

  const runEvaluation = useCallback(async (canvasState, workspaceId, systemId) => {
    setState((prev) => ({ ...prev, status: 'scoring', error: null, geminiError: false }));

    try {
      const response = await api.post('evaluate/', {
        workspaceId,
        systemId,
        canvasState,
      });

      const data = response.data || {};
      setState((prev) => ({
        ...prev,
        status: 'complete',
        score: data.score ?? null,
        summary: data.summary ?? null,
        results: Array.isArray(data.results) ? data.results : [],
        suggestions: data.suggestions ?? null,
        creditsExhausted: Boolean(data.creditsExhausted),
        creditsRemaining: data.creditsRemaining ?? null,
        workspaceTier: data.workspaceTier ?? null,
        geminiError: Boolean(data.geminiError),
      }));
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
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    runEvaluation,
    reset,
  };
}
