import { useCallback, useState } from 'react';
import api from '../api';
import { evaluateRules, summarizeResults } from '../evaluation/evaluateRules';

const INITIAL_STATE = {
  status: 'idle', // 'idle' | 'scoring' | 'awaiting_confirmation' | 'awaiting_ai' | 'complete' | 'error'
  score: null,
  summary: null,
  results: [],
  suggestions: null,
  insightTokensRemaining: null,
  dailyInsightTokens: null,
  tier: null,
  seatCount: null,
  tokenConsumed: false,
  noTokens: false,
  geminiError: false,
  error: null,
};

export function useEvaluation() {
  const [state, setState] = useState(INITIAL_STATE);

  const refreshInsightTokens = useCallback(async (workspaceId) => {
    const response = await api.get('evaluation/insight-tokens/', {
      params: { workspaceId },
      cache: false,
    });
    const data = response.data || {};
    setState((prev) => ({
      ...prev,
      insightTokensRemaining: data.insightTokensRemaining ?? prev.insightTokensRemaining,
      dailyInsightTokens: data.dailyInsightTokens ?? prev.dailyInsightTokens,
      tier: data.tier ?? prev.tier,
      seatCount: data.seatCount ?? prev.seatCount,
    }));
    return data;
  }, []);

  const runRuleEvaluation = useCallback(async (canvasState, workspaceTier, workspaceId) => {
    setState((prev) => ({
      ...prev,
      status: 'scoring',
      error: null,
      geminiError: false,
      suggestions: null,
      tokenConsumed: false,
      noTokens: false,
    }));

    try {
      const effectiveTier = (workspaceTier || 'core').toLowerCase();
      const localState = {
        ...(canvasState || {}),
        workspaceTier: effectiveTier,
      };
      const results = evaluateRules(localState);
      const summary = summarizeResults(results);

      const tokenState = workspaceId ? await refreshInsightTokens(workspaceId) : {};

      setState((prev) => ({
        ...prev,
        status: 'awaiting_confirmation',
        score: summary.score ?? 0,
        summary,
        results,
        tier: tokenState.tier ?? effectiveTier,
      }));
      return true;
    } catch {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: 'Failed to run evaluation. Please try again.',
      }));
      return false;
    }
  }, [refreshInsightTokens]);

  const confirmAiEvaluation = useCallback(async (canvasState, workspaceId, systemId) => {
    setState((prev) => ({
      ...prev,
      status: 'awaiting_ai',
      error: null,
      geminiError: false,
      tokenConsumed: false,
      noTokens: false,
    }));

    try {
      const response = await api.post('evaluation/ai/', {
        workspaceId,
        systemId,
        canvasState,
      });
      const data = response.data || {};
      setState((prev) => ({
        ...prev,
        status: 'complete',
        score: data.score ?? prev.score,
        summary: data.summary ?? prev.summary,
        results: Array.isArray(data.results) ? data.results : prev.results,
        suggestions: data.suggestions ?? null,
        insightTokensRemaining: data.insightTokensRemaining ?? prev.insightTokensRemaining,
        dailyInsightTokens: data.dailyInsightTokens ?? prev.dailyInsightTokens,
        tier: data.tier ?? data.workspaceTier ?? prev.tier,
        seatCount: data.seatCount ?? prev.seatCount,
        tokenConsumed: Boolean(data.tokenConsumed),
        noTokens: false,
        geminiError: false,
        error: null,
      }));
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data || {};

      if (status === 429) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: 'Evaluation limit reached. Try again in a few minutes.',
        }));
        return;
      }

      if (data.error === 'NO_TOKENS') {
        setState((prev) => ({
          ...prev,
          status: 'complete',
          noTokens: true,
          insightTokensRemaining: data.insightTokensRemaining ?? 0,
          tokenConsumed: false,
          error: data.message || 'You have no Insight Tokens remaining today. Tokens reset tomorrow.',
        }));
        return;
      }

      if (data.error === 'GEMINI_FAILED') {
        setState((prev) => ({
          ...prev,
          status: 'complete',
          geminiError: true,
          insightTokensRemaining: data.insightTokensRemaining ?? prev.insightTokensRemaining,
          tokenConsumed: false,
          error: data.message || 'Could not reach AI service.',
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

  const dismissAiConfirmation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: prev.summary ? 'complete' : 'idle',
      error: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    runRuleEvaluation,
    confirmAiEvaluation,
    dismissAiConfirmation,
    refreshInsightTokens,
    reset,
  };
}
