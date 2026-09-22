resource "aws_bedrock_guardrail" "agent" {
  name                      = "${var.name_prefix}-guardrail"
  description               = "Baseline safeguards for the support agent"
  blocked_input_messaging   = "I cannot help with that request."
  blocked_outputs_messaging = "I cannot provide that response."
  kms_key_arn               = aws_kms_key.guardrail.arn

  content_policy_config {
    # Written for you: the prompt attack filter. This is the one that matters most
    # for an agent, and note that it has no output strength, because a prompt attack
    # is an input-side concept.
    filters_config {
      type            = "PROMPT_ATTACK"
      input_strength  = "HIGH"
      output_strength = "NONE"
    }

    # TODO 1 — add the five harm categories: HATE, INSULTS, SEXUAL, VIOLENCE, MISCONDUCT.
    # Each needs input_strength and output_strength. Use HIGH for both unless you have
    # a reason not to, and be ready to say what that reason is.
  }

  # TODO 2 — add a topic_policy_config block with at least one topics_config.
  # A topics_config needs name, type = "DENY", definition, and optionally examples.
  # Deny something this agent genuinely should not discuss, for example giving
  # individual financial or medical advice.

  # TODO 3 — add a sensitive_information_policy_config block.
  # Include at least one pii_entities_config with action = "BLOCK" (for something that
  # should never appear at all, such as CREDIT_DEBIT_CARD_NUMBER) and at least one with
  # action = "ANONYMIZE" (for something the answer can survive without, such as EMAIL).

  # TODO 4 — add a contextual_grounding_policy_config with filters_config entries for
  # type = "GROUNDING" and type = "RELEVANCE", each with a threshold between 0 and 0.99.
  # Remember this is evaluated on the output only; it never sees the prompt.

  tags = {
    Owner       = "platform-team"
    Environment = "prod"
  }
}

# TODO 5 — publish a version.
# Add an aws_bedrock_guardrail_version resource named "agent" with:
#   guardrail_arn = aws_bedrock_guardrail.agent.guardrail_arn
#   description   = something meaningful
# Enforcement cannot reference DRAFT, because a draft is mutable and therefore
# not something anyone can attest to.
