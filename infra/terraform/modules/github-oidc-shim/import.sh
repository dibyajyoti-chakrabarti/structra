#!/usr/bin/env bash
###############################################################################
# Import the live `github-oidc-wrapper` CloudFormation resources into Terraform
# so the shim is managed here WITHOUT recreating it (stable URL + signing key).
#
# Run from the stack that calls this module:  stacks/10-persistent/
#   bash ../../modules/github-oidc-shim/import.sh
#
# After importing, run `terraform plan` and expect ~no changes. Any small drift
# (e.g. an architectures or endpoint-type mismatch) is fixed by aligning the
# module to what plan reports, NOT by applying over the live resources blindly.
###############################################################################
set -euo pipefail

M='module.github_oidc_shim'

# --- IAM roles ---------------------------------------------------------------
terraform import "$M.aws_iam_role.fn[\"authorize\"]"        github-oidc-wrapper-AuthorizeRole-vUzF6qUddSEc
terraform import "$M.aws_iam_role.fn[\"token\"]"            github-oidc-wrapper-TokenRole-jwYANyPyOZiT
terraform import "$M.aws_iam_role.fn[\"userinfo\"]"         github-oidc-wrapper-UserInfoRole-oPxXBrrlSK2y
terraform import "$M.aws_iam_role.fn[\"jwks\"]"             github-oidc-wrapper-JwksRole-O0XupkAlUIEq
terraform import "$M.aws_iam_role.fn[\"openid_discovery\"]" github-oidc-wrapper-OpenIdDiscoveryRole-NqRY20jq00J5

# --- basic-execution attachments (role-name/policy-arn) ----------------------
BASIC=arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
terraform import "$M.aws_iam_role_policy_attachment.basic[\"authorize\"]"        "github-oidc-wrapper-AuthorizeRole-vUzF6qUddSEc/$BASIC"
terraform import "$M.aws_iam_role_policy_attachment.basic[\"token\"]"            "github-oidc-wrapper-TokenRole-jwYANyPyOZiT/$BASIC"
terraform import "$M.aws_iam_role_policy_attachment.basic[\"userinfo\"]"         "github-oidc-wrapper-UserInfoRole-oPxXBrrlSK2y/$BASIC"
terraform import "$M.aws_iam_role_policy_attachment.basic[\"jwks\"]"             "github-oidc-wrapper-JwksRole-O0XupkAlUIEq/$BASIC"
terraform import "$M.aws_iam_role_policy_attachment.basic[\"openid_discovery\"]" "github-oidc-wrapper-OpenIdDiscoveryRole-NqRY20jq00J5/$BASIC"

# --- Lambda functions --------------------------------------------------------
terraform import "$M.aws_lambda_function.fn[\"authorize\"]"        github-oidc-wrapper-Authorize-y74SleeDE5cT
terraform import "$M.aws_lambda_function.fn[\"token\"]"            github-oidc-wrapper-Token-UKXmv5izG0GD
terraform import "$M.aws_lambda_function.fn[\"userinfo\"]"         github-oidc-wrapper-UserInfo-SPtnVdSEJ00M
terraform import "$M.aws_lambda_function.fn[\"jwks\"]"             github-oidc-wrapper-Jwks-co7GRqPKdx6Q
terraform import "$M.aws_lambda_function.fn[\"openid_discovery\"]" github-oidc-wrapper-OpenIdDiscovery-TMsy5kz9Lsrs

# --- API Gateway (rest api / deployment / stage) -----------------------------
terraform import "$M.aws_api_gateway_rest_api.this"   2d9epepca7
terraform import "$M.aws_api_gateway_deployment.this" 2d9epepca7/z9fdmg
terraform import "$M.aws_api_gateway_stage.this"      2d9epepca7/prod

# --- Lambda invoke permissions (function-name/statement-id) ------------------
terraform import "$M.aws_lambda_permission.invoke[\"authorize_get\"]" "github-oidc-wrapper-Authorize-y74SleeDE5cT/github-oidc-wrapper-AuthorizeGetResourcePermissionStage-JLdN73snk0hq"
terraform import "$M.aws_lambda_permission.invoke[\"token_get\"]"     "github-oidc-wrapper-Token-UKXmv5izG0GD/github-oidc-wrapper-TokenGetResourcePermissionStage-cDUBU8iqdP37"
terraform import "$M.aws_lambda_permission.invoke[\"token_post\"]"    "github-oidc-wrapper-Token-UKXmv5izG0GD/github-oidc-wrapper-TokenPostResourcePermissionStage-gkPalK6zQhMU"
terraform import "$M.aws_lambda_permission.invoke[\"userinfo_get\"]"  "github-oidc-wrapper-UserInfo-SPtnVdSEJ00M/github-oidc-wrapper-UserInfoGetResourcePermissionStage-GaT5PFlOGKrM"
terraform import "$M.aws_lambda_permission.invoke[\"userinfo_post\"]" "github-oidc-wrapper-UserInfo-SPtnVdSEJ00M/github-oidc-wrapper-UserInfoPostResourcePermissionStage-OA7W0tCx8B4l"
terraform import "$M.aws_lambda_permission.invoke[\"jwks_get\"]"      "github-oidc-wrapper-Jwks-co7GRqPKdx6Q/github-oidc-wrapper-JwksGetResourcePermissionStage-SkGCjLwUsY46"
terraform import "$M.aws_lambda_permission.invoke[\"openid_get\"]"    "github-oidc-wrapper-OpenIdDiscovery-TMsy5kz9Lsrs/github-oidc-wrapper-OpenIdDiscoveryGetResourcePermissionStage-FbIRUOcOLouQ"

echo "Imported. Now run: terraform plan   (expect ~no changes)"
