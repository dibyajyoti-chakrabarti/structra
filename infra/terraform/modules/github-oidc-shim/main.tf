###############################################################################
# GitHub OIDC shim — github-cognito-openid-wrapper, adopted from the existing
# `github-oidc-wrapper` CloudFormation stack via `terraform import` (see
# import.sh). GitHub speaks OAuth2, not OIDC; this API Gateway + 5 Lambdas
# expose the standard OIDC endpoints (authorize/token/userinfo/jwks/discovery)
# that Cognito's GitHub identity provider federates against.
###############################################################################

data "aws_region" "current" {}

locals {
  # Physical resource names match the live CloudFormation stack so import is a
  # no-op. The random suffixes are CloudFormation-generated and fixed.
  functions = {
    authorize = {
      name    = "github-oidc-wrapper-Authorize-y74SleeDE5cT"
      handler = "authorize.handler"
      role    = "github-oidc-wrapper-AuthorizeRole-vUzF6qUddSEc"
    }
    token = {
      name    = "github-oidc-wrapper-Token-UKXmv5izG0GD"
      handler = "token.handler"
      role    = "github-oidc-wrapper-TokenRole-jwYANyPyOZiT"
    }
    userinfo = {
      name    = "github-oidc-wrapper-UserInfo-SPtnVdSEJ00M"
      handler = "userinfo.handler"
      role    = "github-oidc-wrapper-UserInfoRole-oPxXBrrlSK2y"
    }
    jwks = {
      name    = "github-oidc-wrapper-Jwks-co7GRqPKdx6Q"
      handler = "jwks.handler"
      role    = "github-oidc-wrapper-JwksRole-O0XupkAlUIEq"
    }
    openid_discovery = {
      name    = "github-oidc-wrapper-OpenIdDiscovery-TMsy5kz9Lsrs"
      handler = "openIdConfiguration.handler"
      role    = "github-oidc-wrapper-OpenIdDiscoveryRole-NqRY20jq00J5"
    }
  }

  # One API Gateway -> Lambda invoke permission per (method, path). Statement IDs
  # match the live CloudFormation logical-id-based SIDs so import is a no-op.
  permissions = {
    authorize_get = { fn = "authorize", method = "GET", path = "/authorize", sid = "github-oidc-wrapper-AuthorizeGetResourcePermissionStage-JLdN73snk0hq" }
    token_get     = { fn = "token", method = "GET", path = "/token", sid = "github-oidc-wrapper-TokenGetResourcePermissionStage-cDUBU8iqdP37" }
    token_post    = { fn = "token", method = "POST", path = "/token", sid = "github-oidc-wrapper-TokenPostResourcePermissionStage-gkPalK6zQhMU" }
    userinfo_get  = { fn = "userinfo", method = "GET", path = "/userinfo", sid = "github-oidc-wrapper-UserInfoGetResourcePermissionStage-GaT5PFlOGKrM" }
    userinfo_post = { fn = "userinfo", method = "POST", path = "/userinfo", sid = "github-oidc-wrapper-UserInfoPostResourcePermissionStage-OA7W0tCx8B4l" }
    jwks_get      = { fn = "jwks", method = "GET", path = "/.well-known/jwks.json", sid = "github-oidc-wrapper-JwksGetResourcePermissionStage-SkGCjLwUsY46" }
    openid_get    = { fn = "openid_discovery", method = "GET", path = "/.well-known/openid-configuration", sid = "github-oidc-wrapper-OpenIdDiscoveryGetResourcePermissionStage-FbIRUOcOLouQ" }
  }

  # Shared env for all 5 handlers (matches the live functions).
  fn_env = {
    GITHUB_CLIENT_ID     = var.github_client_id
    GITHUB_CLIENT_SECRET = var.github_client_secret
    GITHUB_API_URL       = var.github_api_url
    GITHUB_LOGIN_URL     = var.github_login_url
    COGNITO_REDIRECT_URI = var.cognito_redirect_uri
  }
}

# --- IAM (one trivial basic-execution role per function, as in the live stack) -
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "fn" {
  for_each           = local.functions
  name               = each.value.role
  assume_role_policy = data.aws_iam_policy_document.assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "basic" {
  for_each   = local.functions
  role       = aws_iam_role.fn[each.key].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- Lambdas ------------------------------------------------------------------
# Code is left as the imported, already-deployed bundle. The placeholder only
# satisfies the create-time code argument; ignore_changes keeps Terraform from
# ever redeploying it (the bundle embeds the RSA signing key and has no source).
data "archive_file" "placeholder" {
  type        = "zip"
  source_dir  = "${path.module}/placeholder"
  output_path = "${path.module}/build/placeholder.zip"
}

resource "aws_lambda_function" "fn" {
  for_each = local.functions

  function_name = each.value.name
  role          = aws_iam_role.fn[each.key].arn
  runtime       = "nodejs18.x"
  handler       = each.value.handler
  architectures = ["x86_64"]
  memory_size   = 128
  timeout       = 15

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  environment {
    variables = local.fn_env
  }

  tags = var.tags

  lifecycle {
    # Imported black box: leave the deployed bundle AND its env exactly as-is
    # (the live functions have minor per-handler env differences that are
    # working and not worth homogenizing). We manage only the config shell.
    ignore_changes = [filename, source_code_hash, environment]
  }
}

# --- REST API (defined by the exported OpenAPI body) --------------------------
resource "aws_api_gateway_rest_api" "this" {
  name = "github-oidc-wrapper"

  endpoint_configuration {
    types = ["EDGE"]
  }

  body = jsonencode({
    openapi = "3.0.1"
    info    = { title = "github-oidc-wrapper", version = "1.0" }
    paths = {
      for p in [
        { path = "/authorize", methods = ["get"], fn = "authorize" },
        { path = "/token", methods = ["get", "post"], fn = "token" },
        { path = "/userinfo", methods = ["get", "post"], fn = "userinfo" },
        { path = "/.well-known/jwks.json", methods = ["get"], fn = "jwks" },
        { path = "/.well-known/openid-configuration", methods = ["get"], fn = "openid_discovery" },
        ] : p.path => {
        for m in p.methods : m => {
          "x-amazon-apigateway-integration" = {
            uri                  = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${aws_lambda_function.fn[p.fn].arn}/invocations"
            httpMethod           = "POST"
            type                 = "aws_proxy"
            passthroughBehavior  = "when_no_match"
            responseTransferMode = "BUFFERED"
          }
        }
      }
    }
  })
}

resource "aws_api_gateway_deployment" "this" {
  rest_api_id = aws_api_gateway_rest_api.this.id

  triggers = {
    redeployment = sha1(aws_api_gateway_rest_api.this.body)
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "this" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  deployment_id = aws_api_gateway_deployment.this.id
  stage_name    = var.stage_name
}

# --- Allow API Gateway to invoke each handler ---------------------------------
resource "aws_lambda_permission" "invoke" {
  for_each = local.permissions

  statement_id  = each.value.sid
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.fn[each.value.fn].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/${each.value.method}${each.value.path}"
}
