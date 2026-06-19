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

  # Stateless worker is NOT VPC-attached: it owns no DB and reaches Bedrock +
  # the backend API directly over the internet (no NAT). Faster cold starts.
}
