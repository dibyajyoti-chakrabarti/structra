###############################################################################
# Lambda execution roles (stable identities -> live in the persistent layer).
# The concrete SQS queue is created in the compute stack, so these policies use
# a name-wildcard ARN (structra-eval*) and never reference the compute stack.
###############################################################################

locals {
  sqs_arn_wildcard = "arn:aws:sqs:${var.region}:${data.aws_caller_identity.current.account_id}:structra-eval*"
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# --- Backend (API) role ------------------------------------------------------
resource "aws_iam_role" "backend" {
  name               = "${var.name_prefix}-backend-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "backend_vpc" {
  role       = aws_iam_role.backend.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "backend_inline" {
  name = "app"
  role = aws_iam_role.backend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "SqsProduce"
        Effect   = "Allow"
        Action   = ["sqs:SendMessage", "sqs:GetQueueUrl", "sqs:GetQueueAttributes"]
        Resource = local.sqs_arn_wildcard
      },
      {
        Sid      = "BedrockInvoke"
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
        Resource = "*"
      },
      {
        Sid      = "AssetsS3"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.assets.arn}/*"
      }
    ]
  })
}

# --- Worker role -------------------------------------------------------------
resource "aws_iam_role" "worker" {
  name               = "${var.name_prefix}-worker-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# Stateless worker is not VPC-attached, so it only needs basic logging perms
# (no ENI/VPC permissions).
resource "aws_iam_role_policy_attachment" "worker_logs" {
  role       = aws_iam_role.worker.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "worker_inline" {
  name = "app"
  role = aws_iam_role.worker.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SqsConsume"
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = local.sqs_arn_wildcard
      },
      {
        Sid      = "BedrockInvoke"
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
        Resource = "*"
      }
    ]
  })
}
