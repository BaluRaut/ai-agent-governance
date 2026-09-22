import { check, finish, section } from "../../src/lib/check.js";
import {
  CASES,
  type Decision,
  type Policy,
  type ToolCall,
  type CallContext,
  describe,
} from "./harness.js";

/**
 * Combine policy opinions into one decision.
 *
 * TODO 1 — implement the three rules from the README:
 *   - if any policy returns "deny", the result is that deny
 *   - else if any returns "require-approval", the result is that
 *   - else if at least one returns "allow", the result is allow
 *   - else deny, with rule "default-deny" (no policy spoke for this call)
 */
export function decide(call: ToolCall, ctx: CallContext, policies: Policy[]): Decision {
  const opinions = policies.map((p) => p.evaluate(call, ctx)).filter((d): d is Decision => d !== null);
  void opinions;
  return { effect: "deny", rule: "not-implemented", reason: "TODO 1" };
}

/** The agent may only use tools it was registered with. */
const toolAllowlist: Policy = {
  id: "tool-allowlist",
  evaluate(call, ctx) {
    if (!ctx.registeredTools.includes(call.tool)) {
      return { effect: "deny", rule: this.id, reason: `${call.tool} is not registered for ${call.agent}` };
    }
    return { effect: "allow", rule: this.id, reason: "tool is registered" };
  },
};

// TODO 2 — refundLimit. For calls to "issue_refund", read the numeric `amount` argument.
//   over 50000  -> deny
//   over 5000   -> require-approval
//   otherwise   -> allow
//   Any other tool -> return null, meaning this policy has no opinion.
const refundLimit: Policy = {
  id: "refund-limit",
  evaluate() {
    return null;
  },
};

// TODO 3 — egressAllowlist. For "send_customer_email", deny unless the `to` argument's
//   domain is in ctx.allowedEmailDomains. Other tools: no opinion.
//   The domain is the part after the last "@", lowercased.
const egressAllowlist: Policy = {
  id: "egress-allowlist",
  evaluate() {
    return null;
  },
};

// TODO 4 — untrustedOrigin. When ctx.untrustedContentInContext is true AND the tool is
//   in ctx.irreversibleTools, return require-approval. This is the rule that stops an
//   injected instruction from acting unattended. Otherwise no opinion.
const untrustedOrigin: Policy = {
  id: "untrusted-origin",
  evaluate() {
    return null;
  },
};

// TODO 5 — stepBudget. When ctx.callsThisRun is at or above ctx.maxCallsPerRun, deny
//   every tool. This bounds a loop that would otherwise run all weekend.
const stepBudget: Policy = {
  id: "step-budget",
  evaluate() {
    return null;
  },
};

export const POLICIES: Policy[] = [toolAllowlist, refundLimit, egressAllowlist, untrustedOrigin, stepBudget];

/** Every decision, allowed or not. This is the record family 7 asks for. */
export const auditLog: Array<{ call: ToolCall; decision: Decision }> = [];

section("02 · Policy as code");
let correct = 0;
for (const c of CASES) {
  const decision = decide(c.call, c.ctx, POLICIES);
  auditLog.push({ call: c.call, decision });
  const ok = decision.effect === c.expect;
  if (ok) correct++;
  console.log(`  ${ok ? "✔" : "✘"} ${describe(c.call).padEnd(52)} ${decision.effect.padEnd(17)} ${ok ? "" : `expected ${c.expect}`}`);
  if (!ok) console.log(`      rule: ${decision.rule} — ${decision.reason}`);
}

section("Checks");
check(`all ${CASES.length} decisions correct`, correct === CASES.length, `${correct} of ${CASES.length} — start with TODO 1, the combiner`);
check("every call was recorded, allows included", auditLog.length === CASES.length, "push to auditLog on every decision, not only denials");
check("no decision is missing a rule name", auditLog.every((e) => e.decision.rule && e.decision.rule !== "not-implemented"), "the combiner must return the rule that decided");
check("a call no policy allows is denied", decide({ agent: "refund-agent", tool: "unknown_tool", args: {} }, CASES[0]!.ctx, []).effect === "deny", "with an empty policy list the answer is deny, rule 'default-deny'");
finish();
