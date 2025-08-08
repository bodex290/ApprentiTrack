import os

import openai
from dotenv import load_dotenv

load_dotenv()


client = openai.OpenAI(
    api_key=os.getenv("AZURE_API_KEY"),
    base_url=os.getenv("AZURE_API_BASE"),
)


def llm_call(messages):
    """Send the entire conversation to the LLM and return its reply.

    Parameters
    ----------
    messages: list[dict]
        A list of messages in the OpenAI chat format containing the
        conversation history, including the system prompt.
    """

    response = client.chat.completions.create(
        model="azure.gpt-4o-mini",
        messages=messages,
    )
    return response.choices[0].message.content
