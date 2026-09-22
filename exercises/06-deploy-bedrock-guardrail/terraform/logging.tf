resource "aws_cloudwatch_log_group" "bedrock" {
  name              = "/aws/bedrock/${var.name_prefix}/model-invocations"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.guardrail.arn
}

resource "aws_iam_role" "bedrock_logging" {
  name = "${var.name_prefix}-bedrock-logging"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "bedrock.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
      }
    }]
  })
}

resource "aws_iam_role_policy" "bedrock_logging" {
  role = aws_iam_role.bedrock_logging.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "${aws_cloudwatch_log_group.bedrock.arn}:*"
    }]
  })
}

# TODO 6 — turn logging on.
# Add an aws_bedrock_model_invocation_logging_configuration resource named "this" with:
#   logging_config {
#     text_data_delivery_enabled = true
#     cloudwatch_config {
#       log_group_name = aws_cloudwatch_log_group.bedrock.name
#       role_arn       = aws_iam_role.bedrock_logging.arn
#     }
#   }
# Before you do: the logged input contains the original request, unmasked, even when
# the guardrail redacted it. You are creating a second store of customer data.
