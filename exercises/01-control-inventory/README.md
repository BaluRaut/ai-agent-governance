# 01 · Control inventory

**Families:** all ten. **Cloud account needed:** no.

## Why this comes first

Almost every control an agent needs is decided by its design, not by a console setting. If the agent can move money, no amount of content filtering makes it safe to run unattended. So governance starts by reading the design and deriving what it forces you to build.

You will write that derivation as code: a function that takes an agent specification and returns the controls that specification requires. Doing it as code rather than as a document means it runs in a pipeline later, and means two reviewers get the same answer.

## The specification

Look at `src/lib/agent-spec.ts` first. Three fields carry most of the weight:

- **`effect` on each tool** — `read`, `write`, or `irreversible`. The line that matters is reversible against not. A wrong row in a table is a Tuesday. A sent payment is not.
- **`ingestsUntrustedContent`** — does the agent read text that neither you nor your user wrote? Web pages, inbound email, uploaded documents. Everything in a context window is instructions as far as the model is concerned, so this field changes the risk more than any other.
- **`dataClasses`** — how sensitive the reachable data is, including through tools.

## Steps

1. Open `exercise.ts`. Implement the rules marked `TODO` inside `assess()`.
2. Run it: `npm run ex -- 01`
3. Compare with `solution.ts` afterwards.

## Done when

Each of the three example agents produces the requirements its design forces, and the harmless one is not drowned in requirements it does not need. A framework that flags everything at critical gets ignored within a month.

## Notice

- Rule 4 is the one to understand. Three properties together make data exfiltration possible without anyone touching your infrastructure: the agent can reach data worth taking, it reads content an attacker can write, and it has a way to send data out. Any two are usually survivable. All three is a combination to design away rather than to detect your way out of.
- Severity is a claim about consequence, not about how likely you think it is. Reserve `critical` for "this can cause harm that cannot be undone".
