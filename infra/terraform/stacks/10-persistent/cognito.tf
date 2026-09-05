###############################################################################
# Cognito auth stack - fully managed (pool + app client + Google/GitHub IdPs +
# hosted-UI domain + 5 trigger Lambdas).
#
# Built fresh in account 469465348250. The original pool lived in the old
# account, which we no longer have access to, so nothing is imported: this
# apply mints a NEW pool ID and app-client ID and starts with zero users.
# Update VITE_COGNITO_* and the Google/GitHub OAuth app redirect URIs to match
# the values `terraform output` reports after the first apply.
#
# Secrets are read from SSM Parameter Store (SecureString, created out-of-band —
# same pattern as the app secrets in 30-compute). Create these before apply:
#   <ssm_prefix>/GOOGLE_OAUTH_CLIENT_SECRET
#   <ssm_prefix>/GITHUB_OAUTH_CLIENT_SECRET
#   <ssm_prefix>/COGNITO_SMTP_PASSWORD
#
# The hosted UI is a CUSTOM domain (auth.structra.cloud) rather than a Cognito
# prefix domain: the old account still holds the "structra-auth" prefix and we
# can no longer release it. AWS will not create a custom domain until the parent
# domain has an A record, and structra.cloud's apex alias comes from 30-compute,
# so a from-scratch build applies this stack twice. See the README bootstrap.
###############################################################################

data "aws_ssm_parameter" "google_client_secret" {
  name            = "${var.ssm_prefix}/GOOGLE_OAUTH_CLIENT_SECRET"
  with_decryption = true
}

data "aws_ssm_parameter" "github_client_secret" {
  name            = "${var.ssm_prefix}/GITHUB_OAUTH_CLIENT_SECRET"
  with_decryption = true
}

data "aws_ssm_parameter" "cognito_smtp_password" {
  name            = "${var.ssm_prefix}/COGNITO_SMTP_PASSWORD"
  with_decryption = true
}

# GitHub OAuth-to-OIDC shim. Owns the OIDC issuer the Cognito GitHub IdP
# federates against. The old account's deployed bundle is unrecoverable, so
# this module currently has no real handler code (see its README).
module "github_oidc_shim" {
  source = "../../modules/github-oidc-shim"

  dist_dir             = local.shim_dist_dir
  github_client_secret = data.aws_ssm_parameter.github_client_secret.value

  # Static because the hosted UI is a custom domain we own, so the URL is known
  # before the Cognito domain resource exists. That breaks what would otherwise
  # be a dependency cycle between the shim and the pool.
  cognito_redirect_uri = "https://${var.cognito_hosted_ui_domain}/oauth2/idpresponse"
}

module "cognito" {
  source = "../../modules/cognito"

  source_dir = local.lambdas_dir

  hosted_ui_domain          = var.cognito_hosted_ui_domain
  hosted_ui_certificate_arn = aws_acm_certificate_validation.main.certificate_arn
  create_hosted_ui_domain   = var.create_cognito_hosted_ui_domain

  google_client_secret = data.aws_ssm_parameter.google_client_secret.value
  github_client_secret = data.aws_ssm_parameter.github_client_secret.value
  smtp_password        = data.aws_ssm_parameter.cognito_smtp_password.value

  # Point the GitHub IdP at the shim. The issuer URL is new in this account,
  # so the GitHub OAuth app's callback URL has to be updated to match.
  github_oidc_issuer = module.github_oidc_shim.issuer_url
}
