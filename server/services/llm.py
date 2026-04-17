"""LLM integration service using LiteLLM (supports OpenAI and other providers)."""

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
API_BASE = AZURE_BASE_URL or LLM_API_BASE or ""

# Set the OpenAI key for litellm to pick up (fallback for direct OpenAI)
if OPENAI_API_KEY:
    os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY

# Handle corporate proxies with self-signed certificates
SSL_VERIFY = os.getenv("SSL_VERIFY", "false").lower() in ("true", "1", "yes")
if not SSL_VERIFY:
    os.environ["OPENAI_VERIFY_SSL"] = "false"
    import ssl
    ssl._create_default_https_context = ssl._create_unverified_context


def _get_client():
    """Lazy import litellm to avoid import-time issues."""
    try:
        import litellm
        litellm.set_verbose = False  # suppress noisy logs
        return litellm
    except ImportError:
        logger.error("litellm not installed – run: pip install litellm")
        return None


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
    litellm = _get_client()
    if litellm is None:
        return None

    if not API_KEY:
        logger.warning("No LLM API key configured (set AZURE_API_KEY, LITELLM_API_KEY, or OPENAI_API_KEY)")
        return None

    model = model or LLM_MODEL

    try:
        kwargs = dict(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=API_KEY,
        )
        if API_BASE:
            kwargs["api_base"] = API_BASE
        response = litellm.completion(**kwargs)
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
    litellm = _get_client()
    if litellm is None:
        return None

    if not API_KEY:
        logger.warning("No LLM API key configured (set AZURE_API_KEY, LITELLM_API_KEY, or OPENAI_API_KEY)")
        return None

    model = model or LLM_MODEL

    try:
        kwargs = dict(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=API_KEY,
        )
        if API_BASE:
            kwargs["api_base"] = API_BASE
        response = litellm.completion(**kwargs)
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
