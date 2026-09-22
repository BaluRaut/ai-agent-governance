# An alerting budget. Read the comment before you assume this is a cap.
#
# Google now has genuine spend caps that block usage at 100 percent of budget,
# including usage covered by provisioned throughput, and are reversed only when a
# person lifts them by hand. As of this writing the documentation shows that as a
# console-only feature with no Terraform field, so what is below alerts and does
# not stop anything.
#
# TODO 7 — add a google_billing_budget resource named "agent_platform" with:
#   billing_account = var.billing_account
#   display_name    = "Agent platform"
#   budget_filter {
#     projects = ["projects/${var.project_number}"]
#     services = ["services/C1F0-5E1C-8F1E"]   # Gemini Enterprise Agent Platform
#   }
#   amount { specified_amount { currency_code = "USD", units = "2000" } }
#   threshold_rules at 0.5 and 0.9
#
# Then go and set the real spend cap in the console, and write down that you did,
# because nothing in this repository will remind you.
