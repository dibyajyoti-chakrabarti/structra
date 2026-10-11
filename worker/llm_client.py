"""OpenAI compatible chat client with ordered fallbacks and tolerant JSON parsing.

Django free, shared by the local worker and the standalone cloud worker.

Configuration (see llm_config.py):
  LLM_BASE_URL, LLM_API_KEY   the primary provider (OpenRouter, Cloudflare Workers AI, ...)
  LLM_MODEL                   model for suggestions and cloud analysis
  LLM_SEMANTIC_MODEL          model for the semantic enrichment step
  LLM_FALLBACK_*              an optional second provider, tried after the primary models

LLM_MODEL and LLM_SEMANTIC_MODEL accept a comma separated list. The models are tried in
order and the first usable reply wins. Free models are rate limited and retired often, so
a failure of any kind (HTTP error, timeout, empty or reasoning only reply) moves on to the
next candidate instead of failing the evaluation.
"""
import ast
import json
import logging
import re
import time

import requests

import llm_config as config

logger = logging.getLogger(__name__)

_THINK_BLOCK = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
_CODE_FENCE = re.compile(r"```[a-zA-Z0-9_-]*\s*\n?(.*?)```", re.DOTALL)
_TRAILING_COMMA = re.compile(r",\s*([}\]])")
_MAX_OBJECT_STARTS = 50


def _split_models(value):
    return [m.strip() for m in (value or "").split(",") if m.strip()]


def _candidates(models):
    """Ordered (base_url, api_key, model) tuples: primary models, then the fallback provider."""
    out = []
    if config.LLM_BASE_URL:
        out += [(config.LLM_BASE_URL, config.LLM_API_KEY, m) for m in _split_models(models)]
    if config.LLM_FALLBACK_BASE_URL:
        out += [
            (config.LLM_FALLBACK_BASE_URL, config.LLM_FALLBACK_API_KEY, m)
            for m in _split_models(config.LLM_FALLBACK_MODEL)
        ]
    return out


def strip_reasoning(text):
    """Remove <think> blocks that reasoning models put in front of the answer."""
    text = _THINK_BLOCK.sub("", text)
    if "<think>" in text.lower():
        # An unterminated block means the reply was cut off while thinking.
        text = text[: text.lower().index("<think>")]
    return text.strip()


def _extract_text(body):
    """Pull the assistant text out of a chat completions body, or None."""
    try:
        content = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return None
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") for part in content if isinstance(part, dict) and part.get("type", "text") == "text"
        )
    if not isinstance(content, str):
        return None
    content = strip_reasoning(content)
    return content or None


def _request(base_url, api_key, model, prompt, timeout):
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    response = requests.post(
        f"{base_url.rstrip('/')}/chat/completions",
        headers=headers,
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": config.LLM_MAX_TOKENS,
        },
        timeout=timeout,
    )
    if response.status_code != 200:
        raise RuntimeError(f"HTTP {response.status_code}")
    return _extract_text(response.json())


def call_llm(prompt, *, semantic=False, timeout_seconds=None):
    """Return (text, error_flag). error_flag is True when no candidate produced usable text."""
    candidates = _candidates(config.LLM_SEMANTIC_MODEL if semantic else config.LLM_MODEL)
    if not candidates:
        logger.warning("llm not configured (LLM_BASE_URL and a model are required); skipping AI step")
        return None, True

    per_call = timeout_seconds or config.LLM_TIMEOUT_SECONDS
    deadline = time.monotonic() + config.LLM_TOTAL_TIMEOUT_SECONDS
    for index, (base_url, api_key, model) in enumerate(candidates, start=1):
        remaining = deadline - time.monotonic()
        if remaining < 1:
            logger.warning("llm total timeout reached before candidate %d/%d", index, len(candidates))
            break
        try:
            text = _request(base_url, api_key, model, prompt, min(per_call, remaining))
        except Exception as exc:  # noqa: BLE001  any failure means try the next candidate
            logger.warning("llm candidate %d/%d failed model=%s error=%s", index, len(candidates), model, exc)
            continue
        if text:
            logger.info("llm reply from model=%s candidate=%d/%d", model, index, len(candidates))
            return text, False
        logger.warning("llm candidate %d/%d returned no text model=%s", index, len(candidates), model)
    return None, True


def parse_json_object(text):
    """Best effort extraction of one JSON object from model output. Returns a dict or None.

    Handles reasoning blocks, markdown fences, prose before or after the object, and
    trailing commas. Anything else returns None so the caller can carry on without it.
    """
    if not isinstance(text, str):
        return None
    cleaned = strip_reasoning(text)
    sources = [cleaned] + [m.strip() for m in _CODE_FENCE.findall(cleaned)]
    decoder = json.JSONDecoder()
    for source in sources:
        for variant in (source, _TRAILING_COMMA.sub(r"\1", source)):
            obj = _first_object(variant, decoder)
            if obj is not None:
                return obj
    return None


def _first_object(text, decoder):
    try:
        loaded = json.loads(text)
        if isinstance(loaded, dict):
            return loaded
    except ValueError:
        pass
    starts = [i for i, ch in enumerate(text) if ch == "{"][:_MAX_OBJECT_STARTS]
    for start in starts:
        try:
            obj, _ = decoder.raw_decode(text[start:])
        except ValueError:
            # Models often answer with Python style literals (single quotes, True).
            obj = _python_literal(text[start:])
        if isinstance(obj, dict):
            return obj
    return None


def _python_literal(text):
    depth = 0
    for end, ch in enumerate(text):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    return ast.literal_eval(text[: end + 1])
                except (ValueError, SyntaxError):
                    return None
    return None
