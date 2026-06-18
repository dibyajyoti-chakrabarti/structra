###############################################################################
# Generic container-image Lambda + its log group.
# Used for both the backend (API) and worker (SQS) functions.
###############################################################################

resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_lambda_function" "this" {
  function_name = var.function_name
  role          = var.role_arn
  package_type  = "Image"
  image_uri     = var.image_uri
  architectures = var.architectures
  memory_size   = var.memory_size
  timeout       = var.timeout

  reserved_concurrent_executions = var.reserved_concurrency

  environment {
    variables = var.environment
  }

  dynamic "vpc_config" {
    for_each = length(var.vpc_subnet_ids) > 0 ? [1] : []
    content {
      subnet_ids         = var.vpc_subnet_ids
      security_group_ids = var.vpc_security_group_ids
    }
  }

  dynamic "image_config" {
    for_each = var.image_config_command == null ? [] : [1]
    content {
      command = var.image_config_command
    }
  }

  tags = var.tags

  # The image is deployed out-of-band (make deploy-* -> update-function-code);
  # ignore image_uri here so those deploys never show as Terraform drift.
  lifecycle {
    ignore_changes = [image_uri]
  }

  depends_on = [aws_cloudwatch_log_group.this]
}
