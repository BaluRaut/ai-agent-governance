# 10 · The release pipeline

**Families:** all ten. **Cloud account needed:** no.

## Why this is last

Everything before this produced a signal. A control inventory, a policy decision log, a filter's measured recall, an audit chain, an evaluation comparison, a conformance check over infrastructure code. Each is useful on its own and none of them stops anything.

This exercise is the thing that stops something. One function takes every signal and returns deploy or do not deploy, with reasons. Put it in a pipeline and governance stops depending on whether anyone remembered.

## The part that makes it survive contact with reality

A gate with no escape hatch gets bypassed within a month, usually by someone with a deadline and administrative rights, and then you have neither a gate nor a record. So this one has **waivers**: a finding can be waived, but only with an owner, a reason and an expiry date. An expired waiver stops working. A waiver on a critical finding is not accepted at all.

That is the difference between a control people work with and one they route around.

## Steps

1. Open `exercise.ts` and implement `applyWaivers()` then `gate()`.
2. Run: `npm run ex -- 10`
3. Look at `.github/workflows/governance.yml` in the repository root to see the same logic as a pipeline.

## Done when

The clean release passes, the one with a safety regression is blocked, the one with an expired waiver is blocked, and the one with a valid waiver on a medium finding passes with the waiver recorded.

## Notice

- **Reasons are the product.** Whoever is blocked reads them at five on a Friday. "Policy violation" wastes an hour; naming the finding, the owner and what would clear it does not.
- **An expired waiver blocks, whatever the severity.** Someone accepted that risk with an end date. Letting the date slide quietly is exactly how a temporary exception becomes permanent, so the gate makes you renew it deliberately or fix the finding.
- **A waiver is a record, not a bypass.** It has an owner and an expiry, and it appears in the output every time until it is resolved. If nobody ever looks at the waiver list, the list is where your risk is.
- **Do not average signals into a score.** A single safety regression blocks regardless of how good everything else looks, for the same reason as in exercise 05.
