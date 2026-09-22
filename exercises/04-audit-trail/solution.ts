import { check, finish, info, section } from "../../src/lib/check.js";
import { GENESIS, hashEvent, RUN, verifyChain, type AuditEvent, type EventType, type Actor } from "./events.js";

const log: AuditEvent[] = [];

export function emit(
  type: EventType,
  actor: Actor,
  detail: Record<string, unknown>,
  versions?: AuditEvent["versions"],
): AuditEvent {
  const previousHash = log.length === 0 ? GENESIS : log[log.length - 1]!.hash!;
  const body: Omit<AuditEvent, "hash"> = {
    traceId: RUN.traceId,
    seq: log.length + 1,
    at: new Date().toISOString(),
    type,
    actor,
    detail,
    versions,
  };
  const event: AuditEvent = { ...body, hash: hashEvent(previousHash, body) };
  log.push(event);
  return event;
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const CARD = /\b(?:\d[ -]?){12,19}\b/g;

/** Redaction happens on the way in, so no copy of the log ever holds the original. */
export function redact<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(EMAIL, "[email]").replace(CARD, "[card]") as unknown as T;
  }
  if (Array.isArray(value)) return value.map(redact) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v)])) as T;
  }
  return value;
}

export function reconstruct(events: AuditEvent[]): string {
  if (events.length === 0) return "(no events)";
  const first = events[0]!;
  const lines: string[] = [
    `Trace ${first.traceId}`,
    `Agent ${first.actor.agent}${first.actor.onBehalfOf ? ` acting for ${first.actor.onBehalfOf}` : ""}`,
    `Prompt ${first.versions?.prompt ?? "?"}   model ${first.versions?.model ?? "?"}   policy ${first.versions?.policy ?? "?"}`,
    "",
  ];
  for (const e of events) {
    const d = e.detail;
    let line: string;
    switch (e.type) {
      case "run.start":
        line = `asked: ${String(d.userMessage)}`;
        break;
      case "context.retrieved": {
        const docs = (d.documents as Array<{ id: string; source: string }>) ?? [];
        line = `read ${docs.length} documents: ${docs.map((x) => `${x.id} (${x.source})`).join(", ")}`;
        break;
      }
      case "model.call":
        line = `model proposed ${String(d.proposedTool)} with ${JSON.stringify(d.arguments)}`;
        break;
      case "policy.decision":
        line = `policy said ${String(d.effect)} by rule ${String(d.rule)}: ${String(d.reason)}`;
        break;
      case "tool.call":
        line = `ran ${String(d.tool)}, result ${JSON.stringify(d.result)}`;
        break;
      case "run.end":
        line = `answered: ${String(d.answer)}`;
        break;
    }
    lines.push(`  ${String(e.seq).padStart(2)}. ${line}`);
  }
  return lines.join("\n");
}

section("04 · Audit trail (solution)");

const actor: Actor = { agent: RUN.agent, onBehalfOf: RUN.user };
const versions = { prompt: RUN.promptVersion, model: RUN.modelVersion, policy: RUN.policyVersion };

emit("run.start", actor, redact({ userMessage: RUN.userMessage }), versions);
emit("context.retrieved", actor, redact({ documents: RUN.retrieved }), versions);
emit("model.call", actor, { proposedTool: RUN.toolCall.tool, arguments: RUN.toolCall.args }, versions);
emit("policy.decision", actor, { ...RUN.policyDecision }, versions);
emit("tool.call", actor, { tool: RUN.toolCall.tool, result: RUN.toolResult }, versions);
emit("run.end", actor, redact({ answer: RUN.finalAnswer }), versions);

console.log(`\n${reconstruct(log)}`);

section("Checks");
// Identities in `actor` are the point of the log, so they stay. Redaction applies
// to the content the agent handled, which is what `detail` holds.
const serialised = JSON.stringify(log.map((e) => e.detail));
check("six events were recorded", log.length === 6);
check("every event carries the trace id and an increasing seq", log.every((e, i) => e.seq === i + 1 && e.traceId.length > 0));
check("every event names both the agent and the person", log.every((e) => e.actor.agent && e.actor.onBehalfOf));
check("every event records the prompt and model version", log.every((e) => e.versions?.prompt && e.versions?.model));
check("no email address survived redaction in content", !/[\w.]+@[\w.]+\.\w+/.test(serialised));
check("no card number survived redaction in content", !/\b\d{12,19}\b/.test(serialised));
check("the chain verifies", verifyChain(log).ok);

const tampered = log.map((e) => ({ ...e }));
tampered[3]!.detail = { effect: "allow", rule: "refund-limit", reason: "edited afterwards" };
const result = verifyChain(tampered);
check("editing a past event breaks the chain", !result.ok && result.brokenAt === 4);
info(`tamper detected at event ${result.brokenAt}, which is what you want`);

check("the reconstruction mentions the tool, the decision and the person", /issue_refund/.test(reconstruct(log)) && /refund-limit/.test(reconstruct(log)) && /priya/.test(reconstruct(log)));
finish();

export { log };
