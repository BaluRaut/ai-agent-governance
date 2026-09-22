resource "google_model_armor_template" "agent" {
  location    = var.location
  template_id = "agent-guardrail"

  filter_config {
    rai_settings {
      rai_filters {
        filter_type      = "HATE_SPEECH"
        confidence_level = "MEDIUM_AND_ABOVE"
      }
      rai_filters {
        filter_type      = "HARASSMENT"
        confidence_level = "MEDIUM_AND_ABOVE"
      }
      rai_filters {
        filter_type      = "SEXUALLY_EXPLICIT"
        confidence_level = "MEDIUM_AND_ABOVE"
      }
      rai_filters {
        filter_type      = "DANGEROUS"
        confidence_level = "MEDIUM_AND_ABOVE"
      }
    }

    # The filter that matters most for an agent reading content it did not author.
    pi_and_jailbreak_filter_settings {
      filter_enforcement = "ENABLED"
      confidence_level   = "HIGH"
    }

    malicious_uri_filter_settings {
      filter_enforcement = "ENABLED"
    }
  }

  template_metadata {
    log_sanitize_operations = true
    log_template_operations = true
  }
}

# The floor: a minimum every template in the organisation must meet. Teams may be
# stricter and cannot be weaker. This is the control worth copying into your own
# architecture, whatever platform you are on.
resource "google_model_armor_floorsetting" "org" {
  parent   = "organizations/${var.organization_id}"
  location = "global"

  enable_floor_setting_enforcement = true
  integrated_services              = ["AI_PLATFORM"]

  ai_platform_floor_setting {
    enable_cloud_logging = true
    inspect_and_block    = true
  }

  filter_config {
    rai_settings {
      rai_filters {
        filter_type      = "HATE_SPEECH"
        confidence_level = "MEDIUM_AND_ABOVE"
      }
      rai_filters {
        filter_type      = "DANGEROUS"
        confidence_level = "MEDIUM_AND_ABOVE"
      }
    }
    pi_and_jailbreak_filter_settings {
      filter_enforcement = "ENABLED"
      confidence_level   = "MEDIUM_AND_ABOVE"
    }
    malicious_uri_filter_settings {
      filter_enforcement = "ENABLED"
    }
  }
}
