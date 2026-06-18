"""Diagnostic Lambda entrypoint: verifies the worker's two critical paths from
inside the VPC — database connectivity (VPC -> RDS) and Bedrock (egress via the
NAT instance + model access). Invoked by overriding the worker image command to
`selftest_handler.handler`. Safe to keep; never wired to SQS.
"""
import os

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'worker_hub.settings')
os.environ.setdefault('DJANGO_ENV', 'production')
django.setup()

from django.conf import settings  # noqa: E402
from django.db import connection  # noqa: E402


def handler(event, context):
    result = {}

    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
            result["db_ok"] = cur.fetchone()[0] == 1
    except Exception as exc:  # noqa: BLE001
        result["db_error"] = str(exc)

    try:
        import boto3

        client = boto3.client("bedrock-runtime", region_name=settings.BEDROCK_REGION)
        resp = client.converse(
            modelId=settings.BEDROCK_MODEL_ID,
            messages=[{"role": "user", "content": [{"text": "Reply with the single word OK"}]}],
            inferenceConfig={"maxTokens": 10, "temperature": 0},
        )
        result["bedrock_ok"] = True
        result["bedrock_reply"] = resp["output"]["message"]["content"][0]["text"].strip()[:40]
        result["bedrock_model"] = settings.BEDROCK_MODEL_ID
        result["bedrock_region"] = settings.BEDROCK_REGION
    except Exception as exc:  # noqa: BLE001
        result["bedrock_ok"] = False
        result["bedrock_error"] = str(exc)

    return result
