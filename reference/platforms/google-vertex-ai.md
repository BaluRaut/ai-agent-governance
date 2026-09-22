# Google Cloud: Gemini Enterprise Agent Platform, formerly Vertex AI

**Verified against docs.cloud.google.com on 22 September 2026.** Every claim was checked against a live page, linked inline. See [What we could not verify](#what-we-could-not-verify) at the end.

## The rename, and the one thing it did not change

On **22 April 2026** Vertex AI was renamed. This invalidates the names in almost all existing material ([name changes](https://docs.cloud.google.com/gemini-enterprise-agent-platform/vertex-ai-name-changes)).

| Was | Is now |
|---|---|
| Vertex AI Platform | **Gemini Enterprise Agent Platform** |
| Vertex AI Agent Engine | **Agent Runtime** |
| Vertex AI Studio | Agent Studio |
| Vertex AI Search | Agent Search |
| Gen AI evaluation service | Agent Platform Evals |

**The machine-readable identifiers did not change.** The service is still `aiplatform.googleapis.com`, roles are still `roles/aiplatform.*`, organisation policy constraints are still `constraints/vertexai.*`, and an agent is still a `reasoningEngines` resource. So your Terraform keeps working and your documentation is wrong, which is the more confusing order for that to happen in.

The documentation domain also moved: `cloud.google.com` now redirects to `docs.cloud.google.com`.

---

## 1. Identity

**Agent Identity** is the most interesting identity design of the four platforms, because it is built on SPIFFE rather than on service accounts. Each agent gets a cryptographic identity with an auto-provisioned X.509 certificate, and a principal that looks like this ([agent identity](https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/agent-identity)):

```
principal://agents.global.org-ORG_ID.system.id.goog/resources/aiplatform/projects/PROJECT_NUMBER/locations/LOCATION/reasoningEngines/AGENT_ID
```

Google's stated reason for not using service accounts is worth quoting, because it is the argument for agent identity generally: agent identities *are not shared by multiple workloads by default, can't be impersonated, and don't allow developers to generate long-lived service account keys*, and access tokens are **cryptographically bound to the agent's certificate to prevent token theft** ([overview](https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/agent-identity-overview)).

Credentials are protected by a managed Context-Aware Access policy enforcing mutual TLS binding and DPoP, which makes a stolen token unusable elsewhere.

**Two operational facts that will bite you.**

Redeployment creates a **new** `reasoningEngines` resource with a new principal, and **prior IAM grants are not inherited**. Read `spec.effectiveIdentity` after deploying and re-bind, or grant the baseline roles to a project-wide `principalSet` instead of to individual agents.

Bulk grants use `principalSet`, which is how you keep that manageable:

```
principalSet://agents.global.org-ORG_ID.system.id.goog/attribute.platformContainer/aiplatform/projects/PROJECT_NUMBER
```

Deny policies and Principal Access Boundary policies both work against agent identities, so the negative side of authorization is available too.

## 2. Authorization

Beyond ordinary IAM, two features stand out.

**IAM conditions can isolate per-user data**, which is unusually specific and very useful. Sessions expose `aiplatform.googleapis.com/sessionUserId` and Memory Bank exposes `aiplatform.googleapis.com/memoryScope`, so a condition can let a user read only their own sessions or memories ([session conditions](https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/sessions/iam-conditions)).

**IAM Unified Access Policies** hold allow and deny effects in one policy, with CEL conditions on tool names and paths, enforced by Identity-Aware Proxy at the gateway, and supporting a dry-run mode before enforcement ([unified access policies](https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/policies/iam-overview-uap)). Note the prerequisite: you must turn off enforcement of `constraints/iam.managed.disableAccessPolicyBinding`, which is enabled by default for new organisations.

## 3. Input and output controls: Model Armor

**Model Armor** is generally available and separate from the model's own filters ([overview](https://docs.cloud.google.com/security-command-center/docs/model-armor-overview)). It detects responsible AI categories, **prompt injection and jailbreak**, sensitive data through Sensitive Data Protection, and **malicious URLs**. Child sexual abuse material filtering is applied by default and cannot be turned off.

The deployment model is the part to understand, because it is the best org-level answer of the four platforms:

- **Templates** are per-request, referenced by `model_armor_config` on a `generateContent` call.
- **Floor settings** apply at organisation, folder or project level and define a **minimum** every template in scope must meet. Templates may be stricter, never weaker.

That floor-setting idea is genuinely good design. It is how you stop a team configuring their way below the baseline without needing to review every template.

```bash
gcloud model-armor floorsettings update \
  --full-uri=projects/PROJECT_ID/locations/global/floorSetting \
  --add-integrated-services=VERTEX_AI \
  --vertex-ai-enforcement-type=INSPECT_AND_BLOCK
```

Terraform has `google_model_armor_template` and `google_model_armor_floorsetting`.

**Two documented failure modes.** Sanitisation *may be skipped if Model Armor is unavailable or unreachable*, which is fail-open, and a template-not-found error occurs if a request is routed to a region where the template does not exist. Create your templates in every region you serve from.

**Filter versions are now a governance surface.** Versions run v1 to v4 with `Latest`, `Stable` and `Legacy` aliases, and **v1 and v2 retire on 17 December 2026** ([release notes](https://docs.cloud.google.com/model-armor/release-notes)). Anything pinned to those needs migrating.

### The Gemini filter trap

Gemini's own configurable safety filters cover only four categories, and two facts about them matter more than the categories do ([configure safety filters](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-filters)):

- **On newer Gemini models the default threshold is `OFF`.** Configurable filters ship off. If your safety story is "the model has filters", check what they are set to.
- Configurable filters are **available for response filtering only, not prompt filtering**.

Together those mean the built-in filters are not a control you can rely on without explicit configuration, and Model Armor is doing the work on the input side.

## 4. Action controls

Google now has four layers, and this is the strongest tool-permission story of the four platforms.

**Agent Gateway and Agent Registry** are the network layer. The gateway is the entry and exit point for all agent traffic, in both directions: which clients may reach your agents, and what your agents may reach. The registry is the allowlist of approved destinations, and the default is the right one: **all connections are blocked unless an explicit IAM policy grants access** ([agent gateway](https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/gateways/agent-gateway-overview)).

A trap worth putting in your runbook: both `agent_gateway_config` and `identity_type=AGENT_IDENTITY` are required for gateway-mediated features, **both are immutable**, and an agent deployed without them must be re-created rather than patched. Without agent identity, semantic governance policies silently filter the agent out of the selector, so the control appears not to exist rather than appearing to fail.

**Semantic Governance Policies**, in preview, are the novel control. After the model proposes a tool call and **before it executes**, a managed engine in your own network checks the call against the original user intent and against **natural language constraints** written in plain English. Both checks must pass. Google's own examples: disallow automated refunds above a threshold, and block a `send_email` call when the user only asked to summarise their calendar ([semantic governance](https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/policies/semantic-governance-overview)).

That second example is the indirect prompt injection case from exercise 03, caught at the point of action rather than the point of input. It is the closest thing any platform currently offers to the untrusted-origin policy you wrote in exercise 02.

**In the Agent Development Kit**, callbacks and plugins are the in-process layer. Returning a dictionary from `before_tool_callback` **skips the tool and uses your return value as its result**, which is the block mechanism ([callbacks](https://adk.dev/callbacks/)). Plugins are the global equivalent and run before agent callbacks. Google ships guardrail plugins for Model Armor, personal data redaction, and a Gemini-as-judge screen.

**Human approval** is first class in the kit:

```python
FunctionTool(reimburse, require_confirmation=True)
FunctionTool(reimburse, require_confirmation=threshold_fn)
```

The dynamic form is the one to reach for, because it lets the threshold be the control rather than the tool.

## 5. Data boundary

**Training restriction**, verbatim: *Google won't use your data to train or fine-tune any AI/ML models without your prior permission or instruction*, applying to all managed models including pre-release ones ([data governance](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance)).

**Residency turns on which endpoint you call**, and this is the most misunderstood thing on the platform. Data at rest stays in the chosen location. Processing does not: **global endpoints route and process data anywhere globally and provide no data residency guarantees** ([data residency](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/data-residency)). Locational and jurisdictional multi-region endpoints are what give you a boundary.

**Zero data retention takes six separate actions**, not one, which is worth laying out because teams routinely do one and assume the rest:

| What retains data | What to do |
|---|---|
| Abuse monitoring, up to 90 days, **not encrypted with your key** | Request an opt-out. Customers on a Master Agreement are exempt by default |
| Advanced AI models, prompts and responses up to 30 days | Zero retention may not be possible with some of these features at all |
| Grounding with Google Search, 3 days | Cannot be disabled; use Web Grounding for Enterprise instead |
| Grounding with Google Maps, 30 days | Cannot be disabled; avoid the feature |
| Request-response logging to BigQuery | Off by default; leave it off |
| The Interactions API `store` field | **Defaults to true for all models.** Set it to false |

That last row is the one people miss.

**Customer-managed keys** cover Agent Runtime and sandboxes, including agent source, container images and running instances. They do **not** cover Memory Bank or Sessions configured on the **global** endpoint, because the global region has no physical geographic boundary ([CMEK](https://docs.cloud.google.com/gemini-enterprise-agent-platform/machine-learning/general/cmek)). Abuse-monitoring logs are explicitly not covered either.

## 6. Observability

Tracing is OpenTelemetry-based into Cloud Trace, enabled with environment variables at deploy time. The privacy lever is explicit and separate: `GOOGLE_CLOUD_AGENT_ENGINE_ENABLE_TELEMETRY` turns on traces without content, and `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT` is what adds prompts, responses and user identifiers ([tracing](https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/tracing)).

When an agent acts for a person, **the logs show both identities**, which is exactly what the identity family asks for.

**An honest gap in the audit logs.** The audited-operations table for `aiplatform.googleapis.com` covers sessions, memories, sandboxes and retrieval, but **`generateContent` and `reasoningEngines.query` do not appear in it** ([audit logging](https://docs.cloud.google.com/vertex-ai/docs/general/audit-logging)). Agent invocation and model inference come to you through Cloud Logging and OpenTelemetry traces, not through Cloud Audit Logs. If your control narrative says "audit logs cover agent activity", check which log you mean.

**Agent Anomaly Detection** is worth knowing about because it maps directly to the OWASP agentic list: it reasons over your traces for tool misuse (ASI02), identity and privilege abuse (ASI03), cascading failures (ASI08), rogue agents (ASI10) and resource exhaustion ([anomaly detection](https://docs.cloud.google.com/gemini-enterprise-agent-platform/agent-anomalies-overview)). Access is by request form.

## 7. Evaluation

Two SDK surfaces with opposite launch stages, which is the thing to get right: the new `client.evals` surface is **preview**, and the legacy `EvalTask` module is **generally available but frozen** and does not support newer methods such as adaptive rubrics ([evaluation overview](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/evaluation-overview)).

Trajectory evaluation exists in two generations. The computation-based metrics are `trajectory_exact_match`, `trajectory_in_order_match`, `trajectory_any_order_match`, `trajectory_precision`, `trajectory_recall` and `trajectory_single_tool_use`. The current rubric-based agent metrics are final response quality, tool use quality, hallucination, safety, and three multi-turn variants including **trajectory quality**, which judges whether the reasoning path was logical and efficient rather than merely correct.

**A privilege escalation warning you should act on**, quoted from the docs: online evaluation relies on a project-level service account, and *any user with permissions to create an `OnlineEvaluator` can attach it to any agent within the same project*, so creation should be restricted to authorised administrators ([online evaluation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/optimize/evaluation/evaluate-online)).

**There is no self-serve red-teaming product.** Say this plainly when comparing platforms. Mandiant AI red teaming is a human consulting engagement, and the "virtual red teaming" in Security Command Center is cloud infrastructure attack-path simulation against a digital twin, which never sends an adversarial prompt to a model. The nearest self-serve substitute is scenario generation plus user simulation scored with the safety and hallucination metrics, with the adversarial cases written by you. Note also that the Agent Development Kit ships exactly three user-simulation personas, expert, novice and evaluator, and **none of them is adversarial**.

## 8. Cost and quota

**Gemini quota is tokens per minute at the organisation level**, in tiers derived from rolling 30-day spend, and **there is no separate requests-per-minute limit per tier**. The tier is not settable; it follows spend ([standard pay as you go](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/standard-paygo)). A 429 under this model does not mean a fixed quota was hit, it means temporary contention.

Agent-specific quotas are lower than people expect and are the real constraint: **90 queries per minute** and **10 concurrent queries** per project per region on Agent Runtime.

**Spend caps now exist, and this is new.** Spend cap budgets entered preview on 27 July 2026, and Gemini Enterprise Agent Platform is eligible. When usage exceeds 100% of the budget, **all new usage for that service in that project is blocked, including usage covered by committed use discounts and provisioned throughput**, and the block is reversed only when a person lifts it manually ([spend caps](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps)). That is a genuine hard cap, which Bedrock still does not have.

Limitations to know: one project and one service per cap, monthly period only, and no folder or organisation scope.

**Labels for cost attribution have a trap.** Per-request labels on `generateContent` are real and reach billing, but **requests using provisioned throughput silently ignore them** ([labels](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/add-labels-to-api-calls)). Silently is the problem: your attribution will look complete and be wrong.

## 9. Org policy

**Model allowlisting exists and works**, through `constraints/vertexai.allowedModels` for everything and `constraints/vertexai.allowedGenAIModels` for Google models specifically ([control model access](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/control-model-access)). Values take the form `publishers/PUBLISHER/models/MODEL:ACTION` with actions of predict, deploy or tune. Each model must be listed individually; you cannot allow or deny a group. An explicit deny beats an explicit allow.

Note the scope: it applies to Model Garden, and it does not apply to models registered in Model Registry.

One constraint has a default that surprises people in a good way: `constraints/vertexai.allowedPartnerModelFeatures` **blocks all partner model advanced features by default**, so third-party model web search is off until you allow it.

**Region restriction has a serious carve-out**, and this one deserves a warning in any design review. From the supported services page: resource location constraints **do not apply to Model Garden publisher models**, and location restrictions are enforced in Agent Studio but **not enforced in the Gen AI SDKs or the REST API**. For generative AI the working control is `constraints/gcp.restrictEndpointUsage`, denying specific locational endpoints, rather than `gcp.resourceLocations`.

**Custom organisation policy constraints do not reach agents.** There is no `ReasoningEngine` resource type and no hook for `generateContent`, and none for Model Armor, Agent Registry or Agent Gateway. Custom constraints govern resource creation, not agent deployment or inference.

**Access Transparency and Access Approval** are both generally available for the platform including Agent Runtime, with Access Approval supporting customer-supplied signing keys. Neither is available for Agent Registry configurations.

---

## What we could not verify

1. **The launch stage of Agent Identity.** A release note says generally available and the overview page carries no preview banner, but another page labels it preview and the standalone API is preview. The documentation genuinely conflicts.
2. **The roles `roles/aiplatform.agentContextEditor` and `agentDefaultAccess`.** Documented only on the agent identity page, absent from the IAM roles reference.
3. **Whether the Model Armor inline integration with Gemini is generally available.** Preview in July 2025, no GA note found, no preview banner today.
4. **Whether `generateContent` or `reasoningEngines.query` are audited at all.** Verified absent from the audited-operations table; whether they appear under another name is unconfirmed.
5. **Any API, command-line or Terraform surface for spend cap budgets.** The documentation shows console only.
6. **Whether `vertexai.allowedModels` restrains a raw REST `generateContent` call**, as opposed to Model Garden actions. Given the explicit parallel warning that location constraints are not enforced on the REST API, do not assume it does.
7. **Model version names.** These churn fast. Cite the model versions page rather than pinning names.
