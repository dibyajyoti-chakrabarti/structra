###############################################################################
# Cognito auth stack — fully managed (pool + app client + Google/GitHub IdPs +
# hosted-UI domain + 5 trigger Lambdas). Replicates the live structra-user-pool.
#
# Secrets are read from SSM Parameter Store (SecureString, created out-of-band —
# same pattern as the app secrets in 30-compute). Create these before apply:
#   <ssm_prefix>/GOOGLE_OAUTH_CLIENT_SECRET
#   <ssm_prefix>/GITHUB_OAUTH_CLIENT_SECRET
#   <ssm_prefix>/COGNITO_SMTP_PASSWORD
#
# NOTE: the hosted-UI prefix domain "structra-auth" is globally unique per
# region. The live pool still owns it, so a first apply must either free that
# domain (delete the old pool/domain) or set module.cognito.hosted_ui_domain to
# a temporary value to stand up a parallel pool.
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

# GitHub OAuth-to-OIDC shim — imported from the live github-oidc-wrapper stack
# (see modules/github-oidc-shim/import.sh). Owns the OIDC issuer the Cognito
# GitHub IdP federates against.
module "github_oidc_shim" {
  source = "../../modules/github-oidc-shim"

  github_client_secret = data.aws_ssm_parameter.github_client_secret.value
}

module "cognito" {
  source = "../../modules/cognito"

  source_dir = local.lambdas_dir

  google_client_secret = data.aws_ssm_parameter.google_client_secret.value
  github_client_secret = data.aws_ssm_parameter.github_client_secret.value
  smtp_password        = data.aws_ssm_parameter.cognito_smtp_password.value

  # Point the GitHub IdP at the (now Terraform-managed) shim. Resolves to the
  # same URL the live IdP already uses, so this is a no-op on the IdP.
  github_oidc_issuer = module.github_oidc_shim.issuer_url
}
