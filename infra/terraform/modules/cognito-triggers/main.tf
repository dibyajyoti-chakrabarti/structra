###############################################################################
# Cognito trigger Lambdas (zip-packaged Python).
#
# The user pool itself is REFERENCED (never managed/destroyed by Terraform).
# These 4 functions already exist in AWS and are wired into the pool's
# lambda_config. Import them once so Terraform owns their code/config going
# forward (the function names below match the existing ones, so the pool's
# lambda_config keeps pointing at the same ARNs):
#
#   terraform import 'module.cognito_triggers.aws_lambda_function.trigger["pre_signup"]'  structra-cognito-pre-signup
#   terraform import 'module.cognito_triggers.aws_lambda_function.trigger["create_auth"]' structra-cognito-create-auth
#   terraform import 'module.cognito_triggers.aws_lambda_function.trigger["define_auth"]' structra-cognito-define-auth
#   terraform import 'module.cognito_triggers.aws_lambda_function.trigger["verify_auth"]' structra-cognito-verify-auth
###############################################################################

locals {
  triggers = {
    pre_signup  = { suffix = "pre-signup", handler = "pre_signup.handler" }
    create_auth = { suffix = "create-auth", handler = "create_auth.handler" }
    define_auth = { suffix = "define-auth", handler = "define_auth.handler" }
    verify_auth = { suffix = "verify-auth", handler = "verify_auth.handler" }
  }
}

data "archive_file" "trigger" {
  for_each    = local.triggers
  type        = "zip"
  source_file = "${var.source_dir}/${each.key}.py"
  output_path = "${path.module}/build/${each.key}.zip"
}

# --- IAM ---------------------------------------------------------------------
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "trigger" {
  for_each           = local.triggers
  name               = "${var.function_name_prefix}-${each.value.suffix}-role"
  assume_role_policy = data.aws_iam_policy_document.assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "logs" {
  for_each   = local.triggers
  role       = aws_iam_role.trigger[each.key].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# pre_signup links external-provider signups to existing native users.
resource "aws_iam_role_policy" "pre_signup_cognito" {
  name = "cognito-link"
  role = aws_iam_role.trigger["pre_signup"].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["cognito-idp:ListUsers", "cognito-idp:AdminLinkProviderForUser"]
      Resource = var.user_pool_arn
    }]
  })
}

# create_auth sends the login OTP via SES.
resource "aws_iam_role_policy" "create_auth_ses" {
  name = "ses-send"
  role = aws_iam_role.trigger["create_auth"].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ses:SendEmail", "ses:SendRawEmail"]
      Resource = var.ses_identity_arn == null ? "*" : var.ses_identity_arn
    }]
  })
}

# --- Functions ---------------------------------------------------------------
resource "aws_cloudwatch_log_group" "trigger" {
  for_each          = local.triggers
  name              = "/aws/lambda/${var.function_name_prefix}-${each.value.suffix}"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_lambda_function" "trigger" {
  for_each         = local.triggers
  function_name    = "${var.function_name_prefix}-${each.value.suffix}"
  role             = aws_iam_role.trigger[each.key].arn
  runtime          = "python3.12"
  handler          = each.value.handler
  architectures    = ["x86_64"]
  filename         = data.archive_file.trigger[each.key].output_path
  source_code_hash = data.archive_file.trigger[each.key].output_base64sha256
  timeout          = 10
  tags             = var.tags

  depends_on = [aws_cloudwatch_log_group.trigger]
}

# Allow the user pool to invoke each trigger.
resource "aws_lambda_permission" "cognito" {
  for_each      = local.triggers
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.trigger[each.key].function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = var.user_pool_arn
}
