import { check, finish, section } from "../../src/lib/check.js";
import {
  CASES,
  type Decision,
  type Policy,
  type ToolCall,
  type CallContext,
  describe,
} from "./harness.js";

/** Deny wins, then require-approval, then allow. Silence means deny. */
export function decide(call: ToolCall, ctx: CallContext, policies: Policy[]): Decision {
  const opinions = policies.map((p) => p.evaluate(call, ctx)).filter((d): d is Decision => d !== null);
  const deny = opinions.find((d) => d.effect === "deny");
  if (deny) return deny;
  const approval = opinions.find((d) => d.effect === "require-approval");
  if (approval) return approval;
  const allow = opinions.find((d) => d.effect === "allow");
  if (allow) return allow;
  return { effect: "deny", rule: "default-deny", reason: "no policy allowed this call" };
}

const toolAllowlist: Policy = {
  id: "tool-allowlist",
  evaluate(call, ctx) {
    if (!ctx.registeredTools.includes(call.tool)) {
      return { effect: "deny", rule: this.id, reason: `${call.tool} is not registered for ${call.agent}` };
    }
    return { effect: "allow", rule: this.id, reason: "tool is registered" };
  },
};

const refundLimit: Policy = {
  id: "refund-limit",
  evaluate(call) {
    if (call.tool !== "issue_refund") return null;
    const amount = Number(call.args.amount ?? 0);
    if (amount > 50_000) {
      return { effect: "deny", rule: this.id, reason: `${amount} is above the hard ceiling of 50000` };
    }
    if (amount > 5_000) {
      return { effect: "require-approval", rule: this.id, reason: `${amount} is above the unattended limit of 5000` };
    }
    return { effect: "allow", rule: this.id, reason: `${amount} is within the unattended limit` };
  },
};

const egressAllowlist: Policy = {
  id: "egress-allowlist",
  evaluate(call, ctx) {
    if (call.tool !== "send_customer_email") return null;
    const to = String(call.args.to ?? "");
    const domain = to.slice(to.lastIndexOf("@") + 1).toLowerCase();
    if (!ctx.allowedEmailDomains.includes(domain)) {
      return { effect: "deny", rule: this.id, reason: `${domain || "(no domain)"} is not an allowed destination` };
    }
    return { effect: "allow", rule: this.id, reason: `${domain} is allowed` };
  },
};

/** The cheapest defence here: untrusted content in context makes irreversible actions wait. */
const untrustedOrigin: Policy = {
  id: "untrusted-origin",
  evaluate(call, ctx) {
    if (!ctx.untrustedContentInContext) return null;
    if (!ctx.irreversibleTools.includes(call.tool)) return null;
    return {
      effect: "require-approval",
      rule: this.id,
      reason: `${call.tool} cannot be undone and untrusted content is in the context`,
    };
  },
};

const stepBudget: Policy = {
  id: "step-budget",
  evaluate(call, ctx) {
    if (ctx.callsThisRun < ctx.maxCallsPerRun) return null;
    return {
      effect: "deny",
      rule: this.id,
      reason: `${ctx.callsThisRun} calls reaches the per-run ceiling of ${ctx.maxCallsPerRun}`,
    };
  },
};

export const POLICIES: Policy[] = [toolAllowlist, refundLimit, egressAllowlist, untrustedOrigin, stepBudget];

export const auditLog: Array<{ call: ToolCall; decision: Decision }> = [];

section("02 · Policy as code (solution)");
let correct = 0;
for (const c of CASES) {
  const decision = decide(c.call, c.ctx, POLICIES);
  auditLog.push({ call: c.call, decision });
  const ok = decision.effect === c.expect;
  if (ok) correct++;
  console.log(`  ${ok ? "✔" : "✘"} ${describe(c.call).padEnd(52)} ${decision.effect.padEnd(17)} ${decision.rule}`);
}

section("Checks");
check(`all ${CASES.length} decisions correct`, correct === CASES.length, `${correct} of ${CASES.length}`);
check("every call was recorded, allows included", auditLog.length === CASES.length);
check("no decision is missing a rule name", auditLog.every((e) => e.decision.rule && e.decision.rule !== "not-implemented"));
check("a call no policy allows is denied", decide({ agent: "refund-agent", tool: "unknown_tool", args: {} }, CASES[0]!.ctx, []).effect === "deny");
finish();
