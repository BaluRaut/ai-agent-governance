# Microsoft Foundry, formerly Azure AI Foundry

**Verified against learn.microsoft.com on 22 September 2026.** Every claim was checked against a live page, linked inline. See [What we could not verify](#what-we-could-not-verify) at the end.

## The rename, which invalidates most existing notes

| Was | Is now |
|---|---|
| Azure AI Foundry | **Microsoft Foundry**, documented under `/azure/foundry/` |
| The hub-based experience | **Foundry (classic)**, under `/azure/foundry-classic/` |
| Azure AI services | **Foundry Tools** |
| Content filters, RAI policy | **Guardrails and controls**, though the ARM object is still `raiPolicies` |
| Azure AI User, Owner, Account Owner, Project Manager | **Foundry** User, Owner, Account Owner, Project Manager, with role IDs unchanged ([RBAC](https://learn.microsoft.com/en-us/azure/foundry/concepts/rbac-foundry)) |

URLs still contain the old names while page titles use the new ones, which makes searching unusually confusing right now.

There are also **two agent types with different governance**: *prompt agents*, which are configuration only, and *hosted agents*, which run your container and get an automatic dedicated Entra identity per agent ([agents overview](https://learn.microsoft.com/en-us/azure/foundry/agents/overview)).

---

## 1. Identity

Foundry **automatically provisions and manages agent identities** through Entra Agent ID, which is generally available ([agent identity](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/agent-identity)). An agent identity is a special service principal; an *agent identity blueprint* is the template for a class of agents, and is the object Conditional Access attaches to.

The authentication chain is secretless and worth understanding, because it is where permission bugs live. The blueprint holds a federated credential trust with the project's managed identity. Foundry authenticates the blueprint, Entra issues an agent-identity token, and that is exchanged for a token scoped to the downstream audience. The documented consequence: **the agent identity, not the managed identity, is the principal that needs the role assignment on the target resource.** An incorrect audience fails even when the role assignment is right.

One behaviour to design around: all unpublished agents in a project **share one identity**, and publishing creates a dedicated blueprint and identity whose roles **do not carry over** from the shared one.

## 2. Authorization

**Do not use the Azure AI Developer role.** The documentation is unusually direct: despite the name it is scoped to Azure Machine Learning workspaces and Foundry hubs, not to Foundry projects or hosted agents. Roles beginning with *Cognitive Services* are likewise not for Foundry scenarios ([RBAC](https://learn.microsoft.com/en-us/azure/foundry/concepts/rbac-foundry)).

The current roles are Foundry Agent Consumer, Foundry User, Foundry Project Manager, Foundry Account Owner and Foundry Owner. RBAC now has three scopes, account, project and **agent**, though agent-scope assignments are currently assessed only for agent endpoint access.

Two hard facts for a hardening checklist. Agents, evaluations, datasets and workflows **require Entra ID and do not accept API keys** ([authentication](https://learn.microsoft.com/en-us/azure/foundry/concepts/authentication-authorization-foundry)). And key authentication is switched off with `properties.disableLocalAuth = true`, enforceable through the policy *Azure AI Services resources should have key access disabled*; propagation can take hours, so verify with a 401 rather than assuming ([disable local auth](https://learn.microsoft.com/en-us/azure/ai-services/disable-local-auth)).

Delegated end-user impersonation into a hosted agent is gated by a data action that **is not in any built-in role**, including Foundry Owner. A custom role is mandatory ([hosted agent permissions](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/hosted-agent-permissions)).

## 3. Input and output controls: guardrails

A **guardrail** is a named collection of **controls**, where each control is a risk, one or more intervention points, and an action ([guardrails overview](https://learn.microsoft.com/en-us/azure/foundry/guardrails/guardrails-overview)).

Four intervention points, and the two agentic ones are new in 2026 and in preview: **user input**, **tool call** (agents only, preview), **tool response** (agents only, preview), and **output**. Being able to place a control on a *tool call* is the capability that most distinguishes this platform, because it puts the check where the consequence is.

Risks available on agents include the four content categories, user prompt attacks and indirect attacks through Prompt Shields, protected material, PII in preview, and task adherence in preview. Groundedness and spotlighting are **models only**, not agents.

**The inheritance rule is the one to memorise:** risks are detected based on the guardrail assigned to the *agent*, not the guardrail of its underlying model, and the agentic guardrail **fully overrides** the model's. If no agent guardrail is assigned, it inherits the model deployment's.

Severity is Off, Low, Medium or High, and **turning a category off requires approval** through a limited access review. The default policy `Microsoft.DefaultV2` cannot be edited.

**One failure mode deserves its own paragraph.** For hosted agents, an agent that references a policy which does not exist **is created successfully and reports active, but no content filtering is applied**. The guardrail fails open and harmful prompts reach the agent. Always pass the full ARM resource ID rather than the bare name, and test that filtering actually fires ([hosted agent guardrails](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/add-hosted-agent-guardrails)).

Configuration surfaces: the portal, the ARM object `Microsoft.CognitiveServices/accounts/raiPolicies`, `raiPolicyName` on a deployment, and a per-request `x-policy-id` header override. Expect roughly 50 to 100 milliseconds of latency per intervention point.

## 4. Action controls

The platform-enforced per-call gate is **MCP `require_approval`**, which defaults to `always` when unset: a developer must approve every call. It also accepts `never`, or an allowlist of tools that skip approval ([MCP authentication](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/mcp-authentication)).

A built-in guardrail worth knowing: Foundry **blocks Microsoft-audience tokens from reaching third-party MCP servers**, which closes a real exfiltration path.

Be careful not to overclaim here. The human-in-the-loop documentation describes a **developer-implemented** pause and resume pattern, not a platform-enforced approval control. MCP `require_approval` is the platform gate; the rest is your code.

**Toolbox** is the tool governance construct and is generally available: it curates tools behind one managed MCP-compatible endpoint, handling credential injection, token refresh and policy enforcement at runtime, with versioning so agents pick up a new default without redeploying ([toolbox](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/toolbox-overview)).

**Network egress controls** for hosted agents, in preview, are stored in the same RAI policy: ordered host-matching rules with allow, deny, transform and rewrite, evaluated **fail-closed**, with audit and enforce modes. Microsoft is explicit that these complement rather than replace your network controls, and **are not centrally enforced through Azure Policy** ([hosted agent guardrails](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/add-hosted-agent-guardrails)).

## 5. Data boundary

Customer data is not used to train models, and the models are stateless, storing no prompts or completions ([data privacy](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy)).

Residency holds to the customer-specified geography, **with two exceptions that catch people out**: a `Global` deployment may be processed in any geography where the model is deployed, and `DataZone` within the data zone. Data at rest stays in the designated geography in both cases.

**Abuse monitoring** review is automated by default; human review is introduced only when automated review misses confidence thresholds, and happens from secure access workstations with just-in-time approval. **Modified abuse monitoring** removes the data store and human review, but is available only to customers managed by an account team or under an eligible programme, and Microsoft notes that detection may be less accurate without it ([abuse monitoring](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/abuse-monitoring)). You can verify it is off by looking for the capability `ContentLogging: false` in the resource's JSON view.

There is **no feature called zero data retention**. The two levers are modified abuse monitoring and your own deletion, because data persists unless you explicitly delete threads, files and vector stores ([agents FAQ](https://learn.microsoft.com/en-us/azure/foundry/agents/faq)).

**Customer-managed keys have a coverage gap that changes architectures.** From the capability table on the [CMK page](https://learn.microsoft.com/en-us/azure/foundry/concepts/customer-managed-keys): prompt agents are **not supported** on Foundry-managed storage. In the basic setup, data is encrypted with Microsoft-managed keys **even if the resource is configured with a customer-managed key**. To get customer-managed keys over agent conversation history and vector stores you must use the standard setup with your own storage, Cosmos DB and AI Search.

Network isolation has an immutability trap: **outbound networking settings cannot be updated**, so you cannot add virtual network injection to an existing deployment, you must redeploy ([private link](https://learn.microsoft.com/en-us/azure/foundry/how-to/configure-private-link)). Decide this before you start. Note also which tools cannot run privately: Bing grounding, web search and SharePoint grounding go over the public internet, and Logic Apps, browser automation and computer use are not supported behind a virtual network at all.

## 6. Observability

Application Insights is wired up as a **connection**, not a resource property, after which server-side tracing needs no code changes ([trace setup](https://learn.microsoft.com/en-us/azure/foundry/observability/how-to/trace-agent-setup)). Tracing is generally available for prompt and hosted agents, and preview for workflow and external agents.

Telemetry follows the **OpenTelemetry GenAI semantic conventions**, with spans for `invoke_agent`, `execute_tool` and `plan`. Note that those conventions are themselves at development status and may change.

**Two corrections to widely circulated guidance.** The content-recording variable is now `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT`, defaulting to false, and Microsoft says to enable it **only in development**. The older variable name appears only on classic pages ([client-side tracing](https://learn.microsoft.com/en-us/azure/foundry/observability/how-to/trace-agent-client-side)).

And a dated change to put in a calendar: from **30 September 2026**, sensitive GenAI trace attributes move to a dedicated `AppGenAIContent` table gated by a privileged role, and stop flowing to the tables most dashboards read today ([sensitive trace content](https://learn.microsoft.com/en-us/azure/foundry/observability/how-to/traces-sensitive-content)).

One structural limitation to state when comparing platforms: **there are no agent-, thread- or run-scoped Azure Monitor platform metrics.** Agent-level operational data comes from Application Insights traces, not from metrics.

## 7. Evaluation

This is the strongest evaluation surface of the four platforms, and the place where the SDK split trips people up. `azure-ai-evaluation` is now the **local and classic** path; the current cloud path uses `azure-ai-projects` with the OpenAI evals surface ([cloud evaluation](https://learn.microsoft.com/en-us/azure/foundry/observability/how-to/cloud-evaluation)).

Agent-specific evaluators go well beyond the usual three ([agent evaluators](https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/agent-evaluators)): intent resolution, task adherence, task completion, tool call accuracy, tool selection, tool input accuracy, tool output utilisation, tool call success, and task navigation efficiency with exact, in-order and any-order matching modes. Two risk evaluators are **agents only**: prohibited actions and sensitive data leakage.

The **AI Red Teaming Agent** is built on PyRIT plus the risk and safety evaluators, reporting an attack success rate, with 24 attack strategies including multi-turn and crescendo ([red teaming agent](https://learn.microsoft.com/en-us/azure/foundry/concepts/ai-red-teaming-agent)). Microsoft recommends running it against a production-like non-production environment. **Do not describe it as generally available**; see the note below.

Continuous evaluation samples live traffic as it happens, distinct from scheduled evaluation on a fixed cadence, defaulting to 100 runs per hour. For release gating there is a **GitHub Action** and an **Azure DevOps task**, both preview, which compare an agent against a baseline agent with confidence intervals ([GitHub Action](https://learn.microsoft.com/en-us/azure/foundry/how-to/evaluation-github-action)).

## 8. Posture and threat protection

**The biggest 2026 change:** effective **1 July 2026**, AI agent security for Foundry and Copilot Studio agents **requires a Microsoft Agent 365 licence** and is no longer covered by Defender for Cloud Apps or Defender for Cloud ([transition notice](https://learn.microsoft.com/en-us/defender-xdr/security-for-ai/transition-agent-security-to-agent-365)). Defender CSPM still discovers Foundry accounts and projects, and Defender for AI Services still covers Foundry models. Agent-specific alerts in that plan are being deprecated.

**Defender for AI Services is generally available** and works with Prompt Shields to alert on data leakage, poisoning, jailbreak and credential theft. It is text-only and commercial-clouds-only ([AI threat protection](https://learn.microsoft.com/en-us/azure/defender-for-cloud/ai-threat-protection)). A setting worth knowing: with user prompt evidence disabled, Defender still analyses prompts but **masks the content in alerts**, which is often the right trade.

The agent-level recommendations, all preview, read like a ready-made checklist and are worth lifting wholesale ([AI recommendations](https://learn.microsoft.com/en-us/azure/defender-for-cloud/recommendations-reference-ai)), for instance requiring human-in-the-loop control for MCP tool actions on agents with indirect prompt injection risk, and requiring an allowed-tools list on MCP tools.

## 9. Cost, lifecycle and org policy

The **Foundry Control Plane**, reached through *Operate*, is the new governance surface and is mostly preview. Its agent fleet inventory discovers Foundry agents, Azure SRE Agent, Logic Apps agent loops and manually registered custom agents, and supports start, stop, block and unblock ([manage agents](https://learn.microsoft.com/en-us/azure/foundry/control-plane/how-to-manage-agents)).

Its "guardrail policies" are a user interface over **Azure Policy**, not a separate engine, so deleting one in the portal removes the underlying policy assignment.

**Model deployment allowlisting exists as a built-in policy**: *Foundry model deployments should only use approved models*, with Audit, **Deny** and Disabled effects and parameters for allowed publishers and asset IDs ([model deployment policy](https://learn.microsoft.com/en-us/azure/foundry/how-to/model-deployment-policy)). Two gotchas: matching is by **prefix**, so an ID without a trailing slash also matches longer model names, and enforcement is at deployment time rather than by hiding models from the catalogue.

Other built-ins worth assigning: key access disabled, restrict network access, use Private Link, encrypt with a customer-managed key, and use a managed identity.

An honest limitation for anyone mapping to a compliance framework: across ten built-in compliance initiatives, **only five distinct Foundry policies appear**, and **none of the model-deployment or content-filtering policies are mapped into any initiative** ([security controls policy](https://learn.microsoft.com/en-us/azure/ai-services/security-controls-policy)). The security baseline also notes that the built-in policies are not enabled by default.

One underused control: preview features can be suppressed tenant-wide with the Azure tag `AZML_DISABLE_PREVIEW_FEATURE` set to `true`, or removed per role with `notDataActions` ([disable preview features](https://learn.microsoft.com/en-us/azure/foundry/how-to/disable-preview-features)).

---

## What we could not verify

1. **The AI Red Teaming Agent's status.** The general-availability table has a row saying red teaming is GA, but that row links to a page about *manual* red-teaming process guidance which never mentions the agent. The local how-to explicitly says preview, and the portal feature is labelled preview. Teach it as preview.
2. **Whether AI security posture management is generally available.** No Defender page says so; it is only inferable from the absence of a preview tag.
3. **A retention period for abuse-monitoring data.** The often-quoted 30 days appears in forum answers, not in the documentation.
4. **The status of *Foundry model deployments should meet eligibility requirements*.** The how-to calls it generally available; the policy index still prefixes it with preview.
5. **What the projects-level `Trace` diagnostic category actually emits**, and whether it overlaps Application Insights traces.
6. **Whether the AI Landing Zone accelerator ships Azure Policy assignments.** Neither the repository nor its documentation has a governance section.
