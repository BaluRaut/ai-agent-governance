# Allowlist the models that may be used at all. Each model is listed individually;
# there is no way to allow a group. An explicit deny beats an explicit allow.
# Scope note: this covers Model Garden, not Model Registry.
resource "google_org_policy_policy" "allowed_models" {
  name   = "organizations/${var.organization_id}/policies/vertexai.allowedModels"
  parent = "organizations/${var.organization_id}"

  spec {
    rules {
      values {
        allowed_values = [
          "publishers/google/models/gemini-flash:predict",
          "publishers/google/models/gemini-pro:predict",
          "publishers/anthropic/models/claude-sonnet:predict",
        ]
      }
    }
  }
}

# Every grounding source is another channel through which text an attacker may
# control reaches the context, so allowlist those too.
resource "google_org_policy_policy" "grounding_sources" {
  name   = "organizations/${var.organization_id}/policies/vertexai.genAIGroundingSources"
  parent = "organizations/${var.organization_id}"

  spec {
    rules {
      values {
        allowed_values = [
          "VertexAiSearch",
          "VertexRagStore",
        ]
      }
    }
  }
}
