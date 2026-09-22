# AI Agent Governance

**📘 [Read the guide →](https://baluraut.github.io/ai-agent-governance/)** · **[Study plan](STUDY-PLAN.md)** · **[Provider setup](reference/provider-setup.md)**

What controls an AI agent actually needs, what Amazon Bedrock, Google Cloud, Microsoft Copilot and Microsoft Foundry each give you, and ten exercises that end in deployed infrastructure.

Everything in `reference/` was verified against the vendors' own documentation on **22 September 2026**, with a source link on every claim and an explicit list of what could not be verified. This area moves fast enough that a page without a date is a liability.

## Three parts

**[The control catalogue](reference/control-catalogue.md)** — ten families of control, platform-neutral, each with what goes wrong without it and how to test it. Everything else is written against these.

**[The matrix](reference/platform-matrix.md)** — the four platforms side by side, family by family. Per-platform detail in [reference/platforms/](reference/platforms/), and how the families map to the EU AI Act, NIST, ISO 42001 and OWASP in [frameworks.md](reference/frameworks.md).

**Ten exercises** — small programs you finish yourself, with checks that tell you when they work.

## The exercises

| # | Exercise | Families | Cloud account |
|---|----------|----------|---------------|
| 01 | [Control inventory](exercises/01-control-inventory) | all ten | no |
| 02 | [Policy as code](exercises/02-policy-as-code) | authorization, action | no |
| 03 | [Injection testing](exercises/03-injection-testing) | input, output | no |
| 04 | [Audit trail](exercises/04-audit-trail) | observability, identity | no |
| 05 | [Evaluation gate](exercises/05-evaluation-gate) | evaluation, lifecycle | no |
| 06 | [Deploy a Bedrock guardrail](exercises/06-deploy-bedrock-guardrail) | input, output, data boundary | to apply |
| 07 | [Deploy Model Armor](exercises/07-deploy-model-armor) | input, authorization, cost | to apply |
| 08 | [Deploy a Foundry guardrail](exercises/08-deploy-foundry-guardrail) | input, identity, observability | to apply |
| 09 | [Govern Microsoft Copilot](exercises/09-govern-copilot) | lifecycle, output, cost | to apply |
| 10 | [The release pipeline](exercises/10-release-pipeline) | all ten | no |

Exercises 01 to 05 and 10 need nothing but Node. Exercises 06 to 09 are graded by reading your infrastructure code, so they pass without an account; applying them for real is optional and each README carries a cost note.

## Where to start

New to this? Follow the **[study plan](STUDY-PLAN.md)**. It has four weeks at an hour a day, plus three shorter paths for people who came here for one thing: building an agent, running a platform, or answering an auditor.

Want to deploy the cloud exercises for real? **[Provider setup](reference/provider-setup.md)** has the exact prerequisites, permissions, commands, costs and teardown for each platform.

## Setup

```bash
git clone https://github.com/BaluRaut/ai-agent-governance.git
cd ai-agent-governance
npm install
npm run list
npm run ex -- 01
```

Node 20 or newer. No API keys. Nothing in this repository calls a model.

```
npm run list                  # list the exercises
npm run ex -- 04              # run your version of exercise 04
npm run ex -- 04 --solution   # run the finished version
npm run check:all             # run every exercise's checks
npm run typecheck             # compile everything
```

Each exercise folder holds a `README.md` explaining what you are building and why, an `exercise.ts` with `TODO`s and self-checks, and a `solution.ts`. The deployment exercises add `terraform/` or `bicep/` for you to complete and a finished copy under `solution/`.

## What the exercises build up to

They are in this order on purpose. The first produces requirements, the next four produce controls and evidence, the middle four deploy real infrastructure, and the last one is the gate that refuses to ship when any of the others is unhappy.

Three threads run through all of them:

- **A filter is a rate reducer, not a wall.** Exercise 03 measures how much gets past a detector you wrote yourself, then shows what catches the remainder.
- **Reversible and irreversible are different kinds of action.** That distinction, not read versus write, decides which controls an agent needs.
- **A control you cannot evidence is a claim.** The audit trail is exercise 04 rather than an appendix, because identity, approvals and versions are only real if they appear in a trace you can query.

## Honest limits

- **Verified on one date.** Six of the platform pages record facts that changed during 2026, including a product rename on each of the three clouds. Re-verify before relying on any of it.
- **Nothing here was applied to a live account.** The infrastructure code is written against the documented resource schemas and checked for conformance, not deployed. Run `terraform validate` against the current provider before you apply.
- **This is not legal advice.** The framework mapping is an engineer's reading of primary sources, with the places it is an inference marked as such.

## License

MIT
