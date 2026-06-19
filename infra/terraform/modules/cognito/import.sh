#!/usr/bin/env bash
###############################################################################
# Adopt the live structra Cognito stack into Terraform WITHOUT recreating it
# (same pool ID, client ID, domain, triggers — zero downtime, no ID churn).
#
# Run from the stack that calls this module:  stacks/10-persistent/
#   bash ../../modules/cognito/import.sh
#
# Then `terraform plan` and expect only benign changes (default tags added; the
# vestigial SES inline policy on the OTP role removed; an identical re-deploy of
# the trigger code). Align the module to anything unexpected before applying.
###############################################################################
set -euo pipefail

M='module.cognito'
POOL='ap-south-1_QD5vjF5ej'
CLIENT='2dmikoh9ligfjqe9auo8ioh21m'
BASIC='arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'

# --- Pool, client, IdPs, domain ----------------------------------------------
terraform import "$M.aws_cognito_user_pool.this"            "$POOL"
terraform import "$M.aws_cognito_user_pool_client.web"      "$POOL/$CLIENT"
terraform import "$M.aws_cognito_identity_provider.google"  "$POOL:Google"
terraform import "$M.aws_cognito_identity_provider.github"  "$POOL:GitHub"
terraform import "$M.aws_cognito_user_pool_domain.this"     structra-auth

# --- IAM roles (3: pre-signup, post-confirmation, shared OTP) -----------------
terraform import "$M.aws_iam_role.trigger[\"pre_signup\"]"        structra-pre-signup-lambda-role
terraform import "$M.aws_iam_role.trigger[\"post_confirmation\"]" structra-post-confirmation-lambda-role
terraform import "$M.aws_iam_role.trigger[\"otp\"]"               structra-cognito-otp-lambda-role

terraform import "$M.aws_iam_role_policy_attachment.logs[\"pre_signup\"]"        "structra-pre-signup-lambda-role/$BASIC"
terraform import "$M.aws_iam_role_policy_attachment.logs[\"post_confirmation\"]" "structra-post-confirmation-lambda-role/$BASIC"
terraform import "$M.aws_iam_role_policy_attachment.logs[\"otp\"]"               "structra-cognito-otp-lambda-role/$BASIC"

terraform import "$M.aws_iam_role_policy.cognito_link[\"pre_signup\"]"        "structra-pre-signup-lambda-role:cognito-link-accounts"
terraform import "$M.aws_iam_role_policy.cognito_link[\"post_confirmation\"]" "structra-post-confirmation-lambda-role:cognito-link-accounts"

# --- Trigger log groups -------------------------------------------------------
terraform import "$M.aws_cloudwatch_log_group.trigger[\"pre_signup\"]"        /aws/lambda/structra-cognito-pre-signup
terraform import "$M.aws_cloudwatch_log_group.trigger[\"post_confirmation\"]" /aws/lambda/structra-cognito-post-confirmation
terraform import "$M.aws_cloudwatch_log_group.trigger[\"define_auth\"]"       /aws/lambda/structra-cognito-define-auth
terraform import "$M.aws_cloudwatch_log_group.trigger[\"create_auth\"]"       /aws/lambda/structra-cognito-create-auth
terraform import "$M.aws_cloudwatch_log_group.trigger[\"verify_auth\"]"       /aws/lambda/structra-cognito-verify-auth

# --- Trigger functions --------------------------------------------------------
terraform import "$M.aws_lambda_function.trigger[\"pre_signup\"]"        structra-cognito-pre-signup
terraform import "$M.aws_lambda_function.trigger[\"post_confirmation\"]" structra-cognito-post-confirmation
terraform import "$M.aws_lambda_function.trigger[\"define_auth\"]"       structra-cognito-define-auth
terraform import "$M.aws_lambda_function.trigger[\"create_auth\"]"       structra-cognito-create-auth
terraform import "$M.aws_lambda_function.trigger[\"verify_auth\"]"       structra-cognito-verify-auth

# --- Cognito -> Lambda invoke permissions (function-name/statement-id) --------
terraform import "$M.aws_lambda_permission.cognito[\"pre_signup\"]"        "structra-cognito-pre-signup/cognito-invoke"
terraform import "$M.aws_lambda_permission.cognito[\"post_confirmation\"]" "structra-cognito-post-confirmation/cognito-post-confirmation"
terraform import "$M.aws_lambda_permission.cognito[\"define_auth\"]"       "structra-cognito-define-auth/cognito-invoke"
terraform import "$M.aws_lambda_permission.cognito[\"create_auth\"]"       "structra-cognito-create-auth/cognito-invoke"
terraform import "$M.aws_lambda_permission.cognito[\"verify_auth\"]"       "structra-cognito-verify-auth/cognito-invoke"

echo "Imported. Now run: terraform plan   (expect only benign changes)"
