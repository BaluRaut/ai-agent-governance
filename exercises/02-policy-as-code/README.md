# 02 · Policy as code

**Families:** authorization, action, observability. **Cloud account needed:** no.

## Why

Exercise 01 produced requirements. A requirement written in a document is a hope. The same requirement written as a function that returns `deny` is a control.

This is the enforcement point: a small engine that sits between the model and your tools, and decides, per call, whether it happens. Every platform later in this repository has its own version of this idea under a different name. Build it once by hand and the platform versions stop looking like magic.

## The semantics that matter

Get these three right and the rest is detail.

1. **Default deny.** A call that no policy explicitly allows is denied. The alternative, allowing anything not explicitly forbidden, cannot be secured because you cannot enumerate every bad call.
2. **Deny wins.** When policies disagree, the most restrictive outcome applies. Order is `deny` over `require-approval` over `allow`.
3. **Every decision is recorded,** including the allows. A log of only the denials cannot answer "what did it actually do".

## Steps

1. Open `exercise.ts`. Implement `decide()` with those three rules, then the five policies below it.
2. Run: `npm run ex -- 02`

## Done when

The decision table at the bottom matches, and the audit log holds one entry per call including the allowed ones.

## Notice

- The engine takes the *arguments*, not just the tool name. "May call `issue_refund`" is not a policy. "May refund up to five thousand, in the currency of the original order" is.
- One policy asks whether untrusted content was in the context when the call was proposed. That single input converts an unattended irreversible action into one that waits for a person, and it is the cheapest defence in this repository against an injected instruction.
- Notice what the engine cannot do: it sees a tool call, not an intention. It cannot tell a legitimate refund from one an attacker talked the model into. That is why the limits are on consequence, not on intent.
