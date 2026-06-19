###############################################################################
# Inputs for the full Cognito auth stack (pool + app client + Google/GitHub
# IdPs + hosted-UI domain + 5 trigger Lambdas). This module CREATES and manages
# everything — it is a faithful replica of the live structra-user-pool config.
###############################################################################

variable "pool_name" {
  description = "Cognito user pool name"
  type        = string
  default     = "structra-user-pool"
}

variable "app_client_name" {
  description = "Public SPA app client name"
  type        = string
  default     = "structra-web"
}

variable "hosted_ui_domain" {
  description = "Cognito-prefix hosted-UI domain (imported as-is from the live pool)."
  type        = string
  default     = "structra-auth"
}

variable "callback_urls" {
  description = "Allowed OAuth callback URLs"
  type        = list(string)
  default = [
    "http://localhost:5173/auth/callback",
    "https://d14e7d3vt667h.cloudfront.net/auth/callback",
    "https://dqltowjnatfxe.cloudfront.net/auth/callback",
    "https://structra.cloud/auth/callback",
  ]
}

variable "logout_urls" {
  description = "Allowed OAuth logout URLs"
  type        = list(string)
  default = [
    "http://localhost:5173/",
    "https://d14e7d3vt667h.cloudfront.net/",
    "https://dqltowjnatfxe.cloudfront.net/",
    "https://structra.cloud/",
  ]
}

# --- Google IdP ---------------------------------------------------------------
variable "google_client_id" {
  description = "Google OAuth client ID (not secret — appears in browser OAuth flow)"
  type        = string
  default     = "1044581917433-qn9jhj10lre2ju8rnh2snau5par8dhdv.apps.googleusercontent.com"
}

variable "google_client_secret" {
  description = "Google OAuth client secret (sourced from SSM by the stack)"
  type        = string
  sensitive   = true
}

# --- GitHub IdP (federated via the github-oidc-wrapper OIDC shim) -------------
variable "github_client_id" {
  description = "GitHub OAuth app client ID"
  type        = string
  default     = "Ov23liOv27O0G9LpKn2V"
}

variable "github_client_secret" {
  description = "GitHub OAuth app client secret (sourced from SSM by the stack)"
  type        = string
  sensitive   = true
}

variable "github_oidc_issuer" {
  description = <<-EOT
    OIDC issuer URL of the GitHub-OAuth-to-OIDC shim (the github-oidc-wrapper
    CloudFormation stack: API Gateway + 5 Lambdas). GitHub is not a real OIDC
    provider, so this shim exposes the standard OIDC endpoints Cognito needs.
  EOT
  type        = string
  default     = "https://2d9epepca7.execute-api.ap-south-1.amazonaws.com/prod"
}

# --- Email OTP delivery (Zoho SMTP — used by the create_auth trigger) ---------
variable "smtp_host" {
  type    = string
  default = "smtp.zoho.in"
}

variable "smtp_port" {
  type    = string
  default = "587"
}

variable "smtp_user" {
  type    = string
  default = "support@structra.cloud"
}

variable "smtp_password" {
  description = "Zoho SMTP password (sourced from SSM by the stack)"
  type        = string
  sensitive   = true
}

# --- Trigger Lambdas ----------------------------------------------------------
variable "function_name_prefix" {
  description = "Prefix for trigger function names (live: structra-cognito-*)"
  type        = string
  default     = "structra-cognito"
}

variable "source_dir" {
  description = "Absolute path to the repo lambdas/ directory with the 5 trigger .py files"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention for trigger Lambdas (0 = never expire, matching the live log groups)"
  type        = number
  default     = 0
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
