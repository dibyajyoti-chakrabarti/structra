###############################################################################
# Full Cognito auth stack — replica of the live structra-user-pool.
#
# Resource ordering (a clean DAG, no module-level cycle):
#   roles ─▶ functions ─▶ user pool (lambda_config) ─▶ lambda_permission
#                                                   └─▶ cognito-link IAM policy
###############################################################################

locals {
  # Trigger key -> { suffix, handler, role, invoke_sid }
  # define/create/verify_auth share one role: they are the three halves of the
  # same custom-auth (email OTP) challenge flow.
  triggers = {
    pre_signup        = { suffix = "pre-signup", handler = "pre_signup.handler", role = "pre_signup", invoke_sid = "cognito-invoke", timeout = 10 }
    post_confirmation = { suffix = "post-confirmation", handler = "post_confirmation.handler", role = "post_confirmation", invoke_sid = "cognito-post-confirmation", timeout = 3 }
    define_auth       = { suffix = "define-auth", handler = "define_auth.handler", role = "otp", invoke_sid = "cognito-invoke", timeout = 3 }
    create_auth       = { suffix = "create-auth", handler = "create_auth.handler", role = "otp", invoke_sid = "cognito-invoke", timeout = 10 }
    verify_auth       = { suffix = "verify-auth", handler = "verify_auth.handler", role = "otp", invoke_sid = "cognito-invoke", timeout = 3 }
  }

  # Live IAM topology: dedicated roles for pre-signup and post-confirmation
  # (both link external sign-ups to native users), and one shared role for the
  # three OTP custom-auth handlers. `link` => needs cognito ListUsers/AdminLink.
  roles = {
    pre_signup        = { name = "structra-pre-signup-lambda-role", link = true }
    post_confirmation = { name = "structra-post-confirmation-lambda-role", link = true }
    otp               = { name = "structra-cognito-otp-lambda-role", link = false }
  }

  link_roles = { for k, v in local.roles : k => v if v.link }
}

# --- Trigger Lambda packaging -------------------------------------------------
data "archive_file" "trigger" {
  for_each    = local.triggers
  type        = "zip"
  source_file = "${var.source_dir}/${each.key}.py"
  output_path = "${path.module}/build/${each.key}.zip"
}

# --- IAM ----------------------------------------------------------------------
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
  for_each           = local.roles
  name               = each.value.name
  assume_role_policy = data.aws_iam_policy_document.assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "logs" {
  for_each   = local.roles
  role       = aws_iam_role.trigger[each.key].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# pre_signup + post_confirmation link external-provider sign-ups to the matching
# native user. Scoped to this pool. Separate resource (not baked into the role)
# so it can depend on the pool ARN without a creation cycle.
# NOTE: the shared OTP role intentionally has NO extra policy — the live
# `ses-send-email` inline policy is dropped (OTP goes via SMTP, not SES), so
# importing will show that one policy being removed (a benign cleanup).
resource "aws_iam_role_policy" "cognito_link" {
  for_each = local.link_roles
  name     = "cognito-link-accounts"
  role     = aws_iam_role.trigger[each.key].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["cognito-idp:ListUsers", "cognito-idp:AdminLinkProviderForUser"]
      Resource = aws_cognito_user_pool.this.arn
    }]
  })
}

# --- Trigger functions --------------------------------------------------------
resource "aws_cloudwatch_log_group" "trigger" {
  for_each          = local.triggers
  name              = "/aws/lambda/${var.function_name_prefix}-${each.value.suffix}"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_lambda_function" "trigger" {
  for_each         = local.triggers
  function_name    = "${var.function_name_prefix}-${each.value.suffix}"
  role             = aws_iam_role.trigger[each.value.role].arn
  runtime          = "python3.12"
  handler          = each.value.handler
  architectures    = ["x86_64"]
  filename         = data.archive_file.trigger[each.key].output_path
  source_code_hash = data.archive_file.trigger[each.key].output_base64sha256
  timeout          = each.value.timeout
  tags             = var.tags

  # OTP email is sent by create_auth over Zoho SMTP (no SES).
  dynamic "environment" {
    for_each = each.key == "create_auth" ? [1] : []
    content {
      variables = {
        SMTP_HOST = var.smtp_host
        SMTP_PORT = var.smtp_port
        SMTP_USER = var.smtp_user
        SMTP_PASS = var.smtp_password
      }
    }
  }

  depends_on = [aws_cloudwatch_log_group.trigger]
}

resource "aws_lambda_permission" "cognito" {
  for_each      = local.triggers
  statement_id  = each.value.invoke_sid
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.trigger[each.key].function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.this.arn
}

# --- User pool ----------------------------------------------------------------
resource "aws_cognito_user_pool" "this" {
  name                = var.pool_name
  username_attributes = ["email"]
  deletion_protection = "INACTIVE"
  mfa_configuration   = "OFF"
  user_pool_tier      = "ESSENTIALS"

  # email is the required, mutable sign-in attribute. Cognito schema attributes
  # are immutable once the pool exists, so changing this later means replacing
  # the pool. Terraform cannot add or remove them after the fact.
  schema {
    name                     = "email"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  password_policy {
    minimum_length                   = 8
    require_lowercase                = false
    require_uppercase                = false
    require_numbers                  = false
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
    recovery_mechanism {
      name     = "verified_phone_number"
      priority = 2
    }
  }

  # Pool-level sender is Cognito's default; the login OTP itself is delivered by
  # the create_auth trigger over SMTP, not by Cognito.
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  lambda_config {
    pre_sign_up                    = aws_lambda_function.trigger["pre_signup"].arn
    post_confirmation              = aws_lambda_function.trigger["post_confirmation"].arn
    define_auth_challenge          = aws_lambda_function.trigger["define_auth"].arn
    create_auth_challenge          = aws_lambda_function.trigger["create_auth"].arn
    verify_auth_challenge_response = aws_lambda_function.trigger["verify_auth"].arn
  }

  tags = var.tags
}

# --- Hosted-UI domain ---------------------------------------------------------
# A custom domain (certificate_arn set) is served by a Cognito-managed
# CloudFront distribution; the caller points DNS at cloudfront_distribution.
resource "aws_cognito_user_pool_domain" "this" {
  count = var.create_hosted_ui_domain ? 1 : 0

  domain          = var.hosted_ui_domain
  certificate_arn = var.hosted_ui_certificate_arn
  user_pool_id    = aws_cognito_user_pool.this.id
}

# --- Identity providers -------------------------------------------------------
# Google. Cognito stores the resolved endpoint URLs in provider_details, so we
# declare the full set to avoid perpetual drift.
resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.this.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id                     = var.google_client_id
    client_secret                 = var.google_client_secret
    authorize_scopes              = "profile email openid"
    authorize_url                 = "https://accounts.google.com/o/oauth2/v2/auth"
    token_url                     = "https://www.googleapis.com/oauth2/v4/token"
    token_request_method          = "POST"
    oidc_issuer                   = "https://accounts.google.com"
    attributes_url                = "https://people.googleapis.com/v1/people/me?personFields="
    attributes_url_add_attributes = "true"
  }

  attribute_mapping = {
    email    = "email"
    name     = "name"
    username = "sub"
  }

  lifecycle {
    # Cognito never returns IdP secrets on read, so an unignored client_secret
    # shows up as a perpetual diff. Rotating it means updating SSM and then
    # applying with this ignore removed (or replacing the IdP).
    ignore_changes = [provider_details["client_secret"]]
  }
}

# GitHub via the OIDC shim. Cognito auto-discovers authorize/token/jwks/userinfo
# from the issuer's /.well-known/openid-configuration.
resource "aws_cognito_identity_provider" "github" {
  user_pool_id  = aws_cognito_user_pool.this.id
  provider_name = "GitHub"
  provider_type = "OIDC"

  provider_details = {
    client_id                     = var.github_client_id
    client_secret                 = var.github_client_secret
    authorize_scopes              = "openid user:email"
    oidc_issuer                   = var.github_oidc_issuer
    attributes_request_method     = "GET"
    attributes_url_add_attributes = "false"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
  }

  lifecycle {
    # Cognito never returns IdP secrets on read, so an unignored client_secret
    # shows up as a perpetual diff. Rotating it means updating SSM and then
    # applying with this ignore removed (or replacing the IdP).
    ignore_changes = [provider_details["client_secret"]]
  }
}

# --- App client (public SPA) --------------------------------------------------
resource "aws_cognito_user_pool_client" "web" {
  name         = var.app_client_name
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false # public SPA client

  explicit_auth_flows = [
    "ALLOW_CUSTOM_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  supported_identity_providers = ["COGNITO", "Google", "GitHub"]

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  allowed_oauth_flows_user_pool_client = true

  enable_token_revocation                       = true
  enable_propagate_additional_user_context_data = false

  # Live: refresh 30 days; access/id left at Cognito's 60-minute default (stored
  # as 0 with no token_validity_units), so we set only the refresh validity.
  refresh_token_validity = 30

  auth_session_validity = 10

  lifecycle {
    # generate_secret is not reported on import, so Terraform reads it as null
    # and a null->false change would force replacement (new client ID). The live
    # client is public (no secret), so ignore it to keep the import in-place.
    ignore_changes = [generate_secret]
  }

  # The client lists Google/GitHub as supported IdPs, so they must exist first.
  depends_on = [
    aws_cognito_identity_provider.google,
    aws_cognito_identity_provider.github,
  ]
}
