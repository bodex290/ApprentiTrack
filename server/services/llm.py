"""LLM integration service using the OpenAI SDK (supports OpenAI + Azure proxies)."""

import os
import json
import logging
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── Configuration ───────────────────────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
LITELLM_API_KEY = os.getenv("LITELLM_API_KEY", "")
AZURE_API_KEY = os.getenv("AZURE_API_KEY", "")
AZURE_BASE_URL = os.getenv("AZURE_BASE_URL", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
LLM_API_BASE = os.getenv("LLM_API_BASE", "")  # optional custom proxy URL

# Resolve which key / base URL to use (Azure > LiteLLM proxy > direct OpenAI)
API_KEY = AZURE_API_KEY or LITELLM_API_KEY or OPENAI_API_KEY
API_BASE = AZURE_BASE_URL or LLM_API_BASE or None

# Handle corporate proxies with self-signed certificates
SSL_VERIFY = os.getenv("SSL_VERIFY", "false").lower() in ("true", "1", "yes")
if not SSL_VERIFY:
    import ssl
    ssl._create_default_https_context = ssl._create_unverified_context


def _get_client():
    """Create an OpenAI client pointing at the configured base URL / key."""
    try:
        import httpx
        from openai import OpenAI

        # Build httpx client with optional SSL verification disabled
        http_client = None
        if not SSL_VERIFY:
            http_client = httpx.Client(verify=False)

        kwargs = dict(api_key=API_KEY)
        if API_BASE:
            # Azure proxy or custom endpoint — use /v1 suffix for OpenAI-compatible APIs
            base = API_BASE.rstrip("/")
            if not base.endswith("/v1"):
                base += "/v1"
            kwargs["base_url"] = base
        if http_client:
            kwargs["http_client"] = http_client

        return OpenAI(**kwargs)
    except ImportError:
        logger.error("openai package not installed – run: pip install openai")
        return None


def _clean_model_name(model: str) -> str:
    """Strip litellm-style prefixes (e.g. 'openai/azure.gpt-4o-mini' → 'azure.gpt-4o-mini')."""
    if "/" in model:
        return model.split("/", 1)[1]
    return model


def get_completion(
    system_prompt: str,
    user_prompt: str,
    model: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 2000,
) -> Optional[str]:
    """Send a prompt to the LLM and return the response text.

    Returns None if the LLM is unavailable or an error occurs.
    """
    client = _get_client()
    if client is None:
        return None

    if not API_KEY:
        logger.warning("No LLM API key configured (set AZURE_API_KEY, LITELLM_API_KEY, or OPENAI_API_KEY)")
        return None

    model_name = _clean_model_name(model or LLM_MODEL)

    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"LLM completion failed: {e}")
        return None


def get_chat_completion(
    messages: list[dict],
    model: Optional[str] = None,
    temperature: float = 0.4,
    max_tokens: int = 1500,
) -> Optional[str]:
    """Send a multi-turn conversation to the LLM.

    messages: list of {"role": "system"|"user"|"assistant", "content": "..."}
    Returns the assistant's response text, or None on failure.
    """
    client = _get_client()
    if client is None:
        return None

    if not API_KEY:
        logger.warning("No LLM API key configured (set AZURE_API_KEY, LITELLM_API_KEY, or OPENAI_API_KEY)")
        return None

    model_name = _clean_model_name(model or LLM_MODEL)

    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"LLM chat completion failed: {e}")
        return None


def get_json_completion(
    system_prompt: str,
    user_prompt: str,
    model: Optional[str] = None,
    temperature: float = 0.2,
    max_tokens: int = 3000,
) -> Optional[dict]:
    """Send a prompt and parse the response as JSON.

    The system prompt should instruct the LLM to return valid JSON.
    Returns a parsed dict, or None on failure.
    """
    raw = get_completion(system_prompt, user_prompt, model, temperature, max_tokens)
    if raw is None:
        return None

    # Strip markdown code fences if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Remove first and last line (fences)
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM JSON response: {e}\nRaw: {raw[:500]}")
        return None