/**
 * A tenant's Copilot governance configuration, as you would export it before an audit.
 *
 * Field names follow the documented controls so a finding can be traced to a console.
 */
export interface TenantConfig {
  name: string;

  // Microsoft Entra
  agentIdentitiesAutoCreated: boolean;
  conditionalAccessTargetsAgentIdentities: boolean;
  /** Every agent identity has a named human sponsor. */
  allAgentsHaveSponsors: boolean;

  // Microsoft 365 admin center
  publishRequiresAdminApproval: boolean;
  agentUserAccess: "all-users" | "specific-groups" | "no-users";
  allowedAgentTypes: Array<"microsoft" | "your-org" | "external-publishers">;
  /** Bulk rule: reassign ownerless agents to the previous owner's manager. */
  reassignOwnerlessAgents: boolean;
  ownerlessAgentCount: number;
  unmanagedAgentCount: number;

  // Power Platform admin center
  copilotAuthorRestrictedToGroup: boolean;
  blockedConnectors: string[];
  /** Per-agent monthly Copilot Credit limits, which turn an agent off when reached. */
  perAgentCreditLimits: boolean;
  payAsYouGoOverageEnabled: boolean;

  // Purview
  dlpForCopilotEnabled: boolean;
  sensitivityLabelsEnabledForSharePoint: boolean;
  /** Labels that encrypt must withhold EXTRACT, or AI apps still return the content. */
  encryptedLabelsWithholdExtractRight: boolean;
  auditEnabled: boolean;
  copilotRetentionPolicyConfigured: boolean;

  // SharePoint
  restrictedContentDiscoverySites: number;
  sitesWithSensitiveContent: number;

  // Cloud Policy service
  webSearchPolicy: "unconfigured" | "enabled" | "disabled" | "disabled-in-work-mode";
}

/** Rolled out in a hurry, governed afterwards. The common case. */
export const carelessTenant: TenantConfig = {
  name: "Contoso (as found)",
  agentIdentitiesAutoCreated: true,
  conditionalAccessTargetsAgentIdentities: false,
  allAgentsHaveSponsors: false,
  publishRequiresAdminApproval: false,
  agentUserAccess: "all-users",
  allowedAgentTypes: ["microsoft", "your-org", "external-publishers"],
  reassignOwnerlessAgents: false,
  ownerlessAgentCount: 14,
  unmanagedAgentCount: 31,
  copilotAuthorRestrictedToGroup: false,
  blockedConnectors: [],
  perAgentCreditLimits: false,
  payAsYouGoOverageEnabled: true,
  dlpForCopilotEnabled: false,
  sensitivityLabelsEnabledForSharePoint: true,
  encryptedLabelsWithholdExtractRight: false,
  auditEnabled: true,
  copilotRetentionPolicyConfigured: false,
  restrictedContentDiscoverySites: 0,
  sitesWithSensitiveContent: 240,
  webSearchPolicy: "unconfigured",
};

/** The same tenant after the work in this exercise. */
export const hardenedTenant: TenantConfig = {
  name: "Contoso (after)",
  agentIdentitiesAutoCreated: true,
  conditionalAccessTargetsAgentIdentities: true,
  allAgentsHaveSponsors: true,
  publishRequiresAdminApproval: true,
  agentUserAccess: "specific-groups",
  allowedAgentTypes: ["microsoft", "your-org"],
  reassignOwnerlessAgents: true,
  ownerlessAgentCount: 0,
  unmanagedAgentCount: 0,
  copilotAuthorRestrictedToGroup: true,
  blockedConnectors: [
    "Chat without Microsoft Entra ID authentication in Copilot Studio",
    "Knowledge source with public websites and data in Copilot Studio",
  ],
  perAgentCreditLimits: true,
  payAsYouGoOverageEnabled: true,
  dlpForCopilotEnabled: true,
  sensitivityLabelsEnabledForSharePoint: true,
  encryptedLabelsWithholdExtractRight: true,
  auditEnabled: true,
  copilotRetentionPolicyConfigured: true,
  restrictedContentDiscoverySites: 240,
  sitesWithSensitiveContent: 240,
  webSearchPolicy: "disabled-in-work-mode",
};
