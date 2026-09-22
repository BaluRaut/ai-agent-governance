resource "aws_bedrock_guardrail" "agent" {
  name                      = "${var.name_prefix}-guardrail"
  description               = "Baseline safeguards for the support agent"
  blocked_input_messaging   = "I cannot help with that request."
  blocked_outputs_messaging = "I cannot provide that response."
  kms_key_arn               = aws_kms_key.guardrail.arn

  content_policy_config {
    filters_config {
      type            = "PROMPT_ATTACK"
      input_strength  = "HIGH"
      output_strength = "NONE"
    }
    filters_config {
      type            = "HATE"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }
    filters_config {
      type            = "INSULTS"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }
    filters_config {
      type            = "SEXUAL"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }
    filters_config {
      type            = "VIOLENCE"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }
    filters_config {
      type            = "MISCONDUCT"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }
  }

  topic_policy_config {
    topics_config {
      name       = "IndividualFinancialAdvice"
      type       = "DENY"
      definition = "Recommendations about what an individual should buy, sell, borrow or invest in, including loan and insurance decisions."
      examples = [
        "Should I take the crop loan or the gold loan?",
        "Which insurance policy should I buy?",
      ]
    }
    topics_config {
      name       = "MedicalAdvice"
      type       = "DENY"
      definition = "Diagnosis, treatment, or dosage guidance for a person or animal."
      examples = ["What medicine should I take for this rash?"]
    }
  }

  sensitive_information_policy_config {
    # Never appears, in either direction.
    pii_entities_config {
      type   = "CREDIT_DEBIT_CARD_NUMBER"
      action = "BLOCK"
    }
    pii_entities_config {
      type   = "US_SOCIAL_SECURITY_NUMBER"
      action = "BLOCK"
    }
    # The answer survives without these, so mask rather than refuse.
    pii_entities_config {
      type   = "EMAIL"
      action = "ANONYMIZE"
    }
    pii_entities_config {
      type   = "PHONE"
      action = "ANONYMIZE"
    }
    # Regular expressions get no lookaround support, so keep them simple.
    regexes_config {
      name        = "InternalCaseId"
      description = "Internal case identifiers should not be echoed to customers"
      pattern     = "CASE-[0-9]{8}"
      action      = "ANONYMIZE"
    }
  }

  contextual_grounding_policy_config {
    filters_config {
      type      = "GROUNDING"
      threshold = 0.75
    }
    filters_config {
      type      = "RELEVANCE"
      threshold = 0.6
    }
  }

  tags = {
    Owner       = "platform-team"
    Environment = "prod"
  }
}

# A numeric, immutable version. Enforcement cannot reference DRAFT.
resource "aws_bedrock_guardrail_version" "agent" {
  guardrail_arn = aws_bedrock_guardrail.agent.guardrail_arn
  description   = "Baseline safeguards, reviewed by the platform team"
}
