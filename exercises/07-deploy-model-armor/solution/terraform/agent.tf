# identity_type is immutable, so an agent deployed without it must be re-created.
# Without it, semantic governance policies silently filter this agent out of the
# policy selector, which looks like the control not existing rather than failing.
resource "google_vertex_ai_reasoning_engine" "agent" {
  provider     = google-beta
  region       = var.location
  display_name = "governed-agent"

  spec {
    agent_framework = "google-adk"
    identity_type   = "AGENT_IDENTITY"
  }
}

# Baseline roles for every agent in the project at once. Redeployment creates a
# new reasoningEngines resource with a new principal and prior grants are not
# inherited, so per-agent bindings break on every deploy.
resource "google_project_iam_member" "all_agents_baseline" {
  for_each = toset(["roles/aiplatform.expressUser", "roles/serviceusage.serviceUsageConsumer"])

  project = var.project_id
  role    = each.value
  member  = "principalSet://agents.global.org-${var.organization_id}.system.id.goog/attribute.platformContainer/aiplatform/projects/${var.project_number}"
}
