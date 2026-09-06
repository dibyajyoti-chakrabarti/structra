variable "name_prefix" {
  type    = string
  default = "structra-prod"
}

variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "profile" {
  type    = string
  default = ""
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "azs" {
  type    = list(string)
  default = ["ap-south-1a", "ap-south-1b"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.0.0/24", "10.0.1.0/24"]
}

variable "app_private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "db_private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.20.0/24", "10.0.21.0/24"]
}

variable "frontend_bucket_name" {
  description = "Globally-unique name for the NEW frontend bucket (separate from the existing structra-frontend-prod)"
  type        = string
  default     = "structra-frontend-190084967282"
}

variable "docs_bucket_name" {
  description = "Globally-unique name for the docs site bucket (Docusaurus build)"
  type        = string
  default     = "structra-docs-190084967282"
}

# SSM prefix for SecureString secrets (Cognito IdP secrets + SMTP password),
# created out-of-band. Matches the convention used by the 30-compute stack.
variable "ssm_prefix" {
  type    = string
  default = "/structra/prod"
}

# GitHub Actions OIDC subjects allowed to assume the deploy role. Scoped to the
# structra repo; add entries rather than widening the wildcard.
variable "github_deploy_subjects" {
  type    = list(string)
  default = ["repo:dibyajyoti-chakrabarti/structra:*"]
}

# --- Cognito hosted UI -------------------------------------------------------
variable "cognito_hosted_ui_domain" {
  description = "Custom hosted-UI hostname. Covered by the *.structra.cloud certificate."
  type        = string
  default     = "auth.structra.cloud"
}

variable "create_cognito_hosted_ui_domain" {
  description = <<-EOT
    Set false for the first apply of a from-scratch build. A Cognito custom
    domain requires an A record on the parent domain, and structra.cloud's apex
    alias is created by 30-compute, so the order is: apply this stack with the
    flag false, apply 20-data and 30-compute, then apply this stack again with
    the flag true.
  EOT
  type        = bool
  default     = true
}

# --- GitHub Actions ----------------------------------------------------------
variable "github_repository" {
  description = "owner/repo that CI runs from. Used to build the OIDC trust subjects."
  type        = string
  default     = "dibyajyoti-chakrabarti/structra"
}

variable "github_apply_environment" {
  description = "GitHub environment name that terraform apply runs in. Its protection rules are what gate applies."
  type        = string
  default     = "production"
}

variable "create_github_oidc_provider" {
  description = "Create the GitHub OIDC provider, or adopt the existing one. AWS allows only one per URL per account, so this must be false in an account where another project already registered it."
  type        = bool
  default     = false
}
