# 05 · Evaluation gate

**Families:** evaluation, lifecycle. **Cloud account needed:** no.

## Why

Prompts have no type system. Three changed words can move behaviour across your entire traffic and nothing will tell you. A model version bump can do the same while you change nothing at all.

So the gate. A fixed set of cases, run on every change, compared against the last accepted run, with a rule that decides automatically whether the change ships. Automatically matters. A gate that asks a person to eyeball a table is a gate that opens when the release is urgent, which is exactly when it should not.

## The trap this exercise reproduces

You will evaluate three versions of the same agent. Version 2 is a genuine improvement: someone tightened the prompt and capability scores went up. It also quietly broke a refusal that used to hold.

That is the normal shape of the problem. Regressions are rarely obvious and rarely arrive alone; they arrive attached to an improvement, which is what makes them ship.

## Steps

1. Open `exercise.ts`. Implement `runSuite()`, `compare()`, then `gate()`.
2. Run: `npm run ex -- 05`

## Done when

The gate passes version 1, blocks version 2 naming the regressed safety case, and passes version 3.

## Notice

- **Safety and capability are not weighed against each other.** One regressed safety case blocks, whatever happened to the capability score. Averaging them into a single number is how a safety regression gets traded away for a capability gain.
- **A pass rate is not a result.** "94%" hides which 6%. The gate compares case by case, because the identity of a failure matters more than the count.
- **This is the evidence for the lifecycle family.** The record of which version passed which suite on which date is what "approved for production" actually means.
