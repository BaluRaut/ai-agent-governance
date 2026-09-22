import { check, finish, info, section } from "../../src/lib/check.js";
import { GENESIS, hashEvent, RUN, verifyChain, type AuditEvent, type EventType, type Actor } from "./events.js";

const log: AuditEvent[] = [];

/**
 * TODO 1 — append one event to the log.
 *   - seq is the position, starting at 1
 *   - at is an ISO timestamp
 *   - hash is hashEvent(previousHash, theEventWithoutItsHash), where previousHash
 *     is the hash of the last event, or GENESIS when the log is empty
 */
export function emit(
  type: EventType,
  actor: Actor,
  detail: Record<string, unknown>,
  versions?: AuditEvent["versions"],
): AuditEvent {
  void type; void actor; void detail; void versions; void hashEvent; void GENESIS;
  throw new Error("TODO 1: implement emit()");
}

/**
 * TODO 2 — redact before writing, never after.
 *   Replace, in any string value:
 *     - email addresses         -> "[email]"
 *     - runs of 12 to 19 digits -> "[card]"      (allow spaces or dashes between groups)
 *   Recurse into nested objects and arrays. Leave non-strings alone.
 */
export function redact<T>(value: T): T {
  return value;
}

/** TODO 3 — turn the log into an account a non-engineer could follow. */
export function reconstruct(events: AuditEvent[]): string {
  void events;
  return "TODO 3";
}

section("04 · Audit trail");

// Record the run described in events.ts. Note what each line captures.
const actor: Actor = { agent: RUN.agent, onBehalfOf: RUN.user };
const versions = { prompt: RUN.promptVersion, model: RUN.modelVersion, policy: RUN.policyVersion };

try {
  emit("run.start", actor, redact({ userMessage: RUN.userMessage }), versions);
  emit("context.retrieved", actor, redact({ documents: RUN.retrieved }), versions);
  emit("model.call", actor, { proposedTool: RUN.toolCall.tool, arguments: RUN.toolCall.args }, versions);
  emit("policy.decision", actor, { ...RUN.policyDecision }, versions);
  emit("tool.call", actor, { tool: RUN.toolCall.tool, result: RUN.toolResult }, versions);
  emit("run.end", actor, redact({ answer: RUN.finalAnswer }), versions);
} catch (error) {
  console.log(`  ${(error as Error).message}`);
}

if (log.length > 0) {
  console.log(`\n${reconstruct(log)}`);
}

section("Checks");
// Identities in `actor` are the point of the log, so they stay. Redaction applies
// to the content the agent handled, which is what `detail` holds.
const serialised = JSON.stringify(log.map((e) => e.detail));

check("six events were recorded", log.length === 6, "TODO 1");
check("every event carries the trace id and an increasing seq", log.every((e, i) => e.seq === i + 1 && e.traceId.length > 0), "seq starts at 1");
check("every event names both the agent and the person", log.every((e) => e.actor.agent && e.actor.onBehalfOf), "an agent identity alone cannot answer 'for whom'");
check("every event records the prompt and model version", log.every((e) => e.versions?.prompt && e.versions?.model), "without these a behaviour change cannot be explained");
check("no email address survived redaction in content", !/[\w.]+@[\w.]+\.\w+/.test(serialised), "TODO 2: sam.d@example.com appears in the retrieved document");
check("no card number survived redaction in content", !/\b\d{12,19}\b/.test(serialised), "TODO 2");
check("the chain verifies", log.length > 0 && verifyChain(log).ok, "TODO 1: each hash must include the previous hash");

// Tamper with a settled record, the way someone covering their tracks would.
if (log.length === 6) {
  const tampered = log.map((e) => ({ ...e }));
  tampered[3]!.detail = { effect: "allow", rule: "refund-limit", reason: "edited afterwards" };
  const result = verifyChain(tampered);
  check("editing a past event breaks the chain", !result.ok && result.brokenAt === 4, "this is what makes the log evidence rather than a story");
  info(`tamper detected at event ${result.brokenAt ?? "?"}, which is what you want`);
}

check("the reconstruction mentions the tool, the decision and the person", /issue_refund/.test(reconstruct(log)) && /refund-limit/.test(reconstruct(log)) && /priya/.test(reconstruct(log)), "TODO 3");
finish();

/** Exposed so emit() can append. Implement emit() to push here. */
export { log };
