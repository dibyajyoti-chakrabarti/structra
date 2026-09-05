###############################################################################
# Inputs for the GitHub-OAuth-to-OIDC shim.
#
# Source lives at services/github-oidc-shim and is built with `make shim-build`
# before apply. Nothing here is imported: the module creates the API Gateway,
# the five Lambdas and the RSA signing key from scratch.
###############################################################################

variable "name_prefix" {
  description = "Prefix for the API and the five function/role names."
  type        = string
  default     = "structra-github-oidc"
}

variable "dist_dir" {
  description = "Built Lambda bundle directory (services/github-oidc-shim/dist-lambda)."
  type        = string
}

variable "github_client_id" {
  description = "GitHub OAuth app client ID (not secret)"
  type        = string
  default     = "Ov23liOv27O0G9LpKn2V"
}

variable "github_client_secret" {
  description = "GitHub OAuth app client secret (sourced from SSM by the stack)"
  type        = string
  sensitive   = true
}

variable "github_api_url" {
  type    = string
  default = "https://api.github.com"
}

variable "github_login_url" {
  type    = string
  default = "https://github.com"
}

variable "cognito_redirect_uri" {
  description = "Cognito hosted-UI idpresponse URL the shim returns the code to."
  type        = string
  default     = "https://auth.structra.cloud/oauth2/idpresponse"
}

variable "runtime" {
  type    = string
  default = "nodejs20.x"
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "stage_name" {
  type    = string
  default = "prod"
}

variable "tags" {
  description = "Tags applied to resources this module creates"
  type        = map(string)
  default     = {}
}
