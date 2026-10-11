# Credentials come from the environment, never from files in the repo:
#   NEON_API_KEY, RENDER_API_KEY, RENDER_OWNER_ID, CLOUDFLARE_API_TOKEN
# Everything secret below is marked sensitive and is supplied through TF_VAR_* variables or
# an untracked terraform.tfvars. State is local and ignored by git (see .gitignore), because
# it would contain these values.

variable "cloudflare_account_id" {
  description = "Cloudflare account that owns the Pages projects and the keepalive worker."
  type        = string
}

variable "github_repo_url" {
  description = "Public repository Render builds the API image from."
  type        = string
  default     = "https://github.com/dibyajyoti-chakrabarti/structra"
}

variable "git_branch" {
  description = "Branch Render deploys."
  type        = string
  default     = "free-tier-revival"
}

variable "neon_region" {
  description = "Neon region id, chosen to sit next to the Render region."
  type        = string
  default     = "aws-ap-southeast-1"
}

variable "render_region" {
  type    = string
  default = "singapore"
}

variable "frontend_url" {
  description = "Where the React app is served. Used for CORS, CSRF and links in emails."
  type        = string
  default     = "https://structra.pages.dev"
}

variable "docs_url" {
  type    = string
  default = "https://docs.structra.pages.dev"
}

variable "api_public_url" {
  description = "Public URL of the Render service. It is only known after the first apply, so set it and apply again."
  type        = string
  default     = ""
}

# ---- Secrets and third party credentials (all optional so a first apply can start empty) ----

variable "django_secret_key" {
  description = "Signs Django sessions and the access and refresh tokens. Use 64 or more random characters."
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Password of the structra_owner role in Neon."
  type        = string
  sensitive   = true
}

variable "storage_access_key_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "storage_secret_access_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "gmail_client_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "gmail_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "gmail_refresh_token" {
  type      = string
  sensitive = true
  default   = ""
}

variable "google_oauth_client_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "google_oauth_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "github_oauth_client_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "github_oauth_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "llm_api_key" {
  description = "OpenRouter key for the evaluation worker."
  type        = string
  sensitive   = true
  default     = ""
}

variable "razorpay_key_id" {
  type    = string
  default = ""
}

variable "razorpay_key_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "razorpay_webhook_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "razorpay_plan_id_individual" {
  type    = string
  default = ""
}

variable "razorpay_plan_id_team" {
  type    = string
  default = ""
}
