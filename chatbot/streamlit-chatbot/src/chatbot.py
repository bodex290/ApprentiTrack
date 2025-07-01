import os
from dotenv import load_dotenv

load_dotenv()

import openai

client = openai.OpenAI(
    api_key=os.getenv("AZURE_API_KEY"),
    base_url=os.getenv("AZURE_API_BASE"),
)

def llm_call(prompt, content):
    response = client.chat.completions.create(
        model="azure.gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful assistant"},
            {"role": "user", "content": f"{prompt}:{content}"}
        ]
    )
    return response.choices[0].message.content
