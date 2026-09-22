import { check, finish, section } from "../../src/lib/check.js";
import { SCENARIOS, today, type GateResult, type ReleaseSignals, type Waiver } from "./signals.js";

export function applyWaivers(
  signals: ReleaseSignals,
  waivers: Waiver[],
): { waived: GateResult["waived"]; refusedWaivers: string[]; stillOpen: ReleaseSignals["openRequirements"] } {
  const waived: GateResult["waived"] = [];
  const refusedWaivers: string[] = [];
  const waivedIds = new Set<string>();

  for (const w of waivers) {
    const finding = signals.openRequirements.find((r) => r.id === w.findingId);
    if (!finding) {
      refusedWaivers.push(`${w.findingId} is not an open finding, so the waiver does nothing`);
      continue;
    }
    if (w.expires < today) {
      refusedWaivers.push(`the waiver on ${w.findingId} expired on ${w.expires}`);
      continue;
    }
    if (finding.severity === "critical") {
      refusedWaivers.push(`${w.findingId} is critical, and critical findings cannot be waived: ${finding.requirement}`);
      continue;
    }
    waived.push({ findingId: w.findingId, owner: w.owner, expires: w.expires });
    waivedIds.add(w.findingId);
  }

  return {
    waived,
    refusedWaivers,
    stillOpen: signals.openRequirements.filter((r) => !waivedIds.has(r.id)),
  };
}

export function gate(signals: ReleaseSignals, waivers: Waiver[]): GateResult {
  const { waived, refusedWaivers, stillOpen } = applyWaivers(signals, waivers);
  const blockers: string[] = [];

  if (!signals.owner) {
    blockers.push(`${signals.agent} has no owner, so nobody can be asked about it or accept the risk`);
  }

  for (const r of stillOpen.filter((r) => r.severity === "critical" || r.severity === "high")) {
    blockers.push(`${r.id} (${r.severity}, ${r.family}) is open: ${r.requirement}`);
  }

  // A lapsed waiver blocks whatever the finding's severity. Someone accepted this
  // risk with an end date; letting that date pass quietly is how findings become
  // permanent. Renew it deliberately or fix the finding.
  for (const w of waivers) {
    const finding = signals.openRequirements.find((r) => r.id === w.findingId);
    if (finding && w.expires < today) {
      blockers.push(`the waiver on ${w.findingId} expired on ${w.expires}; renew it or resolve the finding`);
    }
  }

  for (const f of signals.iac.failed) {
    blockers.push(`infrastructure conformance failed: ${f}`);
  }

  // Safety is not tradeable, for the same reason as in exercise 05.
  for (const c of signals.evals.safetyRegressions) {
    blockers.push(`safety case ${c} passed on the accepted baseline and now fails`);
  }
  if (signals.evals.capabilityRegressions.length > 1) {
    blockers.push(`${signals.evals.capabilityRegressions.length} capability cases regressed: ${signals.evals.capabilityRegressions.join(", ")}`);
  }

  if (signals.redTeam.attackSuccessRate > signals.redTeam.threshold) {
    const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
    blockers.push(`red team attack success rate is ${pct(signals.redTeam.attackSuccessRate)}, above the threshold of ${pct(signals.redTeam.threshold)}`);
  }

  if (!signals.auditChainVerified) {
    blockers.push("the audit chain did not verify for the test runs, so the evidence for everything above is unreliable");
  }

  return { deploy: blockers.length === 0, blockers, waived, refusedWaivers };
}

section("10 · The release pipeline (solution)");
let correct = 0;
for (const scenario of SCENARIOS) {
  const result = gate(scenario.signals, scenario.waivers);
  const ok = result.deploy === scenario.expectDeploy;
  if (ok) correct++;
  console.log(`\n  ${ok ? "✔" : "✘"} ${scenario.name.padEnd(46)} ${result.deploy ? "DEPLOY" : "BLOCKED"}`);
  for (const b of result.blockers) console.log(`      blocked: ${b}`);
  for (const w of result.waived) console.log(`      waived:  ${w.findingId} by ${w.owner}, expires ${w.expires}`);
  for (const r of result.refusedWaivers) console.log(`      refused: ${r}`);
}

section("Checks");
const byName = (n: string) => SCENARIOS.find((s) => s.name === n)!;
const run = (n: string) => gate(byName(n).signals, byName(n).waivers);

check(`all ${SCENARIOS.length} scenarios decided correctly`, correct === SCENARIOS.length, `${correct} of ${SCENARIOS.length}`);
check("a clean release deploys", run("clean release").deploy);
check("a safety regression blocks", !run("safety regression in the eval suite").deploy);
check("the safety blocker names the case", run("safety regression in the eval suite").blockers.some((b) => b.includes("safe-dosage")));
check("a waiver on a critical finding is refused", run("critical requirement with a waiver, which is refused").refusedWaivers.length > 0);
check("a valid waiver on a medium finding is applied and recorded", run("medium requirement with a valid waiver").waived.length === 1);
check("an expired waiver does not apply", !run("medium requirement with an expired waiver").deploy);
check("a broken audit chain blocks", !run("broken audit chain").deploy);
finish();
