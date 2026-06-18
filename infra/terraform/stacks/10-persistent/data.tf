data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# The Cognito user pool already exists and is REFERENCED only — Terraform never
# manages or destroys it.
data "aws_cognito_user_pool" "this" {
  user_pool_id = var.cognito_user_pool_id
}
