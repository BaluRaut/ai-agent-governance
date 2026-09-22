# TODO 6 — deploy the agent with its own identity.
# Add a google_vertex_ai_reasoning_engine resource named "agent" using the
# google-beta provider, with:
#   provider     = google-beta
#   region       = var.location
#   display_name = "governed-agent"
#   spec {
#     agent_framework = "google-adk"
#     identity_type   = "AGENT_IDENTITY"
#   }
#
# Without identity_type = "AGENT_IDENTITY" the agent runs as a shared service
# account, and semantic governance policies silently filter it out of the policy
# selector. The field is immutable, so this cannot be added later by patching.

# Written for you: grant baseline roles to every agent in the project at once,
# rather than to each agent by name. Redeployment creates a new reasoningEngines
# resource with a new principal, and prior grants are not inherited, so per-agent
# bindings break on every deploy.
resource "google_project_iam_member" "all_agents_baseline" {
  for_each = toset(["roles/aiplatform.expressUser", "roles/serviceusage.serviceUsageConsumer"])

  project = var.project_id
  role    = each.value
  member  = "principalSet://agents.global.org-${var.organization_id}.system.id.goog/attribute.platformContainer/aiplatform/projects/${var.project_number}"
}
