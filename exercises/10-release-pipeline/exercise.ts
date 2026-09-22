import { check, finish, section } from "../../src/lib/check.js";
import { SCENARIOS, today, type GateResult, type ReleaseSignals, type Waiver } from "./signals.js";

/**
 * TODO 1 — decide which waivers apply.
 * A waiver applies only when all three hold:
 *   - it names a finding that is actually open
 *   - it has not expired (compare its `expires` against `today`, both ISO dates)
 *   - the finding it waives is NOT severity "critical"
 * Return the applied ones, and a reason string for each refused one saying why.
 */
export function applyWaivers(
  signals: ReleaseSignals,
  waivers: Waiver[],
): { waived: GateResult["waived"]; refusedWaivers: string[]; stillOpen: ReleaseSignals["openRequirements"] } {
  void signals; void waivers; void today;
  return { waived: [], refusedWaivers: [], stillOpen: signals.openRequirements };
}

/**
 * TODO 2 — the gate.
 * Block, with a specific reason for each, when any of these holds:
 *   - there is no owner
 *   - any requirement remains open after waivers at severity "critical" or "high"
 *   - any infrastructure conformance check failed
 *   - any safety case regressed in the evals
 *   - more than one capability case regressed
 *   - the red team attack success rate is above its threshold
 *   - the audit chain did not verify
 *   - a waiver on a still-open finding has expired, whatever the severity, because
 *     someone accepted that risk with an end date and the date has passed
 * Name the finding, the file, or the case in each reason. Whoever is blocked
 * reads these at five on a Friday.
 */
export function gate(signals: ReleaseSignals, waivers: Waiver[]): GateResult {
  const { waived, refusedWaivers } = applyWaivers(signals, waivers);
  const blockers: string[] = [];
  return { deploy: blockers.length === 0, blockers, waived, refusedWaivers };
}

section("10 · The release pipeline");
let correct = 0;
for (const scenario of SCENARIOS) {
  const result = gate(scenario.signals, scenario.waivers);
  const ok = result.deploy === scenario.expectDeploy;
  if (ok) correct++;
  console.log(`\n  ${ok ? "✔" : "✘"} ${scenario.name.padEnd(46)} ${result.deploy ? "DEPLOY" : "BLOCKED"}${ok ? "" : `  expected ${scenario.expectDeploy ? "DEPLOY" : "BLOCKED"}`}`);
  for (const b of result.blockers) console.log(`      blocked: ${b}`);
  for (const w of result.waived) console.log(`      waived:  ${w.findingId} by ${w.owner}, expires ${w.expires}`);
  for (const r of result.refusedWaivers) console.log(`      refused: ${r}`);
}

section("Checks");
const byName = (n: string) => SCENARIOS.find((s) => s.name === n)!;
const run = (n: string) => gate(byName(n).signals, byName(n).waivers);

check(`all ${SCENARIOS.length} scenarios decided correctly`, correct === SCENARIOS.length, `${correct} of ${SCENARIOS.length} — start with TODO 2`);
check("a clean release deploys", run("clean release").deploy);
check("a safety regression blocks", !run("safety regression in the eval suite").deploy, "TODO 2");
check("the safety blocker names the case", run("safety regression in the eval suite").blockers.some((b) => b.includes("safe-dosage")), "a reason that does not name the case is not actionable");
check("a waiver on a critical finding is refused", run("critical requirement with a waiver, which is refused").refusedWaivers.length > 0, "TODO 1");
check("a valid waiver on a medium finding is applied and recorded", run("medium requirement with a valid waiver").waived.length === 1, "TODO 1");
check("an expired waiver does not apply", !run("medium requirement with an expired waiver").deploy, "TODO 1: compare expires against today");
check("a broken audit chain blocks", !run("broken audit chain").deploy, "if you cannot prove what happened, you cannot ship it");
finish();
