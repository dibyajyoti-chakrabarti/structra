###############################################################################
# GitHub Actions Terraform identities.
#
# Deliberately separate from structra-github-OIDC-Role (github_oidc_deploy.tf),
# which only ships code to resources that already exist. Terraform creates and
# destroys infrastructure, including IAM, so it needs far more power and is kept
# apart rather than widening the deploy role.
#
# Two roles, because plan and apply do not need the same rights:
#
#   structra-github-terraform-plan   read-only + state lock. Assumable from any
#                                    workflow run, so pull requests can plan.
#   structra-github-terraform-apply  PowerUser + IAM scoped to structra-*.
#                                    Assumable ONLY from the `production`
#                                    GitHub environment, so environment
#                                    protection rules gate every apply.
#
# The apply role can modify the roles it and the deploy role use. That is
# inherent in Terraform owning its own CI identity; the environment gate is what
# keeps it from being exercised casually.
###############################################################################

locals {
  gh_repo = "repo:${var.github_repository}"

  tf_state_bucket_arn = "arn:aws:s3:::structra-tfstate-${data.aws_caller_identity.current.account_id}-${var.region}"
  tf_lock_table_arn   = "arn:aws:dynamodb:${var.region}:${data.aws_caller_identity.current.account_id}:table/structra-tflock"
}

# --- Shared: remote state access ---------------------------------------------
data "aws_iam_policy_document" "tf_state" {
  statement {
    sid       = "StateBucketList"
    effect    = "Allow"
    actions   = ["s3:ListBucket", "s3:GetBucketVersioning"]
    resources = [local.tf_state_bucket_arn]
  }
  statement {
    sid       = "StateObjects"
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${local.tf_state_bucket_arn}/*"]
  }
  statement {
    sid       = "StateLock"
    effect    = "Allow"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:DescribeTable"]
    resources = [local.tf_lock_table_arn]
  }
}

# --- Plan role ----------------------------------------------------------------
data "aws_iam_policy_document" "tf_plan_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github_actions.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["${local.gh_repo}:*"]
    }
  }
}

resource "aws_iam_role" "terraform_plan" {
  name               = "structra-github-terraform-plan"
  description        = "GitHub Actions: terraform plan. Read-only plus remote-state access."
  assume_role_policy = data.aws_iam_policy_document.tf_plan_assume.json
}

resource "aws_iam_role_policy_attachment" "terraform_plan_readonly" {
  role       = aws_iam_role.terraform_plan.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

resource "aws_iam_role_policy" "terraform_plan_state" {
  name   = "remote-state"
  role   = aws_iam_role.terraform_plan.id
  policy = data.aws_iam_policy_document.tf_state.json
}

# --- Apply role ---------------------------------------------------------------
data "aws_iam_policy_document" "tf_apply_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github_actions.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # Only runs targeting the protected environment, never a bare branch push.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["${local.gh_repo}:environment:${var.github_apply_environment}"]
    }
  }
}

resource "aws_iam_role" "terraform_apply" {
  name               = "structra-github-terraform-apply"
  description        = "GitHub Actions: terraform apply. Gated by the ${var.github_apply_environment} environment."
  assume_role_policy = data.aws_iam_policy_document.tf_apply_assume.json
}

# PowerUserAccess covers every service this stack touches but withholds IAM,
# which Terraform does need, so IAM is granted separately and by name below.
resource "aws_iam_role_policy_attachment" "terraform_apply_power" {
  role       = aws_iam_role.terraform_apply.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

resource "aws_iam_role_policy" "terraform_apply_state" {
  name   = "remote-state"
  role   = aws_iam_role.terraform_apply.id
  policy = data.aws_iam_policy_document.tf_state.json
}

resource "aws_iam_role_policy" "terraform_apply_iam" {
  name = "iam-structra-scoped"
  role = aws_iam_role.terraform_apply.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Terraform reads IAM broadly during refresh; writes are scoped below.
        Sid      = "IamRead"
        Effect   = "Allow"
        Action   = ["iam:Get*", "iam:List*", "iam:SimulatePrincipalPolicy"]
        Resource = "*"
      },
      {
        Sid    = "ManageStructraRoles"
        Effect = "Allow"
        Action = [
          "iam:CreateRole", "iam:DeleteRole", "iam:UpdateRole",
          "iam:UpdateRoleDescription", "iam:UpdateAssumeRolePolicy",
          "iam:PutRolePolicy", "iam:DeleteRolePolicy",
          "iam:AttachRolePolicy", "iam:DetachRolePolicy",
          "iam:TagRole", "iam:UntagRole", "iam:PassRole"
        ]
        Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/structra-*"
      },
      {
        Sid    = "ManageStructraInstanceProfiles"
        Effect = "Allow"
        Action = [
          "iam:CreateInstanceProfile", "iam:DeleteInstanceProfile",
          "iam:AddRoleToInstanceProfile", "iam:RemoveRoleFromInstanceProfile",
          "iam:TagInstanceProfile", "iam:UntagInstanceProfile"
        ]
        Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:instance-profile/structra-*"
      },
      {
        Sid    = "ManageGithubOidcProvider"
        Effect = "Allow"
        Action = [
          "iam:CreateOpenIDConnectProvider", "iam:DeleteOpenIDConnectProvider",
          "iam:UpdateOpenIDConnectProviderThumbprint",
          "iam:AddClientIDToOpenIDConnectProvider",
          "iam:RemoveClientIDFromOpenIDConnectProvider",
          "iam:TagOpenIDConnectProvider", "iam:UntagOpenIDConnectProvider"
        ]
        Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
      },
      {
        # Cognito, RDS and others create their own service-linked roles.
        Sid      = "ServiceLinkedRoles"
        Effect   = "Allow"
        Action   = ["iam:CreateServiceLinkedRole"]
        Resource = "*"
      },
      {
        # PowerUserAccess does not grant reading SecureStrings.
        Sid      = "ReadAppSecrets"
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/structra/*"
      }
    ]
  })
}
