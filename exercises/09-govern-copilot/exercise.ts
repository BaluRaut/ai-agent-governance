import { check, finish, section } from "../../src/lib/check.js";
import { carelessTenant, hardenedTenant, type TenantConfig } from "./tenant.js";
import { formatRequirements, type Requirement } from "../../src/lib/controls.js";

/**
 * Read a tenant's configuration and report what is missing.
 * Each finding names the console it is fixed in, because that is the first thing
 * whoever picks up the ticket needs to know.
 */
export function assess(t: TenantConfig): Requirement[] {
  const out: Requirement[] = [];
  const add = (r: Requirement) => out.push(r);

  // Rule 1 — written for you. Publishing without approval means anyone ships to everyone.
  if (!t.publishRequiresAdminApproval) {
    add({
      family: "lifecycle",
      severity: "critical",
      requirement: "Turn on publish approval (Microsoft 365 admin center, Agents, All agents, Requests).",
      because: "any maker can currently publish an agent to the whole tenant unreviewed",
    });
  }

  // TODO 2 — identity. If conditionalAccessTargetsAgentIdentities is false, add an
  //   "identity" requirement at "high". Remember the documented trap: a policy aimed
  //   at all users does not cover agent user accounts, so this must be targeted
  //   deliberately in Entra.

  // TODO 3 — ownership. If allAgentsHaveSponsors is false, or ownerlessAgentCount > 0,
  //   add a "lifecycle" requirement at "high". Mention the bulk rule that reassigns
  //   ownerless agents to the previous owner's manager.

  // TODO 4 — shadow agents. If unmanagedAgentCount > 0, add a "lifecycle" requirement
  //   at "high". These are agents created outside Agent 365, so they carry none of its
  //   risk protection or observability.

  // TODO 5 — anonymous agents. If blockedConnectors does not include
  //   "Chat without Microsoft Entra ID authentication in Copilot Studio",
  //   add an "authorization" requirement at "critical".

  // TODO 6 — who may build. If copilotAuthorRestrictedToGroup is false, add an
  //   "authorization" requirement at "medium" naming the Copilot Author setting in the
  //   Power Platform admin center.

  // TODO 7 — the EXTRACT trap. If sensitivityLabelsEnabledForSharePoint is true but
  //   encryptedLabelsWithholdExtractRight is false, add an "output" requirement at
  //   "high". A label that encrypts but grants EXTRACT does not stop Copilot returning
  //   the content, which is the most misunderstood control on this platform.

  // TODO 8 — DLP. If dlpForCopilotEnabled is false, add an "output" requirement at "high".

  // TODO 9 — oversharing. If restrictedContentDiscoverySites < sitesWithSensitiveContent,
  //   add a "data-boundary" requirement at "high". Include both numbers in `because`.

  // TODO 10 — retention. If copilotRetentionPolicyConfigured is false, add a
  //   "data-boundary" requirement at "medium".

  // TODO 11 — web grounding. If webSearchPolicy is "unconfigured", add an "input"
  //   requirement at "medium". Unconfigured means web search is ON.

  // TODO 12 — spend. If perAgentCreditLimits is false and payAsYouGoOverageEnabled is
  //   true, add a "cost" requirement at "high": overage with no per-agent ceiling means
  //   one looping agent bills without limit.

  return out;
}

section("09 · Govern Microsoft Copilot");
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
check("publish approval is flagged", has(careless, "lifecycle", "critical"), "rule 1 is written for you");
check("conditional access gap is flagged", has(careless, "identity", "high"), "TODO 2");
check("ownerless and unmanaged agents are flagged", careless.filter((r) => r.family === "lifecycle").length >= 3, "TODOs 3 and 4");
check("anonymous agents are flagged as critical", has(careless, "authorization", "critical"), "TODO 5");
check("unrestricted authoring is flagged", has(careless, "authorization", "medium"), "TODO 6");
check("the EXTRACT right trap is caught", has(careless, "output", "high"), "TODO 7: labels encrypt but EXTRACT is granted");
check("missing DLP is flagged", careless.filter((r) => r.family === "output").length >= 2, "TODO 8");
check("oversharing is flagged", has(careless, "data-boundary", "high"), "TODO 9");
check("missing retention is flagged", has(careless, "data-boundary", "medium"), "TODO 10");
check("unconfigured web grounding is flagged", has(careless, "input", "medium"), "TODO 11");
check("uncapped spend is flagged", has(careless, "cost", "high"), "TODO 12");
check("the hardened tenant produces no findings", hardened.length === 0, `it produced ${hardened.length}: ${hardened.map((r) => r.family).join(", ")}`);
finish();
