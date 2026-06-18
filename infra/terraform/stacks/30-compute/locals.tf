locals {
  persistent = data.terraform_remote_state.persistent.outputs
  data_layer = data.terraform_remote_state.data.outputs

  backend_image_uri = "${local.persistent.ecr_backend_repository_url}:${var.backend_image_tag}"
  worker_image_uri  = "${local.persistent.ecr_worker_repository_url}:${var.worker_image_tag}"

  frontend_url = module.frontend_cdn.url

  # Shared DB / Bedrock / email / SQS config injected into both Lambdas.
  common_env = {
    DB_ENGINE   = "django.db.backends.postgresql"
    DB_NAME     = local.data_layer.rds_db_name
    DB_USER     = var.db_username
    DB_PASSWORD = data.aws_ssm_parameter.db_password.value
    DB_HOST     = local.data_layer.rds_endpoint_address
    DB_PORT     = tostring(local.data_layer.rds_port)

    # AWS_REGION is a reserved Lambda env key (the runtime sets it to the
    # function's region, ap-south-1) — must not be set here.
    BEDROCK_REGION            = var.bedrock_region
    BEDROCK_MODEL_ID          = var.bedrock_model_id
    BEDROCK_SEMANTIC_MODEL_ID = var.bedrock_semantic_model_id
    BEDROCK_TIMEOUT_SECONDS   = tostring(var.bedrock_timeout_seconds)

    USE_SQS       = "true"
    SQS_QUEUE_URL = aws_sqs_queue.eval.url

    EMAIL_HOST          = var.email_host
    EMAIL_PORT          = tostring(var.email_port)
    EMAIL_USE_TLS       = "True"
    EMAIL_HOST_USER     = var.email_host_user
    EMAIL_HOST_PASSWORD = data.aws_ssm_parameter.email_host_password.value
    DEFAULT_FROM_EMAIL  = var.default_from_email

    RAZORPAY_KEY_ID             = var.razorpay_key_id
    RAZORPAY_KEY_SECRET         = data.aws_ssm_parameter.razorpay_key_secret.value
    RAZORPAY_WEBHOOK_SECRET     = data.aws_ssm_parameter.razorpay_webhook_secret.value
    RAZORPAY_PLAN_ID_INDIVIDUAL = var.razorpay_plan_id_individual
    RAZORPAY_PLAN_ID_TEAM       = var.razorpay_plan_id_team

    DJANGO_SECRET_KEY        = data.aws_ssm_parameter.django_secret_key.value
    FRONTEND_INVITE_BASE_URL = "${local.frontend_url}/invite"
  }

  backend_env = merge(local.common_env, {
    DJANGO_ENV             = "production"
    DJANGO_SETTINGS_MODULE = "backend_hub.settings.production"

    COGNITO_USER_POOL_ID = local.persistent.cognito_user_pool_id
    COGNITO_CLIENT_ID    = local.persistent.cognito_app_client_id

    # CloudFront origin — production.py raises if these are empty.
    CORS_ALLOWED_ORIGINS = local.frontend_url
    CSRF_TRUSTED_ORIGINS = local.frontend_url

    # Wildcard avoids a dependency cycle with the API Gateway domain
    # (Django allows a leading-dot host to match any subdomain).
    DJANGO_ALLOWED_HOSTS = ".execute-api.${var.region}.amazonaws.com"
  })

  worker_env = merge(local.common_env, {
    DJANGO_ENV             = "production"
    DJANGO_SETTINGS_MODULE = "worker_hub.settings"

    COGNITO_USER_POOL_ID = local.persistent.cognito_user_pool_id
    COGNITO_CLIENT_ID    = local.persistent.cognito_app_client_id

    # Strands is not used at runtime, but worker settings read these.
    STRANDS_MODEL_ID       = var.bedrock_model_id
    STRANDS_BEDROCK_REGION = var.bedrock_region
  })
}
