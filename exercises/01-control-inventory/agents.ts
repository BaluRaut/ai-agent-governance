import type { AgentSpec } from "../../src/lib/agent-spec.js";

/** Three agents that a real organisation might plausibly be asked to review. */

/** Answers staff questions from internal handbooks. About as harmless as agents get. */
export const docsAssistant: AgentSpec = {
  id: "docs-assistant",
  name: "Handbook assistant",
  purpose: "Answer staff questions from internal policy handbooks.",
  platform: "azure-ai-foundry",
  autonomy: "suggest",
  audience: "internal",
  dataClasses: ["internal"],
  tools: [{ name: "search_handbooks", effect: "read", dataClasses: ["internal"] }],
  ingestsUntrustedContent: false,
  memory: { enabled: false, scope: "session" },
  regions: ["swedencentral"],
  budgetUsdPerMonth: 200,
};

/** Reads claim documents uploaded by the public and writes decisions to the claims system. */
export const subsidyClaims: AgentSpec = {
  id: "subsidy-claims",
  name: "Farm subsidy claim triage",
  purpose: "Read uploaded claim documents and record a triage decision.",
  platform: "vertex-ai",
  autonomy: "act",
  audience: "public",
  dataClasses: ["personal", "confidential"],
  tools: [
    { name: "read_uploaded_claim", effect: "read", dataClasses: ["personal"] },
    { name: "lookup_land_registry", effect: "read", dataClasses: ["personal"] },
    {
      name: "record_triage_decision",
      effect: "write",
      systemOfRecord: true,
      dataClasses: ["personal"],
    },
    { name: "email_claimant", effect: "irreversible", egress: true, dataClasses: ["personal"] },
  ],
  ingestsUntrustedContent: true,
  memory: { enabled: true, scope: "tenant", retentionDays: 365 },
  regions: ["europe-west4"],
};

/** Handles customer support and can issue a refund without a person in the loop. */
export const refundAgent: AgentSpec = {
  id: "refund-agent",
  name: "Support refund agent",
  purpose: "Resolve customer complaints, including issuing refunds up to a limit.",
  platform: "bedrock",
  autonomy: "act",
  audience: "customer",
  dataClasses: ["personal", "confidential"],
  tools: [
    { name: "get_order", effect: "read", dataClasses: ["personal"] },
    { name: "issue_refund", effect: "irreversible", systemOfRecord: true, dataClasses: ["personal"] },
    { name: "send_customer_email", effect: "irreversible", egress: true, dataClasses: ["personal"] },
  ],
  ingestsUntrustedContent: true,
  memory: { enabled: true, scope: "user", retentionDays: 90 },
};

export const ALL_AGENTS = [docsAssistant, subsidyClaims, refundAgent];
