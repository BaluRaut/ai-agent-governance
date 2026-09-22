# The control catalogue

Ten families of control. Every platform page in [platforms/](platforms/) is written against these families, so you can compare Amazon Bedrock with Azure AI Foundry without comparing two marketing vocabularies. Every exercise states which families it exercises.

The order is not arbitrary. It follows a request through an agent: who is calling, what they may do, what comes in, what goes out, what changes, where it all lives, what was recorded, whether it still works, what it cost, and who signed it off.

A note on scope. Governance is not a layer you add at the end. Eight of these ten families are decided by the agent's *design*, not by a setting you switch on afterwards. That is why exercise 01 is a design review and not a console walkthrough.

---

## 1. Identity

**The question:** who is this agent, as distinct from the person who triggered it?

An agent that runs as a shared service account is invisible in every log you own. You can see that "the automation" acted; you cannot see which agent, on whose behalf, under which version. When something goes wrong, the blast radius is "everything that account could reach".

**Good looks like:** each agent has its own identity in the organisation's directory. That identity has a lifecycle, an owner, and can be disabled in one place. Where the agent acts for a person, the person's identity travels with the call and both appear in the log. Delegation is explicit and bounded, not inherited wholesale.

**How to test it:** disable the agent's identity and confirm it stops. Then ask who owned it. If the answer takes more than one query, you do not have this control.

---

## 2. Authorization

**The question:** what may it do, and is that the least it needs?

Agents accumulate permissions the way scripts do, except faster, because a model will happily use anything you hand it. The failure is rarely a clever attack. It is an agent that was given a broad role in week one because the narrow one was fiddly.

**Good looks like:** permissions are enumerated per tool, not per agent. The identity from family 1 holds only the grants its tools actually use. Read and write paths are separate grants. Nothing is granted at the subscription, project, or account level that could be granted at the resource level.

**How to test it:** take the agent's permission set and remove one grant at random. If nothing breaks, the set was too wide. Repeat until something breaks.

---

## 3. Input controls

**The question:** what reaches its context, and who can influence that?

Everything in the context window is instructions as far as the model is concerned. There is no reliable separation between "the system prompt" and "this web page I just fetched". If an attacker can put text where your agent will read it, they can attempt to redirect it. This is not a bug that gets patched; it is a property of how the model works, and it is why input controls are a family rather than a checkbox.

**Good looks like:** you know every channel through which text enters the context, and you have classified each as trusted or untrusted. Untrusted content is fenced, labelled, and passed through a detector before it reaches the model. Detection is treated as reducing the rate, never as eliminating the risk, so the controls in families 4 and 5 assume it will sometimes fail.

**How to test it:** write down every source of text in one request. If your list is shorter than the actual set, that gap is your exposure. Exercise 03 builds the detector and then measures how much it misses.

---

## 4. Output controls

**The question:** what may leave, and what must never leave?

**Good looks like:** the output path applies content safety, checks answers against their cited sources when the answer claims to be grounded, and redacts identifiers the recipient is not entitled to. Output controls run on the way to the user *and* on the way to a tool, because a tool call is an output too, and it is the one that carries data out of the building.

**How to test it:** send the agent a request that should produce a refusal and one that should produce a redaction, on every release. Those two cases belong in your eval set, not in a manual checklist.

---

## 5. Action controls

**The question:** which actions change the world, and who approves those?

The distinction that matters is not read versus write. It is reversible versus not. A wrong row in a staging table is a Tuesday. A payment, a sent email, a deleted record, or a message to a customer cannot be recalled, and an agent that can take one of those unattended is a different kind of system from one that cannot.

**Good looks like:** every tool is classified by effect. Irreversible actions require explicit confirmation from a person who can see what is about to happen and what it will affect. Limits are enforced outside the model: a spend cap, a rate limit, a maximum number of records per run. The agent cannot raise its own limits.

**How to test it:** list the agent's tools and, for each, write the sentence you would send to a customer if it fired a thousand times by mistake. The ones you cannot finish writing need an approval gate.

---

## 6. Data boundary

**The question:** where does the data sit, who holds the keys, how long is it kept?

**Good looks like:** the region the model runs in is pinned and verified, not assumed from the console you happened to open. Keys are customer-managed where the data class calls for it. Network paths are private where the data class calls for it. Retention is set deliberately, including for the logs from family 7, which usually contain the most sensitive text in the whole system. You know, from the provider's own written terms, whether your prompts can be used to train their models, and you can point to the page that says so.

**How to test it:** ask where a given prompt was processed and where its log now sits, and answer with a region name and a retention period. Then delete one person's data end to end and count the systems you had to touch.

---

## 7. Observability

**The question:** could you reconstruct a single decision six months from now?

The bar is higher than "we have logs". An agent decision is a chain: this input, under this version of this prompt, with this retrieved context, chose this tool with these arguments, got this result, and produced this output. If any link is missing, you cannot answer the only question anyone ever asks after an incident, which is *why did it do that*.

**Good looks like:** one trace per run, spanning every model call and tool call, with the prompt version and model version recorded as attributes. Sensitive fields are redacted at emission, not at query time. The trace can be joined to the identity from family 1 and to the approval from family 5.

**How to test it:** pick a run from last month at random and reconstruct it. Time yourself. Exercise 04 builds this.

---

## 8. Evaluation

**The question:** how do you know it still behaves, after the last change?

Prompts have no type system. A change of three words can move behaviour across your whole traffic, and nothing will tell you. This is the family teams skip, and it is the one that makes every other family verifiable rather than aspirational.

**Good looks like:** a fixed set of cases with expected outcomes, including safety and refusal cases, run on every change and compared against the last accepted run. A release is blocked when a safety case regresses, automatically, not by someone remembering. Adversarial cases are generated as well as hand-written. Behaviour is also sampled in production, because your eval set is always smaller than reality.

**How to test it:** it is the test. Exercise 05 makes it a release gate.

---

## 9. Cost and quota

**The question:** what stops one loop from spending the quarter's budget overnight?

Agents differ from ordinary software in that a bug can be expensive rather than merely broken. A retry loop around a large model, running unattended over a weekend, is a genuinely new failure mode.

**Good looks like:** hard quotas at the platform, not just a budget alert that emails someone on Monday. A per-run step ceiling enforced by your own loop. Cost attributed per agent and per tenant through tags or labels, so "which agent" is answerable without a spreadsheet.

**How to test it:** ask what the maximum possible spend is in twenty-four hours if every agent loops. If the answer is "unbounded", you have an alert, not a control.

---

## 10. Lifecycle

**The question:** who approved this version, and how would you withdraw it?

**Good looks like:** agents are registered, versioned, and owned. There is a record of who approved a version for production and against what evidence, which is the output of family 8. Changes go through the same pipeline as code. There is a documented way to withdraw an agent, and someone has done it at least once in a drill.

**How to test it:** list every agent in production, with an owner and a last-reviewed date. Most organisations cannot, and the ones that cannot discover they have agents nobody remembers deploying.

---

## Using the catalogue

The families are independent enough to assign to different people and coupled enough that skipping one weakens the others. Two couplings worth naming:

- **Families 3, 4 and 5 form one chain.** Input controls reduce how often an injected instruction arrives; output and action controls decide what happens when one gets through. Investing only in detection is the common mistake.
- **Family 7 is what makes families 1, 5 and 10 auditable.** Identity, approvals and versions are only real if they appear in a trace you can query.

The mapping from these families to the EU AI Act, the NIST AI Risk Management Framework, ISO/IEC 42001 and the OWASP list is in [frameworks.md](frameworks.md). The mapping to each vendor's named features is in [platforms/](platforms/), and the side-by-side is in [platform-matrix.md](platform-matrix.md).
