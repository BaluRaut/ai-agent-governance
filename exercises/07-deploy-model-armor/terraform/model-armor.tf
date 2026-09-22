# A Model Armor template. This is the per-request control.
resource "google_model_armor_template" "agent" {
  location    = var.location
  template_id = "agent-guardrail"

  filter_config {
    # TODO 1 — the responsible AI filters.
    # Add a rai_settings block with rai_filters entries for HATE_SPEECH,
    # HARASSMENT, SEXUALLY_EXPLICIT and DANGEROUS, each with
    # confidence_level = "MEDIUM_AND_ABOVE".

    # TODO 2 — prompt injection and jailbreak detection.
    #   pi_and_jailbreak_filter_settings {
    #     filter_enforcement = "ENABLED"
    #     confidence_level   = "HIGH"
    #   }
    # This is the filter that matters most for an agent reading content it did
    # not author.

    # TODO 3 — malicious URL detection.
    #   malicious_uri_filter_settings { filter_enforcement = "ENABLED" }
  }

  template_metadata {
    log_sanitize_operations = true
    log_template_operations = true
  }
}

# TODO 4 — the floor setting.
# Add a google_model_armor_floorsetting resource named "org" with:
#   parent   = "organizations/${var.organization_id}"
#   location = "global"
#   enable_floor_setting_enforcement = true
#   integrated_services = ["AI_PLATFORM"]
#   ai_platform_floor_setting {
#     enable_cloud_logging = true
#     inspect_and_block    = true
#   }
#   plus a filter_config carrying the same minimum filters as the template.
#
# This is the control nobody can configure their way below. A template is a
# default; a floor is a floor.
