###############################################################################
# Backend Lambda (Django + Mangum) behind the HTTP API.
###############################################################################

module "backend_lambda" {
  source = "../../modules/lambda-fn"

  function_name = "${var.name_prefix}-backend"
  image_uri     = local.backend_image_uri
  role_arn      = local.persistent.backend_lambda_role_arn
  architectures = ["x86_64"]
  memory_size   = var.backend_memory
  timeout       = var.backend_timeout
  environment   = local.backend_env

  vpc_subnet_ids         = local.persistent.app_private_subnet_ids
  vpc_security_group_ids = [aws_security_group.lambda.id]
}

module "api_gateway" {
  source = "../../modules/api-gateway"

  name_prefix                  = var.name_prefix
  backend_lambda_invoke_arn    = module.backend_lambda.invoke_arn
  backend_lambda_function_name = module.backend_lambda.function_name
}
