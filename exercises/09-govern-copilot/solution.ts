import { check, finish, section } from "../../src/lib/check.js";
import { carelessTenant, hardenedTenant, type TenantConfig } from "./tenant.js";
import { formatRequirements, type Requirement } from "../../src/lib/controls.js";

export function assess(t: TenantConfig): Requirement[] {
  const out: Requirement[] = [];
  const add = (r: Requirement) => out.push(r);

  if (!t.publishRequiresAdminApproval) {
    add({
      family: "lifecycle",
      severity: "critical",
      requirement: "Turn on publish approval (Microsoft 365 admin center, Agents, All agents, Requests).",
      because: "any maker can currently publish an agent to the whole tenant unreviewed",
    });
  }

  if (!t.conditionalAccessTargetsAgentIdentities) {
    add({
      family: "identity",
      severity: "high",
      requirement: "Target Conditional Access at agent identities and agent user accounts explicitly, in Entra.",
      because: "a policy aimed at all users does not cover agent user accounts, so agents are currently outside it",
    });
  }

  if (!t.allAgentsHaveSponsors || t.ownerlessAgentCount > 0) {
    add({
      family: "lifecycle",
      severity: "high",
      requirement: "Give every agent a sponsor, and enable the rule that reassigns ownerless agents to the previous owner's manager.",
      because: `${t.ownerlessAgentCount} agents have no owner${t.allAgentsHaveSponsors ? "" : " and sponsorship is not set"}`,
    });
  }

  if (t.unmanagedAgentCount > 0) {
    add({
      family: "lifecycle",
      severity: "high",
      requirement: "Bring unmanaged agents into Agent 365, or block them.",
      because: `${t.unmanagedAgentCount} agents were created outside Agent 365, so they carry none of its risk protection or observability`,
    });
  }

  const ANON = "Chat without Microsoft Entra ID authentication in Copilot Studio";
  if (!t.blockedConnectors.includes(ANON)) {
    add({
      family: "authorization",
      severity: "critical",
      requirement: `Block the "${ANON}" connector in a Power Platform data policy.`,
      because: "agents can currently be published with no authentication at all",
    });
  }

  if (!t.copilotAuthorRestrictedToGroup) {
    add({
      family: "authorization",
      severity: "medium",
      requirement: "Bind the Copilot Author setting to a security group (Power Platform admin center, Settings).",
      because: "anyone licensed can currently open Copilot Studio and start building",
    });
  }

  if (t.sensitivityLabelsEnabledForSharePoint && !t.encryptedLabelsWithholdExtractRight) {
    add({
      family: "output",
      severity: "high",
      requirement: "Review encrypting labels so they withhold the EXTRACT usage right.",
      because: "an encrypting label that grants EXTRACT does not stop Copilot returning the content, so the labels give false assurance",
    });
  }

  if (!t.dlpForCopilotEnabled) {
    add({
      family: "output",
      severity: "high",
      requirement: "Create a Purview DLP policy with the Microsoft Copilot location enabled.",
      because: "nothing currently stops labelled or sensitive content being used to ground an answer",
    });
  }

  if (t.restrictedContentDiscoverySites < t.sitesWithSensitiveContent) {
    add({
      family: "data-boundary",
      severity: "high",
      requirement: "Apply Restricted Content Discovery to every site holding sensitive content.",
      because: `${t.restrictedContentDiscoverySites} of ${t.sitesWithSensitiveContent} sensitive sites are restricted`,
    });
  }

  if (!t.copilotRetentionPolicyConfigured) {
    add({
      family: "data-boundary",
      severity: "medium",
      requirement: "Configure a retention policy for the Microsoft Copilot experiences location.",
      because: "prompts and responses are kept in user mailboxes with no deliberate retention period",
    });
  }

  if (t.webSearchPolicy === "unconfigured") {
    add({
      family: "input",
      severity: "medium",
      requirement: "Set the Allow web search in Copilot policy deliberately, in the Cloud Policy service.",
      because: "unconfigured means web grounding is on, so answers can be grounded on content nobody in the organisation controls",
    });
  }

  if (!t.perAgentCreditLimits && t.payAsYouGoOverageEnabled) {
    add({
      family: "cost",
      severity: "high",
      requirement: "Set a monthly Copilot Credit limit per agent, which turns the agent off when reached.",
      because: "pay-as-you-go overage is on with no per-agent ceiling, so one looping agent bills without limit",
    });
  }

  return out;
}

section("09 · Govern Microsoft Copilot (solution)");
for (const t of [carelessTenant, hardenedTenant]) {
  console.log(`\n${t.name}`);
  const findings = assess(t);
  console.log(findings.length === 0 ? "  no findings" : formatRequirements(findings));
}

const careless = assess(carelessTenant);
const hardened = assess(hardenedTenant);
const has = (rs: Requirement[], family: string, severity?: string) =>
  rs.some((r) => r.family === family && (severity === undefined || r.severity === severity));

section("Checks");
check("publish approval is flagged", has(careless, "lifecycle", "critical"));
check("conditional access gap is flagged", has(careless, "identity", "high"));
check("ownerless and unmanaged agents are flagged", careless.filter((r) => r.family === "lifecycle").length >= 3);
check("anonymous agents are flagged as critical", has(careless, "authorization", "critical"));
check("unrestricted authoring is flagged", has(careless, "authorization", "medium"));
check("the EXTRACT right trap is caught", has(careless, "output", "high"));
check("missing DLP is flagged", careless.filter((r) => r.family === "output").length >= 2);
check("oversharing is flagged", has(careless, "data-boundary", "high"));
check("missing retention is flagged", has(careless, "data-boundary", "medium"));
check("unconfigured web grounding is flagged", has(careless, "input", "medium"));
check("uncapped spend is flagged", has(careless, "cost", "high"));
check("the hardened tenant produces no findings", hardened.length === 0, `it produced ${hardened.length}`);
finish();
