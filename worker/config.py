"""Django-free configuration for the standalone worker (read from env).

The cloud worker is a stateless microservice — it does not load Django settings.
These are the only knobs the compute path needs.
"""
import os

BEDROCK_REGION = os.getenv("BEDROCK_REGION", "us-east-1")
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "us.meta.llama3-3-70b-instruct-v1:0")
BEDROCK_SEMANTIC_MODEL_ID = os.getenv("BEDROCK_SEMANTIC_MODEL_ID", "us.meta.llama3-3-70b-instruct-v1:0")
BEDROCK_TIMEOUT_SECONDS = float(os.getenv("BEDROCK_TIMEOUT_SECONDS", "60"))
AWS_PROFILE = os.getenv("AWS_PROFILE", "")  # set for local dev; empty in Lambda (uses role)
