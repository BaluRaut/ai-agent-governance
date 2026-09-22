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

# The logged input is the original request, unmasked, even where the guardrail
# redacted it downstream. Treat this log group as a store of customer data:
# the retention above is deliberate, and the key is customer-managed.
resource "aws_bedrock_model_invocation_logging_configuration" "this" {
  logging_config {
    text_data_delivery_enabled      = true
    image_data_delivery_enabled     = false
    embedding_data_delivery_enabled = false

    cloudwatch_config {
      log_group_name = aws_cloudwatch_log_group.bedrock.name
      role_arn       = aws_iam_role.bedrock_logging.arn
    }
  }
}
