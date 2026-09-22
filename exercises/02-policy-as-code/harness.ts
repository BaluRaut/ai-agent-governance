/** Shared types and the decision table for exercise 02. */

export interface ToolCall {
  agent: string;
  tool: string;
  args: Record<string, unknown>;
  /** The person the agent is acting for, when there is one. */
  onBehalfOf?: string;
}

export interface CallContext {
  registeredTools: string[];
  irreversibleTools: string[];
  allowedEmailDomains: string[];
  /** True when content the organisation did not author is in the model's context. */
  untrustedContentInContext: boolean;
  callsThisRun: number;
  maxCallsPerRun: number;
}

export interface Decision {
  effect: "allow" | "deny" | "require-approval";
  /** Which policy decided. Without this a log cannot be audited. */
  rule: string;
  reason: string;
}

export interface Policy {
  id: string;
  /** Return null when the policy has no opinion about this call. */
  evaluate(call: ToolCall, ctx: CallContext): Decision | null;
}

const base: CallContext = {
  registeredTools: ["get_order", "issue_refund", "send_customer_email"],
  irreversibleTools: ["issue_refund", "send_customer_email"],
  allowedEmailDomains: ["example.com"],
  untrustedContentInContext: false,
  callsThisRun: 1,
  maxCallsPerRun: 20,
};

const ctx = (over: Partial<CallContext> = {}): CallContext => ({ ...base, ...over });

export const CASES: Array<{ call: ToolCall; ctx: CallContext; expect: Decision["effect"] }> = [
  // Ordinary work.
  { call: { agent: "refund-agent", tool: "get_order", args: { id: "A-1" } }, ctx: ctx(), expect: "allow" },
  { call: { agent: "refund-agent", tool: "issue_refund", args: { amount: 900 } }, ctx: ctx(), expect: "allow" },

  // A tool that was never registered for this agent.
  { call: { agent: "refund-agent", tool: "delete_customer", args: {} }, ctx: ctx(), expect: "deny" },

  // Amount thresholds.
  { call: { agent: "refund-agent", tool: "issue_refund", args: { amount: 7500 } }, ctx: ctx(), expect: "require-approval" },
  { call: { agent: "refund-agent", tool: "issue_refund", args: { amount: 90000 } }, ctx: ctx(), expect: "deny" },

  // Where the mail is going.
  { call: { agent: "refund-agent", tool: "send_customer_email", args: { to: "sam@example.com" } }, ctx: ctx(), expect: "allow" },
  { call: { agent: "refund-agent", tool: "send_customer_email", args: { to: "drop@attacker.test" } }, ctx: ctx(), expect: "deny" },

  // A small refund is fine, until untrusted content is in the context.
  { call: { agent: "refund-agent", tool: "issue_refund", args: { amount: 40 } }, ctx: ctx({ untrustedContentInContext: true }), expect: "require-approval" },
  // Reads stay allowed even then: the rule is about consequence, not suspicion.
  { call: { agent: "refund-agent", tool: "get_order", args: { id: "A-2" } }, ctx: ctx({ untrustedContentInContext: true }), expect: "allow" },

  // The loop has gone on long enough.
  { call: { agent: "refund-agent", tool: "get_order", args: { id: "A-3" } }, ctx: ctx({ callsThisRun: 20 }), expect: "deny" },

  // Deny beats approval: over the hard ceiling, untrusted content does not soften it.
  { call: { agent: "refund-agent", tool: "issue_refund", args: { amount: 90000 } }, ctx: ctx({ untrustedContentInContext: true }), expect: "deny" },
];

export function describe(call: ToolCall): string {
  const args = Object.entries(call.args)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(" ");
  return `${call.tool}(${args})`;
}
