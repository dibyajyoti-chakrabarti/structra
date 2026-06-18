# The 4 trigger Lambdas already exist and handle LIVE auth. Managing them in
# Terraform requires importing the existing functions + log groups first (see
# modules/cognito-triggers/main.tf for the import commands). This is gated OFF
# by default so the initial bring-up never touches live auth; enable it
# (manage_cognito_triggers = true) only as a deliberate step after importing.
module "cognito_triggers" {
  count  = var.manage_cognito_triggers ? 1 : 0
  source = "../../modules/cognito-triggers"

  function_name_prefix = "structra-cognito"
  source_dir           = local.lambdas_dir
  user_pool_arn        = data.aws_cognito_user_pool.this.arn
  ses_identity_arn     = var.ses_identity_arn
}
