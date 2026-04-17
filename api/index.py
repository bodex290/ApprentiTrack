""" Vercel serverless entrypoint - re-exports the FastAPI ASGI app. """

import sys
import os

# Add the server directory to the Python path so all imports resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "server"))

from main import app  # noqa: E402, F401 -  Vercel detects this ASGI app automatically
