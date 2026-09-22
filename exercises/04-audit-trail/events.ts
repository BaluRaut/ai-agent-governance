import { createHash } from "node:crypto";

export type EventType =
  | "run.start"
  | "context.retrieved"
  | "model.call"
  | "policy.decision"
  | "tool.call"
  | "run.end";

export interface Actor {
  /** The agent's own identity. */
  agent: string;
  /** The person it is acting for, when there is one. */
  onBehalfOf?: string;
}

export interface AuditEvent {
  traceId: string;
  seq: number;
  at: string;
  type: EventType;
  actor: Actor;
  /** Free-form, already redacted. */
  detail: Record<string, unknown>;
  /** Versions, so a behaviour change can be explained later. */
  versions?: { prompt?: string; model?: string; policy?: string };
  /** Hash of the previous event plus this one. Makes edits visible. */
  hash?: string;
}

/** The hash of one event, bound to the hash before it. */
export function hashEvent(previousHash: string, event: Omit<AuditEvent, "hash">): string {
  const body = JSON.stringify({
    traceId: event.traceId,
    seq: event.seq,
    at: event.at,
    type: event.type,
    actor: event.actor,
    detail: event.detail,
    versions: event.versions ?? null,
  });
  return createHash("sha256").update(previousHash).update(body).digest("hex").slice(0, 16);
}

export const GENESIS = "0".repeat(16);

/** Walk the chain and report the first event whose hash does not follow. */
export function verifyChain(events: AuditEvent[]): { ok: boolean; brokenAt?: number } {
  let previous = GENESIS;
  for (const e of events) {
    const { hash, ...rest } = e;
    const expected = hashEvent(previous, rest);
    if (hash !== expected) return { ok: false, brokenAt: e.seq };
    previous = expected;
  }
  return { ok: true };
}

/** What a run looked like, before anyone thought about logging it. */
export const RUN = {
  traceId: "trace-9f2c",
  agent: "refund-agent@corp.example",
  user: "priya.k@corp.example",
  promptVersion: "refund-prompt@v7",
  modelVersion: "claude-opus-5",
  policyVersion: "refund-policy@2026-09-02",
  userMessage: "Order 4471 arrived damaged, card ending 4242, please refund to sam.d@example.com",
  retrieved: [
    { id: "order-4471", source: "orders-db", snippet: "Order 4471, 4,800 INR, delivered 2026-09-14, customer sam.d@example.com" },
    { id: "policy-refunds", source: "handbook", snippet: "Damaged goods may be refunded in full within 30 days." },
  ],
  toolCall: { tool: "issue_refund", args: { orderId: "4471", amount: 4800, currency: "INR" } },
  policyDecision: { effect: "allow", rule: "refund-limit", reason: "4800 is within the unattended limit" },
  toolResult: { refundId: "rf-8812", status: "settled" },
  finalAnswer: "I have refunded 4,800 INR for order 4471 to the card ending 4242.",
};
