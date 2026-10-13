# The feedback form's endpoint: a Lambda function URL that opens GitHub issues, built so that it can never cost
# money. It uses only the always-free tiers (Lambda: 1M requests and 400,000 GB-seconds a month; CloudWatch: 10
# alarms, 5 GB of logs; SNS: 1M publishes, 1,000 emails), with:
#
# - one copy at a time (reserved concurrency 1) at 128 MB, so even running non-stop all month it stays inside the
#   free compute (0.125 GB × 2.68M seconds = 335,000 GB-seconds);
# - a kill switch on the request count, which turns it off (concurrency 0) long before the free million requests;
# - no API Gateway, Secrets Manager, S3 or KMS key of its own (none of those are free for ever);
# - logs kept for a day.

data "aws_caller_identity" "me" {}
data "aws_partition" "this" {}

locals {
  name      = "weave-patterner-feedback"
  param_arn = "arn:${data.aws_partition.this.partition}:ssm:${var.region}:${data.aws_caller_identity.me.account_id}:parameter${var.token_parameter}"
  # Every role here carries the boundary from infra/bootstrap, which the CI role can't make roles without.
  boundary = "arn:${data.aws_partition.this.partition}:iam::${data.aws_caller_identity.me.account_id}:policy/${local.name}-boundary"
  lambda_trust = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

# The feedback function.

data "archive_file" "feedback" {
  type        = "zip"
  source_file = "${path.module}/lambda/feedback.mjs"
  output_path = "${path.module}/.build/feedback.zip"
}

resource "aws_cloudwatch_log_group" "feedback" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = 1
}

resource "aws_iam_role" "feedback" {
  name                 = local.name
  assume_role_policy   = local.lambda_trust
  permissions_boundary = local.boundary
}

resource "aws_iam_role_policy" "feedback" {
  name = "logs-and-token"
  role = aws_iam_role.feedback.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.feedback.arn}:*"
      },
      # The token, decrypted with the AWS managed aws/ssm key (free).
      { Effect = "Allow", Action = "ssm:GetParameter", Resource = local.param_arn },
    ]
  })
}

resource "aws_lambda_function" "feedback" {
  function_name    = local.name
  description      = "Weave Patterner's feedback form: opens GitHub issues (infra/feedback)"
  role             = aws_iam_role.feedback.arn
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  handler          = "feedback.handler"
  filename         = data.archive_file.feedback.output_path
  source_code_hash = data.archive_file.feedback.output_base64sha256
  memory_size      = 128
  timeout          = 10
  # One copy at a time: the cap on compute. The kill switch sets this to 0; `terraform apply` sets it back.
  reserved_concurrent_executions = 1

  environment {
    variables = {
      REPO            = var.repo
      TOKEN_PARAMETER = var.token_parameter
      ALLOWED_ORIGINS = join(",", var.allowed_origins)
    }
  }

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.feedback.name
  }

  depends_on = [aws_iam_role_policy.feedback]
}

resource "aws_lambda_function_url" "feedback" {
  function_name      = aws_lambda_function.feedback.function_name
  authorization_type = "NONE"

  # Any origin as far as CORS goes, as Lambda won't take the desktop app's app:// origin here; the function itself
  # only accepts var.allowed_origins.
  cors {
    allow_origins = ["*"]
    allow_methods = ["POST"]
    allow_headers = ["content-type"]
    max_age       = 86400
  }
}

# The kill switch: an alarm on the request count, which tells a small function (and the owner, by email) to turn the
# feedback function off.

resource "aws_sns_topic" "killswitch" {
  name = "${local.name}-killswitch"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.killswitch.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "flood" {
  alarm_name          = "${local.name}-flood"
  alarm_description   = "More feedback requests than real people send: the kill switch turns the function off. Run terraform apply in infra/feedback to turn it back on."
  namespace           = "AWS/Lambda"
  metric_name         = "Invocations"
  dimensions          = { FunctionName = aws_lambda_function.feedback.function_name }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.max_requests_per_5_minutes
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.killswitch.arn]
}

data "archive_file" "killswitch" {
  type        = "zip"
  source_file = "${path.module}/lambda/killswitch.mjs"
  output_path = "${path.module}/.build/killswitch.zip"
}

resource "aws_cloudwatch_log_group" "killswitch" {
  name              = "/aws/lambda/${local.name}-killswitch"
  retention_in_days = 1
}

resource "aws_iam_role" "killswitch" {
  name                 = "${local.name}-killswitch"
  assume_role_policy   = local.lambda_trust
  permissions_boundary = local.boundary
}

resource "aws_iam_role_policy" "killswitch" {
  name = "logs-and-turn-off"
  role = aws_iam_role.killswitch.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.killswitch.arn}:*"
      },
      { Effect = "Allow", Action = "lambda:PutFunctionConcurrency", Resource = aws_lambda_function.feedback.arn },
    ]
  })
}

resource "aws_lambda_function" "killswitch" {
  function_name    = "${local.name}-killswitch"
  description      = "Turns the feedback function off when it gets too many requests (infra/feedback)"
  role             = aws_iam_role.killswitch.arn
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  handler          = "killswitch.handler"
  filename         = data.archive_file.killswitch.output_path
  source_code_hash = data.archive_file.killswitch.output_base64sha256
  memory_size      = 128
  timeout          = 10

  environment {
    variables = { FUNCTION_NAME = aws_lambda_function.feedback.function_name }
  }

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.killswitch.name
  }

  depends_on = [aws_iam_role_policy.killswitch]
}

resource "aws_lambda_permission" "killswitch_from_sns" {
  statement_id  = "AllowSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.killswitch.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.killswitch.arn
}

resource "aws_sns_topic_subscription" "killswitch" {
  topic_arn  = aws_sns_topic.killswitch.arn
  protocol   = "lambda"
  endpoint   = aws_lambda_function.killswitch.arn
  depends_on = [aws_lambda_permission.killswitch_from_sns]
}

# Anyone may call the URL (the form needs no sign-in); the function checks where it came from.
resource "aws_lambda_permission" "feedback_url" {
  statement_id           = "AllowPublicFunctionUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.feedback.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}
