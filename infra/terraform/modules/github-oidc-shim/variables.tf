###############################################################################
# Inputs for the GitHub-OAuth-to-OIDC shim (the github-cognito-openid-wrapper).
#
# This module is IMPORT-oriented: resource names match the live CloudFormation
# stack exactly so `terraform import` adopts the running API Gateway + 5 Lambdas
# without recreating them (stable issuer URL, stable signing key). Lambda CODE
# is intentionally left unmanaged (see lifecycle.ignore_changes in main.tf) — the
# built bundle embeds the RSA signing key and has no source repo, so we never put
# it in git and never redeploy it.
###############################################################################

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
  description = "Cognito hosted-UI idpresponse URL the shim returns the code to. Bound to the structra-auth domain."
  type        = string
  default     = "https://structra-auth.auth.ap-south-1.amazoncognito.com/oauth2/idpresponse"
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
