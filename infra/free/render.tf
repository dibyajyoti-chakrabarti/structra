# One Docker web service runs gunicorn and the evaluation worker side by side, because the
# free tier has no background worker. The image is deploy/render/Dockerfile.
locals {
  common_env = {
    DB_HOST                     = neon_project.structra.database_host
    DB_PORT                     = "5432"
    DB_NAME                     = "structra"
    DB_USER                     = "structra_owner"
    DB_SSLMODE                  = "require"
    API_PUBLIC_URL              = var.api_public_url
    FRONTEND_BASE_URL           = var.frontend_url
    CORS_ALLOWED_ORIGINS        = var.frontend_url
    CSRF_TRUSTED_ORIGINS        = var.frontend_url
    GMAIL_SENDER                = "structra.support@gmail.com"
    EMAIL_LOGO_URL              = "${var.frontend_url}/logo.png"
    LLM_BASE_URL                = "https://openrouter.ai/api/v1"
    LLM_MODEL                   = "google/gemma-4-31b-it:free"
    LLM_SEMANTIC_MODEL          = "nvidia/nemotron-3-super-120b-a12b:free"
    LLM_FALLBACK_BASE_URL       = "https://openrouter.ai/api/v1"
    LLM_FALLBACK_MODEL          = "openrouter/free"
    R2_BUCKET_NAME              = "structra-assets"
    RAZORPAY_KEY_ID             = var.razorpay_key_id
    RAZORPAY_PLAN_ID_INDIVIDUAL = var.razorpay_plan_id_individual
    RAZORPAY_PLAN_ID_TEAM       = var.razorpay_plan_id_team
  }

  secret_env = {
    DJANGO_SECRET_KEY          = var.django_secret_key
    DB_PASSWORD                = var.db_password
    R2_ACCESS_KEY_ID           = var.storage_access_key_id
    R2_SECRET_ACCESS_KEY       = var.storage_secret_access_key
    GMAIL_CLIENT_ID            = var.gmail_client_id
    GMAIL_CLIENT_SECRET        = var.gmail_client_secret
    GMAIL_REFRESH_TOKEN        = var.gmail_refresh_token
    OAUTH_GOOGLE_CLIENT_ID     = var.google_oauth_client_id
    OAUTH_GOOGLE_CLIENT_SECRET = var.google_oauth_client_secret
    OAUTH_GITHUB_CLIENT_ID     = var.github_oauth_client_id
    OAUTH_GITHUB_CLIENT_SECRET = var.github_oauth_client_secret
    LLM_API_KEY                = var.llm_api_key
    LLM_FALLBACK_API_KEY       = var.llm_api_key
    RAZORPAY_KEY_SECRET        = var.razorpay_key_secret
    RAZORPAY_WEBHOOK_SECRET    = var.razorpay_webhook_secret
  }

  # Empty values are dropped so an unset optional secret does not become an empty variable.
  api_env = {
    for k, v in merge(local.common_env, local.secret_env) : k => { value = v } if v != ""
  }
}

resource "render_web_service" "api" {
  name   = "structra-api"
  plan   = "free"
  region = var.render_region

  runtime_source = {
    docker = {
      repo_url        = var.github_repo_url
      branch          = var.git_branch
      dockerfile_path = "./deploy/render/Dockerfile"
      context         = "."
      auto_deploy     = true
    }
  }

  health_check_path = "/api/health/"
  env_vars          = local.api_env
}
