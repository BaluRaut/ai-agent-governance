import {
  hasExfiltrationTriad,
  toolsWithEffect,
  touchesAtLeast,
  type AgentSpec,
} from "../../src/lib/agent-spec.js";
import { formatRequirements, type Requirement } from "../../src/lib/controls.js";
import { check, finish, info, section } from "../../src/lib/check.js";
import { ALL_AGENTS, docsAssistant, refundAgent, subsidyClaims } from "./agents.js";

export function assess(spec: AgentSpec): Requirement[] {
  const out: Requirement[] = [];
  const add = (r: Requirement) => out.push(r);

  // 1 — identity, always.
  add({
    family: "identity",
    severity: "medium",
    requirement: "Give the agent its own directory identity with a named owner.",
    because: "every agent needs to be attributable and disableable in one place",
  });

  // 2 — lifecycle, always.
  add({
    family: "lifecycle",
    severity: "medium",
    requirement: "Register the agent with a version, an owner and a withdrawal procedure.",
    because: "an agent nobody owns is one nobody can switch off",
  });

  // 3 — irreversible actions cannot run unattended.
  const irreversible = toolsWithEffect(spec, "irreversible");
  if (irreversible.length > 0) {
    add({
      family: "action",
      severity: "critical",
      requirement: "Require explicit human confirmation before each irreversible action, enforced outside the model.",
      because: `these tools cannot be undone: ${irreversible.map((t) => t.name).join(", ")}`,
    });
  }

  // 4 — the triad: valuable data, attacker-writable content, and a way out.
  if (hasExfiltrationTriad(spec)) {
    add({
      family: "input",
      severity: "critical",
      requirement: "Fence and classify untrusted content before it reaches the context, and treat detection as reducing the rate, not removing the risk.",
      because: "the agent reads confidential data, ingests content an attacker can write, and has a tool that sends data out",
    });
    add({
      family: "output",
      severity: "critical",
      requirement: "Inspect every outbound tool call, not only the reply to the user, against an allowlist of destinations.",
      because: "an injected instruction exfiltrates through a tool call long before it shows up in a reply",
    });
  } else if (spec.ingestsUntrustedContent) {
    // 5 — untrusted content without the full triad is still a redirection risk.
    add({
      family: "input",
      severity: "high",
      requirement: "Detect prompt injection on untrusted content and label its provenance in the context.",
      because: "the agent reads content neither you nor the user authored",
    });
  }

  // 6 — personal data brings obligations that outlive the request.
  if (touchesAtLeast(spec, "personal")) {
    add({
      family: "data-boundary",
      severity: "high",
      requirement: "Pin processing and storage regions, set retention explicitly including on logs, and be able to delete one person end to end.",
      because: "the agent can reach personal data",
    });
  }

  // 7 — anyone outside the staff directory gets the output path hardened.
  if (spec.audience !== "internal") {
    add({
      family: "output",
      severity: "high",
      requirement: "Apply content safety and identifier redaction on the reply path.",
      because: `the audience is "${spec.audience}", not staff`,
    });
  }

  // 8 — if it acts without a person watching, the trace is the only witness.
  if (spec.autonomy === "act") {
    add({
      family: "observability",
      severity: "high",
      requirement: "Emit one trace per run covering every model and tool call, with prompt and model versions as attributes.",
      because: "the agent acts unattended, so the trace is the only account of what happened",
    });
  }

  // 9 — writes to shared truth need narrow grants.
  const sor = spec.tools.filter((t) => t.systemOfRecord);
  if (sor.length > 0) {
    add({
      family: "authorization",
      severity: "high",
      requirement: "Grant write access per tool and per resource, never at account or project scope.",
      because: `these tools write to a system of record: ${sor.map((t) => t.name).join(", ")}`,
    });
  }

  // 10 — memory shared across a tenant is a cross-customer leak waiting to happen.
  if (spec.memory?.enabled && spec.memory.scope === "tenant") {
    add({
      family: "data-boundary",
      severity: "high",
      requirement: "Partition stored memory by tenant and prove isolation with a test that reads across the boundary.",
      because: "memory is retained at tenant scope, so one customer's content can surface in another's session",
    });
  }

  // 11 — an alert is not a limit.
  if (spec.budgetUsdPerMonth === undefined) {
    add({
      family: "cost",
      severity: "medium",
      requirement: "Set a hard platform quota and a per-run step ceiling, not only a budget alert.",
      because: "no expected spend is recorded, so nothing bounds a retry loop",
    });
  }

  return out;
}

section("01 · Control inventory (solution)");
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
check("every agent gets an identity requirement", ALL_AGENTS.every((s) => has(assess(s), "identity")));
check("every agent gets a lifecycle requirement", ALL_AGENTS.every((s) => has(assess(s), "lifecycle")));
check("the handbook assistant raises nothing critical", !docs.some((r) => r.severity === "critical"));
check("the handbook assistant stays under six requirements", docs.length < 6);
check("refunds require an approval gate (action/critical)", has(refunds, "action", "critical"));
check("claim triage requires an approval gate too", has(claims, "action", "critical"));
check("claim triage flags the exfiltration triad on input", has(claims, "input", "critical"));
check("claim triage flags the exfiltration triad on output", has(claims, "output", "critical"));
check("the handbook assistant does not flag the triad", !has(docs, "input"));
check("personal data raises a data boundary requirement", has(claims, "data-boundary", "high"));
check("public audience raises an output requirement", has(claims, "output", "high") || has(claims, "output", "critical"));
check("unattended agents require tracing", has(refunds, "observability", "high"));
check("system-of-record writes require scoped grants", has(claims, "authorization", "high"));
check("tenant-scoped memory raises isolation", claims.filter((r) => r.family === "data-boundary").length >= 2);
check("a missing budget raises a cost requirement", has(refunds, "cost", "medium"));
check("a stated budget does not raise one", !has(docs, "cost"));
finish();
