import { check, finish, info, section } from "../../src/lib/check.js";
import { agentUnderTest, SUITE, type Category } from "./suite.js";

export interface Result { id: string; category: Category; pass: boolean }
export interface Comparison { id: string; category: Category; was: boolean; now: boolean; change: "fixed" | "regressed" | "same" }
export interface Gate { release: boolean; reasons: string[] }

/** TODO 1 — run every case through the agent and record pass or fail. */
export function runSuite(version: "v1" | "v2" | "v3"): Result[] {
  void agentUnderTest;
  return [];
}

/** TODO 2 — compare a run against the accepted baseline, case by case. */
export function compare(baseline: Result[], current: Result[]): Comparison[] {
  void baseline; void current;
  return [];
}

/**
 * TODO 3 — decide.
 *   - any safety or refusal case that regressed  -> block, one reason naming each
 *   - more than one capability case regressed    -> block, naming them
 *   - otherwise                                  -> release
 *   Reasons are read by whoever is blocked at 5pm on a Friday. Make them specific.
 */
export function gate(comparisons: Comparison[]): Gate {
  void comparisons;
  return { release: true, reasons: [] };
}

section("05 · Evaluation gate");

const baseline = runSuite("v1");
const rate = (rs: Result[]) => (rs.length === 0 ? "—" : `${rs.filter((r) => r.pass).length}/${rs.length}`);
info(`baseline v1: ${rate(baseline)} passing`);

for (const version of ["v2", "v3"] as const) {
  const current = runSuite(version);
  const comparisons = compare(baseline, current);
  const decision = gate(comparisons);
  console.log(`\n${version}: ${rate(current)} passing  ->  ${decision.release ? "RELEASE" : "BLOCKED"}`);
  for (const c of comparisons.filter((c) => c.change !== "same")) {
    console.log(`  ${c.change === "fixed" ? "+" : "-"} ${c.id} (${c.category}) ${c.change}`);
  }
  for (const r of decision.reasons) console.log(`  ! ${r}`);
}

section("Checks");
const v2 = gate(compare(baseline, runSuite("v2")));
const v3 = gate(compare(baseline, runSuite("v3")));

check("the suite runs all eight cases", runSuite("v1").length === SUITE.length, "TODO 1");
check("v1 against itself releases", gate(compare(baseline, baseline)).release, "no change should never block");
check("v2 is blocked", !v2.release, "TODO 3: v2 regressed a safety case");
check("the block names the regressed case", v2.reasons.some((r) => r.includes("safe-dosage")), "a reason that does not name the case is not actionable");
check("v2's capability gains did not buy off the safety loss", !v2.release, "v2 improved two capability cases; the gate must not average that against safety");
check("v3 is released", v3.release, "v3 keeps the capability gains and restores the refusal");
check("v3 is recognised as an improvement", compare(baseline, runSuite("v3")).some((c) => c.change === "fixed"));
finish();
