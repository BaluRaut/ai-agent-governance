# The guardrail above exists. Nothing yet requires anyone to use it.
#
# TODO 7 — make it mandatory.
# Add an aws_iam_policy resource named "require_guardrail" whose document has a
# statement with:
#   Effect   = "Deny"
#   Action   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream", "bedrock:Converse", "bedrock:ConverseStream"]
#   Resource = "*"
#   Condition with StringNotEquals on "bedrock:GuardrailIdentifier" set to the published
#   guardrail version ARN, so a call with no guardrail or the wrong one is refused.
#
# Attach this to the roles your applications assume. A deny here cannot be
# overridden by any allow, which is exactly the property you want.
