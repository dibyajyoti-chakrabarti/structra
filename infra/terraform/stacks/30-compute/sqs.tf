###############################################################################
# Evaluation queue (backend produces, worker consumes) + dead-letter queue.
###############################################################################

resource "aws_sqs_queue" "dlq" {
  name                      = "structra-eval-dlq"
  message_retention_seconds = 1209600 # 14 days
  tags                      = { Name = "${var.name_prefix}-eval-dlq" }
}

resource "aws_sqs_queue" "eval" {
  name = "structra-eval-queue"

  # Visibility >= worker timeout (AWS recommends ~6x for event source mappings).
  visibility_timeout_seconds = var.worker_timeout * 6

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })

  tags = { Name = "${var.name_prefix}-eval-queue" }
}

resource "aws_lambda_event_source_mapping" "worker" {
  event_source_arn = aws_sqs_queue.eval.arn
  function_name    = module.worker_lambda.function_arn
  batch_size       = 1
  enabled          = true
}
