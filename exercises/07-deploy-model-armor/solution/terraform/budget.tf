# This alerts. It does not cap.
#
# Google's spend caps do block usage at 100 percent of budget, including usage
# covered by provisioned throughput, and are reversed only by hand. The docs show
# that as console-only with no Terraform field, so set it there and record that
# you did. Nothing in this repository will remind you.
resource "google_billing_budget" "agent_platform" {
  billing_account = var.billing_account
  display_name    = "Agent platform"

  budget_filter {
    projects = ["projects/${var.project_number}"]
    services = ["services/C1F0-5E1C-8F1E"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "2000"
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }
  threshold_rules {
    threshold_percent = 0.9
  }
}
