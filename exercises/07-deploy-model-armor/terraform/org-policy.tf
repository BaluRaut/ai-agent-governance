# TODO 5 — allowlist the models that may be used at all.
# Add a google_org_policy_policy resource named "allowed_models" with:
#   name   = "organizations/${var.organization_id}/policies/vertexai.allowedModels"
#   parent = "organizations/${var.organization_id}"
#   spec { rules { values { allowed_values = [ ... ] } } }
#
# Values take the form "publishers/PUBLISHER/models/MODEL:ACTION" where ACTION is
# predict, deploy or tune. Each model must be listed individually; you cannot
# allow a group. An explicit deny beats an explicit allow.
#
# Note the scope: this covers Model Garden, not models registered in Model Registry.

# Written for you: keep grounding sources under control, since every grounding
# source is another channel through which text an attacker may control reaches
# the context.
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
