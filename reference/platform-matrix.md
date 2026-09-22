# The matrix

Four platforms against the ten [control families](control-catalogue.md). **Verified 22 September 2026.** Every cell is sourced on the platform's own page: [Bedrock](platforms/aws-bedrock.md), [Google](platforms/google-vertex-ai.md), [Copilot](platforms/microsoft-copilot.md), [Foundry](platforms/azure-ai-foundry.md).

Read the caveats under each table rather than the ticks. A capability that exists in preview, fails open, or covers only part of the traffic is not the same as one that does not, but it is not the same as one that works either.

Names as of this date: AWS is **Bedrock and AgentCore**, Google is **Gemini Enterprise Agent Platform**, formerly Vertex AI, Microsoft has two different products, **Copilot and Copilot Studio** for the workplace and **Microsoft Foundry**, formerly Azure AI Foundry, for building.

---

## 1. Identity

| | Bedrock / AgentCore | Google | Copilot Studio | Foundry |
|---|---|---|---|---|
| Per-agent identity | AgentCore Identity, workload identities | **Agent Identity, SPIFFE-based** | Entra Agent ID, automatic since May 2026 | Entra Agent ID, automatic |
| Token theft resistance | Vaulted credentials, private key JWT | **Tokens bound to the agent's X.509 certificate** | Conditional Access | Federated credential chain |
| Accountable human | Not built in | Not built in | **Sponsor, transfers to manager on leaving** | Not built in |
| Registry of agents | AWS Agent Registry | Agent Registry | **Agent 365 registry, with unowned and unmanaged counts** | Control Plane fleet inventory, preview |

**Google's is the strongest design**, because binding the token to a certificate makes a stolen token useless, and because agent identities cannot be impersonated and cannot have long-lived keys generated for them. **Microsoft's is the strongest operationally**, because a named sponsor who transfers to their manager is the only answer any of the four gives to the question of who is accountable next year.

Traps: on Google, **redeploying an agent changes its principal and prior grants are not inherited**. On Microsoft, a Conditional Access policy aimed at all users **does not cover agent user accounts**, and a policy targeting an agent identity does not apply to its paired user account.

## 2. Authorization

| | Bedrock / AgentCore | Google | Copilot Studio | Foundry |
|---|---|---|---|---|
| Per-tool permission | **AgentCore Policy, Cedar or Dogwood** | **IAM Unified Access Policies, allow and deny in one** | Data policies over connectors | Toolbox, MCP scopes |
| Policy on argument values | **Yes** | Yes, CEL conditions | No | No |
| Dry run before enforcing | Automated reasoning checks the policy first | **Explicit DRY_RUN mode** | Real-time, no dry run | Azure Policy audit effect |
| Default posture | Deny by default recommended | **All connections blocked unless granted** | Connectors default to non-business | Deny via policy |

AWS and Google are well ahead here. **AWS's automated reasoning over the policy itself is unique**: it detects overly permissive, overly restrictive or unsatisfiable policies *before* they are enforced, which is a class of bug nobody else catches.

## 3. Input controls

| | Bedrock / AgentCore | Google | Copilot Studio | Foundry |
|---|---|---|---|---|
| Prompt injection detection | Guardrails `PROMPT_ATTACK` | Model Armor | Built in, non-configurable | **Prompt Shields, user and document** |
| Indirect injection specifically | Covered under prompt attack | Model Armor | Purview rule on external email, preview | **A named Indirect Attack shield** |
| Org-wide minimum | **Organizations `BEDROCK_POLICY`** | **Floor settings** | Tenant settings | Azure Policy, preview for agents |
| Applies to tool traffic | **No, filters skip tool-use fields** | Via Agent Gateway | n/a | **Yes, tool call and tool response, preview** |

Two things to take from this row.

**Google's floor settings are the best idea on this list.** A floor defines a minimum that every template in an organisation must meet, so a team can be stricter and cannot be weaker. AWS's organisation policy is comparable in effect, with the important extra that `selective_content_guarding` defaults to comprehensive, so an application cannot tag-scope its way out.

**Foundry is the only one that can place a control on a tool call**, which is where consequence lives. It is in preview, and the guardrail there fails open on a bad policy reference, so verify rather than assume.

## 4. Output controls

| | Bedrock / AgentCore | Google | Copilot Studio | Foundry |
|---|---|---|---|---|
| Content safety | 6 categories, block or detect | 4 configurable plus Model Armor | Moderation level, default High | 4 categories with severity |
| Groundedness | **Contextual grounding, output only** | Rubric metrics | Allow ungrounded responses toggle | Groundedness detection, **models only, not agents** |
| Personal data | 35 built-in types, block or anonymise | Sensitive Data Protection | **Sensitivity labels plus DLP** | PII filter, preview |
| Formal verification | **Automated Reasoning checks** | No | No | No |

**AWS's Automated Reasoning checks have no equivalent anywhere else.** They translate a policy document into formal logic and check claims against it. They are also detect-only and never block, so treat them as a very good detector rather than a gate.

**Microsoft's sensitivity label story is the strongest for documents**, with the caveat that carries the whole thing: an encrypting label only withholds content from an AI app if the user lacks the **EXTRACT** right. A label that encrypts and grants EXTRACT gives false assurance.

## 5. Action controls

| | Bedrock / AgentCore | Google | Copilot Studio | Foundry |
|---|---|---|---|---|
| Platform approval gate | Harness lifecycle hooks, Lambda allow or deny | **ADK `require_confirmation`, static or dynamic** | n/a | **MCP `require_approval`, defaults to always** |
| Session-aware rules | **Temporal policies** | Semantic governance, intent gating | No | No |
| Intent checking | No | **Natural language constraints against original intent** | No | No |
| Egress control | Gateway targets | Agent Gateway, registry allowlist | Connector blocking | Network egress rules, preview, fail-closed |

This is the most interesting row, because two genuinely new ideas appeared in 2026 and they solve the same problem from different ends.

**AWS temporal policies** reason over what already happened in this session: require that an approval was granted before a transfer, block an action after N occurrences, keep a running total under a budget. **Google's semantic governance** checks a proposed tool call against the user's original intent, in plain English, before it executes. Google's documented example is blocking a `send_email` call when the user only asked to summarise their calendar, which is exactly the indirect injection case.

Both are what exercise 02's untrusted-origin policy looks like as a managed service. Both are worth knowing about even if you build your own.

A caution on Foundry: the human-in-the-loop documentation describes a **developer-implemented** pattern, not a platform-enforced control. The platform gate there is MCP `require_approval`.

## 6. Data boundary

| | Bedrock / AgentCore | Google | Copilot Studio | Foundry |
|---|---|---|---|---|
| Default retention | **Zero data retention by default** | Varies by feature | Mailbox retention | Explicit deletion required |
| Configurable retention | **Four modes, enforceable by SCP** | Six separate opt-outs | Retention policies | Modified abuse monitoring |
| Customer-managed keys | Broad | Broad, **not on global endpoint** | Copilot Studio CMK | **Not for prompt agents on managed storage** |
| Operator access | **Zero operator access, no SSH path exists** | Access Transparency and Approval | Customer Lockbox, two exclusions | Secure workstations with just-in-time approval |

**AWS has the best default and the best enforcement.** Zero data retention is the default rather than a request, and `bedrock:DataRetentionMode` lets a service control policy hold an entire organisation to it. The zero operator access design, where no mechanism exists for an operator to sign in at all, is a stronger claim than a process control.

**Google's zero retention takes six separate actions**, and the easiest to miss is that the Interactions API `store` field **defaults to true for all models**.

**Microsoft's honesty award**, for the sentence in the retention documentation saying that messages visible in the AI app are not an accurate reflection of whether they are retained or deleted, and you should verify with eDiscovery. Every platform has this problem. Only one writes it down.

## 7. Observability

| | Bedrock / AgentCore | Google | Copilot Studio | Foundry |
|---|---|---|---|---|
| Agent tracing | OpenTelemetry into CloudWatch | OpenTelemetry into Cloud Trace | Purview audit | OpenTelemetry into App Insights |
| Content capture is opt-in | Yes | **Yes, separate flag from tracing** | n/a | Yes, development only |
| Injection attempts logged | Guardrail assessments | Model Armor spans | **`XPIADetected` and `JailbreakDetected` fields** | Defender alerts |
| Inference in the audit log | Management events | **No, not in the audited operations list** | `CopilotInteraction` | Diagnostic categories |

**Microsoft's audit fields are the most governance-ready.** Having `XPIADetected` on a grounding resource and `JailbreakDetected` on a message means you can query for attempted attacks rather than infer them.

**Google has a real gap here, stated honestly:** `generateContent` and `reasoningEngines.query` do not appear in the audited-operations table. Agent invocation reaches you through logging and traces, not through Cloud Audit Logs. If a control narrative says audit logs cover agent activity, check which log is meant.

Two dated changes to diary: Foundry moves sensitive trace attributes to a separate table on **30 September 2026**, which will break dashboards that read the current tables.

## 8. Evaluation

| | Bedrock / AgentCore | Google | Copilot Studio | Foundry |
|---|---|---|---|---|
| Agent evaluators | **AgentCore Evaluations, GA** | Rubric and trajectory metrics | Pre-publish scan, advisory | **The widest set of the four** |
| Trajectory evaluation | Three match modes, no model needed | Six computation metrics | No | Task navigation efficiency |
| Online, on live traffic | **Samples a configurable percentage** | Scheduled and continuous | No | Continuous, 100 runs per hour |
| Red teaming | **None first-party** | **None self-serve**, Mandiant is consulting | No | **AI Red Teaming Agent, PyRIT-based** |
| Release gate in CI | Batch evaluations and A/B testing | Test case evaluation mode | No | GitHub Action and Azure DevOps task, preview |

**Foundry wins this family**, and it is the only one shipping a self-serve red-teaming agent with an attack success rate metric. Say that plainly when comparing: AWS has no first-party red-teaming product, and Google's is a human consulting engagement. Security Command Center's "virtual red teaming" is cloud attack-path simulation and never sends an adversarial prompt to a model.

**Copilot Studio is the weakest.** Its governance strength is data, identity and audit; release-gating evaluation is not there. For Azure-hosted agents the tooling is in Foundry.

## 9. Cost and quota

| | Bedrock / AgentCore | Google | Copilot Studio | Foundry |
|---|---|---|---|---|
| Hard spend cap | **None anywhere** | **Spend caps, preview, blocks at 100%** | **Per-agent limit turns the agent off** | Azure budgets, alerting |
| Per-run ceiling | **Harness `maxIterations`, default 75** | Agent quotas, 90 per minute | Copilot Credits | Task budgets |
| Per-caller throttle | **Gateway rate limits, rate zero blocks** | Quotas per project | Environment capacity | Quotas |
| Attribution | Five separate mechanisms | Labels, **ignored on provisioned throughput** | Per-agent reports | Tags |

Two real hard caps exist and both arrived recently. **Google's spend cap blocks all new usage at 100% of budget, including provisioned throughput**, and only a person can lift it. **Copilot Studio's per-agent credit limit turns the agent off**. AWS still has no dollar cap; the closest is a daily token quota, and the cost management FAQ says plainly that requiring every call to be tagged is not possible from the Bedrock side.

AWS's harness limits are the best per-run control, under a heading that says exactly what it is for: set hard caps so a runaway agent cannot burn through resources.

## 10. Lifecycle

| | Bedrock / AgentCore | Google | Copilot Studio | Foundry |
|---|---|---|---|---|
| Approval before publish | Registry approval workflows | Registry with IAM | **Admin approval required tenant-wide** | Publish creates a dedicated identity |
| Ownerless agent handling | Registry inventory | Registry | **Auto-reassign to the previous owner's manager** | Fleet inventory |
| Shadow agent detection | Organizations auto-detection | Registry | **Unmanaged agent count on the dashboard** | Discovers Logic Apps and SRE agents too |
| Withdraw an agent | Delete, rate limit to zero | Block at gateway | Block, with platform-dependent scope | Start, stop, block |

**Microsoft is clearly ahead here**, and it is the family most organisations discover they need only after they already have agents nobody remembers deploying. A dashboard that counts agents without owners and agents created outside the governance plane, with a bulk rule that reassigns them, is a different level of maturity from an inventory you can query.

---

## If you are choosing

Nobody is choosing purely on governance, so this is about knowing what you will have to build yourself.

**Amazon Bedrock and AgentCore** is strongest on data protection defaults, organisation-wide enforcement, and tool authorization. Zero data retention by default with service control policy enforcement is the best data posture of the four. You will build your own red teaming, and you will build your own spend cap.

**Google** is strongest on identity design and on the two newest ideas in action control, floor settings and semantic governance. You will work around the audit gap on inference, and you will read the residency rules carefully because the global endpoint gives no guarantee.

**Microsoft Copilot and Copilot Studio** is strongest on lifecycle, data governance over existing documents, and audit fields. It is a governance plane for agents built by people who are not engineers, which is a genuinely different problem, and it is thin on evaluation.

**Microsoft Foundry** is strongest on evaluation and red teaming, and is the only platform that can place a control on a tool call. You will work around a guardrail that fails open on a bad reference, and you will decide your network architecture before you deploy, because it is immutable.

## Three things nobody does well

Worth saying, because a matrix of ticks implies more maturity than exists.

**Agent identity has no standard.** Every platform has shipped something; none of it interoperates. The standards work is real and early: a NIST initiative announced in February 2026, OpenID Foundation working group drafts from June 2026, and an individual Internet-Draft with no standing. See [frameworks.md](frameworks.md).

**Input filtering is a rate reducer on all four.** Exercise 03 measures why. Every platform sells a filter; none can close the hole, because the model has no reliable way to separate instructions from content. What differs is whether the platform gives you somewhere to put a control at the point of action, and only two currently do.

**Evidence is harder than control.** Configuring a guardrail takes an afternoon. Reconstructing one agent decision from six months ago takes a system nobody budgeted for. That is why the audit trail is exercise 04 and not an appendix.
