# What the infrastructure workflow (.github/workflows/infra.yml) needs to deploy infra/feedback, made once by hand:
#
# - an S3 bucket for Terraform state (private, encrypted, versioned, old versions kept 30 days: a few KB, so about
#   $0.0001 a month);
# - GitHub's OIDC provider, so workflows sign in to AWS without stored keys;
# - a role only this repo's main branch can take, allowed to manage just the weave-patterner-feedback* resources and
#   their state. Any role it makes must carry the permissions boundary below, so it can't make itself more powerful.

data "aws_caller_identity" "me" {}

locals {
  account = data.aws_caller_identity.me.account_id
  prefix  = "weave-patterner-feedback"
  lambda  = "arn:aws:lambda:${var.region}:${local.account}:function:${local.prefix}*"
}

resource "aws_s3_bucket" "state" {
  bucket = "weave-patterner-terraform-state-${local.account}"
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    id     = "old-versions"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.state.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "TLSOnly"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

# The most any role the workflow makes may do: what the feedback functions need, and no more.
resource "aws_iam_policy" "boundary" {
  name        = "${local.prefix}-boundary"
  description = "Permissions boundary for the feedback functions' roles (infra/bootstrap)"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:${var.region}:${local.account}:log-group:/aws/lambda/${local.prefix}*"
      },
      {
        Effect   = "Allow"
        Action   = "ssm:GetParameter"
        Resource = "arn:aws:ssm:${var.region}:${local.account}:parameter/weave-patterner/feedback/*"
      },
      { Effect = "Allow", Action = "lambda:PutFunctionConcurrency", Resource = local.lambda },
    ]
  })
}

resource "aws_iam_role" "ci" {
  name        = "weave-patterner-terraform-ci"
  description = "Deploys infra/feedback from GitHub Actions (main branch only)"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${var.repo}:ref:refs/heads/main"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "ci" {
  name = "deploy-feedback"
  role = aws_iam_role.ci.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "State"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.state.arn}/feedback/*"
      },
      {
        Sid       = "ListState"
        Effect    = "Allow"
        Action    = "s3:ListBucket"
        Resource  = aws_s3_bucket.state.arn
        Condition = { StringLike = { "s3:prefix" = ["feedback/*"] } }
      },
      { Sid = "Functions", Effect = "Allow", Action = "lambda:*", Resource = local.lambda },
      {
        Sid      = "Logs"
        Effect   = "Allow"
        Action   = "logs:*"
        Resource = "arn:aws:logs:${var.region}:${local.account}:log-group:/aws/lambda/${local.prefix}*"
      },
      {
        Sid      = "Alerts"
        Effect   = "Allow"
        Action   = "sns:*"
        Resource = "arn:aws:sns:${var.region}:${local.account}:${local.prefix}*"
      },
      {
        Sid      = "Alarm"
        Effect   = "Allow"
        Action   = "cloudwatch:*"
        Resource = "arn:aws:cloudwatch:${var.region}:${local.account}:alarm:${local.prefix}*"
      },
      {
        Sid      = "Describe"
        Effect   = "Allow"
        Action   = ["logs:DescribeLogGroups", "cloudwatch:DescribeAlarms", "sns:GetSubscriptionAttributes"]
        Resource = "*"
      },
      {
        Sid    = "ReadRoles"
        Effect = "Allow"
        Action = [
          "iam:GetRole", "iam:GetRolePolicy", "iam:ListRolePolicies", "iam:ListAttachedRolePolicies",
          "iam:ListInstanceProfilesForRole", "iam:TagRole", "iam:UntagRole", "iam:DeleteRole",
          "iam:DeleteRolePolicy", "iam:UpdateAssumeRolePolicy",
        ]
        Resource = "arn:aws:iam::${local.account}:role/${local.prefix}*"
      },
      {
        Sid       = "MakeRolesOnlyWithTheBoundary"
        Effect    = "Allow"
        Action    = ["iam:CreateRole", "iam:PutRolePolicy"]
        Resource  = "arn:aws:iam::${local.account}:role/${local.prefix}*"
        Condition = { StringEquals = { "iam:PermissionsBoundary" = aws_iam_policy.boundary.arn } }
      },
      {
        Sid       = "PassRolesToLambda"
        Effect    = "Allow"
        Action    = "iam:PassRole"
        Resource  = "arn:aws:iam::${local.account}:role/${local.prefix}*"
        Condition = { StringEquals = { "iam:PassedToService" = "lambda.amazonaws.com" } }
      },
      {
        Sid      = "KeepTheBoundary"
        Effect   = "Deny"
        Action   = ["iam:DeleteRolePermissionsBoundary", "iam:PutRolePermissionsBoundary"]
        Resource = "*"
      },
    ]
  })
}
