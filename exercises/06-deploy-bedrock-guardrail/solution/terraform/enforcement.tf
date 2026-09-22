# The guardrail exists and is versioned. This is what makes using it compulsory.
#
# A Deny cannot be overridden by any Allow, so attaching this to the roles your
# applications assume means no caller in those roles can invoke a model without
# passing the published guardrail version.

resource "aws_iam_policy" "require_guardrail" {
  name        = "${var.name_prefix}-require-guardrail"
  description = "Refuse Bedrock inference that does not carry the approved guardrail"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyInferenceWithoutApprovedGuardrail"
      Effect = "Deny"
      Action = [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:Converse",
        "bedrock:ConverseStream",
      ]
      Resource = "*"
      Condition = {
        StringNotEquals = {
          "bedrock:GuardrailIdentifier" = "${aws_bedrock_guardrail.agent.guardrail_arn}:${aws_bedrock_guardrail_version.agent.version}"
        }
      }
    }]
  })
}

output "guardrail_version_arn" {
  description = "Reference this from an Organizations Bedrock policy to enforce org-wide."
  value       = "${aws_bedrock_guardrail.agent.guardrail_arn}:${aws_bedrock_guardrail_version.agent.version}"
}
