"""Django-free configuration for the AI step (read from env).

Named llm_config rather than config so it cannot be shadowed by the backend's `config`
settings package, which shares sys.path with the worker.

The AI step talks to any OpenAI compatible chat completions API. LLM_MODEL and
LLM_SEMANTIC_MODEL may each be a comma separated list, tried in order.
"""
import os

LLM_BASE_URL = os.getenv("LLM_BASE_URL", "")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "")
LLM_SEMANTIC_MODEL = os.getenv("LLM_SEMANTIC_MODEL", "") or LLM_MODEL

# Optional second provider, tried after every primary model has failed.
LLM_FALLBACK_BASE_URL = os.getenv("LLM_FALLBACK_BASE_URL", "")
LLM_FALLBACK_API_KEY = os.getenv("LLM_FALLBACK_API_KEY", "")
LLM_FALLBACK_MODEL = os.getenv("LLM_FALLBACK_MODEL", "")

LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "60"))
# Upper bound for one AI step across all candidates, so a run of failing models cannot
# outlast the queue's lock timeout.
LLM_TOTAL_TIMEOUT_SECONDS = float(os.getenv("LLM_TOTAL_TIMEOUT_SECONDS", "90"))
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "4096"))
