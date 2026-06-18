###############################################################################
# Worker Lambda (SQS-triggered evaluation; runs run_evaluation_job()).
###############################################################################

module "worker_lambda" {
  source = "../../modules/lambda-fn"

  function_name = "${var.name_prefix}-worker"
  image_uri     = local.worker_image_uri
  role_arn      = local.persistent.worker_lambda_role_arn
  architectures = ["x86_64"]
  memory_size   = var.worker_memory
  timeout       = var.worker_timeout
  environment   = local.worker_env

  vpc_subnet_ids         = local.persistent.app_private_subnet_ids
  vpc_security_group_ids = [aws_security_group.lambda.id]
}
