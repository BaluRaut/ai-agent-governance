import {
  canEgress,
  hasExfiltrationTriad,
  toolsWithEffect,
  touchesAtLeast,
  type AgentSpec,
} from "../../src/lib/agent-spec.js";
import { formatRequirements, type Requirement } from "../../src/lib/controls.js";
import { check, finish, info, section } from "../../src/lib/check.js";
import { ALL_AGENTS, docsAssistant, refundAgent, subsidyClaims } from "./agents.js";

/**
 * Derive the controls an agent's design forces on you.
 * Add a requirement only when the spec actually calls for it.
 */
export function assess(spec: AgentSpec): Requirement[] {
  const out: Requirement[] = [];
  const add = (r: Requirement) => out.push(r);

  // Rule 1 — every agent, however harmless, needs its own identity and an owner.
  add({
    family: "identity",
    severity: "medium",
    requirement: "Give the agent its own directory identity with a named owner.",
    because: "every agent needs to be attributable and disableable in one place",
  });

  // TODO 2 — lifecycle. Every agent needs to be registered, versioned and withdrawable.
  //          Add a "lifecycle" requirement at severity "medium" for every spec.

  // TODO 3 — irreversible actions. If any tool has effect "irreversible", the agent
  //          must not take it unattended. Add an "action" requirement at "critical".
  //          Name the offending tools in `because` so the reader can see which.
  //          Use toolsWithEffect(spec, "irreversible").

  // TODO 4 — the exfiltration triad. When hasExfiltrationTriad(spec) is true, add TWO
  //          requirements, both "critical": one in "input" (treat untrusted content as
  //          hostile, fence and detect) and one in "output" (inspect every outbound
  //          tool call, not just the reply to the user).

  // TODO 5 — untrusted content on its own. If spec.ingestsUntrustedContent is true but
  //          the triad is not complete, add an "input" requirement at "high".

  // TODO 6 — personal data. If touchesAtLeast(spec, "personal"), add a "data-boundary"
  //          requirement at "high" covering residency, retention and deletion on request.

  // TODO 7 — reaching beyond staff. If spec.audience is not "internal", add an "output"
  //          requirement at "high" for content safety on the reply path.

  // TODO 8 — unattended operation. If spec.autonomy is "act", add an "observability"
  //          requirement at "high": a single trace per run covering every model and
  //          tool call, with the prompt and model versions recorded.

  // TODO 9 — systems of record. If any tool has systemOfRecord true, add an
  //          "authorization" requirement at "high" for a scoped, tool-specific grant.

  // TODO 10 — shared memory. If memory is enabled with scope "tenant", add a
  //           "data-boundary" requirement at "high" for isolation between tenants.

  // TODO 11 — spend. If spec.budgetUsdPerMonth is undefined, add a "cost" requirement
  //           at "medium": a hard platform quota, not only a budget alert.

  return out;
}

section("01 · Control inventory");
for (const spec of ALL_AGENTS) {
  console.log(`\n${spec.name}  (${spec.id})`);
  console.log(formatRequirements(assess(spec)));
}

const docs = assess(docsAssistant);
const claims = assess(subsidyClaims);
const refunds = assess(refundAgent);
const has = (rs: Requirement[], family: string, severity?: string) =>
  rs.some((r) => r.family === family && (severity === undefined || r.severity === severity));

section("Checks");
info("the harmless agent should stay quiet; the dangerous ones should not");

check("every agent gets an identity requirement", ALL_AGENTS.every((s) => has(assess(s), "identity")), "rule 1 is written for you");
check("every agent gets a lifecycle requirement", ALL_AGENTS.every((s) => has(assess(s), "lifecycle")), "TODO 2");
check("the handbook assistant raises nothing critical", !docs.some((r) => r.severity === "critical"));
check("the handbook assistant stays under six requirements", docs.length < 6, `it raised ${docs.length}; a framework that flags everything gets ignored`);
check("refunds require an approval gate (action/critical)", has(refunds, "action", "critical"), "TODO 3");
check("claim triage requires an approval gate too", has(claims, "action", "critical"), "TODO 3: email_claimant is irreversible");
check("claim triage flags the exfiltration triad on input", has(claims, "input", "critical"), "TODO 4");
check("claim triage flags the exfiltration triad on output", has(claims, "output", "critical"), "TODO 4");
check("the handbook assistant does not flag the triad", !has(docs, "input"), "it reads only content you control");
check("personal data raises a data boundary requirement", has(claims, "data-boundary", "high"), "TODO 6");
check("public audience raises an output requirement", has(claims, "output", "high") || has(claims, "output", "critical"), "TODO 7");
check("unattended agents require tracing", has(refunds, "observability", "high"), "TODO 8");
check("system-of-record writes require scoped grants", has(claims, "authorization", "high"), "TODO 9");
check("tenant-scoped memory raises isolation", assess(subsidyClaims).filter((r) => r.family === "data-boundary").length >= 2, "TODO 10");
check("a missing budget raises a cost requirement", has(refunds, "cost", "medium"), "TODO 11: refundAgent has no budgetUsdPerMonth");
check("a stated budget does not raise one", !has(docs, "cost"), "TODO 11 should only fire when the budget is undefined");
void canEgress;
finish();
