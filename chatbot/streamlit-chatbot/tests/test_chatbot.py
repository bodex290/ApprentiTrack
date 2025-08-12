import os
import sys
from unittest.mock import MagicMock, patch

# Ensure the src directory is on the path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))

# Provide dummy environment variables required by the client
os.environ.setdefault("AZURE_API_KEY", "test_key")
os.environ.setdefault("AZURE_API_BASE", "http://test")

import chatbot  # noqa: E402  # Imported after sys.path and env setup


def test_llm_call_returns_expected_message_and_params():
    fake_response = MagicMock()
    fake_response.choices = [MagicMock()]
    fake_response.choices[0].message.content = "mocked message"

    with patch(
        "chatbot.client.chat.completions.create", return_value=fake_response
    ) as mock_create:
        result = chatbot.llm_call("prompt", "content")

    assert result == "mocked message"
    mock_create.assert_called_once_with(
        model="azure.gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful assistant"},
            {"role": "user", "content": "prompt:content"},
        ],
    )
