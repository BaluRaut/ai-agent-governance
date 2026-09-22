# Amazon Bedrock and Bedrock AgentCore

**Verified against docs.aws.amazon.com on 22 September 2026.** Every claim was checked against a live page, linked inline. See [What we could not verify](#what-we-could-not-verify) at the end.

## Six things most existing material gets wrong

Start here. If you learned this platform before 2026, most of what follows will be new, and several of these are load-bearing.

1. **There are two inference endpoints, not one.** `bedrock-runtime` and `bedrock-mantle`. **Guardrails are not supported on `bedrock-mantle`**, and neither is model invocation logging ([endpoints](https://docs.aws.amazon.com/bedrock/latest/userguide/endpoints.html)).
2. **Model access is on by default.** Denying `aws-marketplace:Subscribe` does *not* block a first invocation, because Bedrock initiates the subscription in the background. Only a Deny on `bedrock:InvokeModel` actually blocks ([model access](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)).
3. **Guardrails can now be enforced org-wide**, through a distinct AWS Organizations policy type called `BEDROCK_POLICY`, and up to three guardrails can union on one request.
4. **Automated Reasoning checks are generally available and detect-only.** They return findings; they never block.
5. **Guardrails do not cover the whole agent loop.** Content and sensitive-information filters skip `toolUse.input`, `toolResult` and `toolSpec`, and PII masking does not reach model invocation logs.
6. **Agent evaluation and tool permissions are no longer gaps.** AgentCore Evaluations and AgentCore Policy are both generally available.

## Status at a glance

AgentCore reached general availability on **13 October 2025** ([GA announcement](https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-agentcore-is-now-generally-available/)), covering Runtime, Gateway, Identity, Memory, Observability, Browser and Code Interpreter. Since then, from the [release notes](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/release-notes.html):

| Component | Status | When |
|---|---|---|
| Policy | Generally available | March 2026 |
| Evaluations | Generally available | March 2026 |
| Harness, with lifecycle hooks | Generally available | July 2026, hooks September 2026 |
| AWS Agent Registry | Generally available | August 2026 |
| Payments | Generally available | August 2026 |
| AgentCore insights (failure, intent, trajectory) | Public preview | July 2026 |
| Dataset evaluation, Web Bot Auth, managed session storage | Public preview | various |

AgentCore's own compliance page lists HIPAA eligibility, FedRAMP, SOC 2 and the ISO 27001 family ([compliance validation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/compliance-validation.html)). The equivalent Bedrock page lists no programmes at all, which is worth noticing rather than assuming parity.

---

## 1. Identity

**AgentCore Identity** treats agents as workload identities ([identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html)).

Inbound authentication is chosen at creation and cannot be changed: either IAM SigV4, or OAuth and JWT. The JWT configuration validates a discovery URL, allowed audiences, allowed clients, allowed scopes, and **required custom claims** with `EQUALS`, `CONTAINS` or `CONTAINS_ANY` matching ([inbound JWT authorizer](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/inbound-jwt-authorizer.html)). Any OAuth 2.0 provider works.

Outbound authentication uses credential providers and a token vault, with on-behalf-of token exchange, private key JWT client authentication, and the option to reference your own Secrets Manager secret ARNs so key rotation stays under your control.

**The single most important warning on this platform is in the runtime permissions page.** The managed policy `BedrockAgentCoreFullAccess` grants `GetWorkloadAccessTokenForUserId`, *which allows issuing workload access tokens using caller-supplied user identifier strings without verifying an identity-provider token*. AWS recommends production roles **explicitly deny** that action and grant only `GetWorkloadAccessTokenForJWT`. The same page states that policies created by the AgentCore CLI are for development and are not suitable for production ([runtime permissions](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-permissions.html)).

## 2. Authorization

Resource-based policies are supported on Agent Runtime, endpoints, Gateway and Memory. Two traps: `"Resource": "*"` is rejected outright, and **cross-account runtime access needs policies on both the runtime and the endpoint** ([resource-based policies](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/resource-based-policies.html)).

The IAM condition keys are where org-level authorization becomes real ([service with IAM](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/security_iam_service-with-iam.html)):

| Condition key | Lets you require |
|---|---|
| `bedrock-agentcore:Subnets`, `:SecurityGroups` | Deployment into approved VPC subnets only |
| `bedrock-agentcore:RuntimeAuthorizerType` | A specific inbound auth mechanism |
| `aws:VpceOrgID` | Access only through org-owned VPC endpoints |
| `bedrock-agentcore:InboundJwtClaim/*` | Specific issuer, subject, audience, scope or client |

## 3. Input and output controls: Guardrails

One guardrail resource carries six policy types ([components](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-components.html)):

- **Content filters** over `HATE`, `INSULTS`, `SEXUAL`, `VIOLENCE`, `MISCONDUCT` and `PROMPT_ATTACK`, each with independent input and output strength, and an action of block or detect-only. Modalities include `IMAGE` as well as `TEXT`.
- **Denied topics**, up to 30 per guardrail.
- **Word filters**, including a managed profanity list.
- **Sensitive information filters** over 35 built-in types, with actions `BLOCK`, `ANONYMIZE` or `NONE`, plus custom regular expressions with no lookaround support.
- **Contextual grounding checks** on two metrics, grounding and relevance, thresholds from 0 to 0.99. **Output only**; it never evaluates the prompt ([contextual grounding](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-contextual-grounding-check.html)).
- **Automated Reasoning checks**, now generally available, which translate a source document into formal logic and check claims against it. **Detect mode only**, English only, no streaming ([automated reasoning](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-automated-reasoning-checks.html)).

Two gaps that change your architecture, both on the [sensitive filters page](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-sensitive-filters.html): filters **do not evaluate tool-use fields**, and **masking does not apply to model invocation logs**, where the input field always contains the original unmodified request.

`ApplyGuardrail` is an independent API, so the same guardrail can protect a self-hosted or third-party model ([independent API](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-independent-api.html)).

Infrastructure as code: CloudFormation `AWS::Bedrock::Guardrail` and `AWS::Bedrock::GuardrailVersion`; Terraform `aws_bedrock_guardrail` and `aws_bedrock_guardrail_version`.

## 4. Action controls

Four layers, and knowing which to reach for is most of the skill.

**AgentCore Policy** is the flagship. It intercepts *all* agent traffic through a Gateway and evaluates each request before tool access is allowed. Policies are written in **Cedar** or **Dogwood**, or authored in natural language and compiled to Cedar, with automated reasoning used to detect policies that are overly permissive, overly restrictive or unsatisfiable *before* they are enforced. It controls both which tools may be called and **what parameter values are permitted**, keyed on user identity ([policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html)).

Two features are worth the price of admission. **Temporal policies** reason over prior actions in the same session, so you can require that an approval was granted before a transfer, block an action after it has run a set number of times, or keep a running total under a budget. And Guardrails can run inside Policy at the gateway layer, **where the agent cannot reason around them** ([gateway guardrails](https://aws.amazon.com/about-aws/whats-new/2026/06/amazon-bedrock-agentcore-policy-guardrails-generally-available/)).

**Classic Bedrock Agents** offer per-function confirmation: set `requireConfirmation: ENABLED` and `InvokeAgent` returns control to your application for a confirm or deny. The default is disabled ([user confirmation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-userconfirmation.html)). Note the direction of travel before you build on this: Bedrock Agents was renamed **Agents Classic** and **closed to new customers on 30 July 2026** ([maintenance mode](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-classic-maintenance-mode.html)). AWS points new work at AgentCore.

**`InvokeGuardrailChecks`**, added in June 2026, applies individual safeguards at any step of an agent loop without a guardrail resource, returning severity and confidence so you can enforce your own way ([announcement](https://aws.amazon.com/about-aws/whats-new/2026/06/amazon-bedrock-guardrails-api-ai/)).

**Harness lifecycle hooks** are the cleanest programmatic gate: hooks at `before_invocation`, `before_tool_call`, `after_tool_call` and `after_invocation`, where a Lambda returns a synchronous **allow or deny** ([harness](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness.html)).

**Gateway** adds fine-grained control at gateway, tool, operation and parameter level, with interceptors that run before the target call. AWS's own stated best practice: design interceptors to **deny by default** when authorization cannot be determined ([fine-grained access control](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-fine-grained-access-control.html)).

## 5. Data boundary

The baseline is stronger than most people assume. Bedrock uses a **zero operator access** model, in which no operator of the service can access model input or output, and a **zero data retention** default, in which inputs and outputs are not stored ([abuse detection](https://docs.aws.amazon.com/bedrock/latest/userguide/abuse-detection.html)). Model providers cannot reach your data, because inference runs in Bedrock-owned model deployment accounts ([data protection](https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html)).

The exceptions are named per model family, and this is the part to read rather than assume. For some families only classifier-flagged traffic is retained; for others all traffic is retained for up to 30 days, with human review by AWS. Retained data is not shared with third-party model providers.

Retention is now **configurable**, with modes `none`, `default`, `aws_review` and the legacy `provider_data_share`, resolved project then account then model default. If your effective mode is below a model's minimum, that model becomes unavailable rather than silently downgrading your posture ([data retention](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html)). Two condition keys, `bedrock:DataRetentionMode` and `bedrock-mantle:DataRetentionMode`, let a service control policy enforce this across an organisation. That is arguably the most consequential new governance control on the platform.

Customer-managed keys cover model customisation, agents, knowledge base ingestion, evaluation jobs and guardrails ([data encryption](https://docs.aws.amazon.com/bedrock/latest/userguide/data-encryption.html)). PrivateLink endpoints exist for Bedrock, the runtime, mantle, the agent APIs and FIPS variants, and **endpoint policies are supported** ([VPC endpoints](https://docs.aws.amazon.com/bedrock/latest/userguide/vpc-interface-endpoints.html)). AgentCore Runtime gives each agent session its own microVM.

## 6. Observability

Three sources, and the distinction matters when you are asked what you can prove.

**CloudTrail** records API calls but not content. Note the classification subtlety: `InvokeModel` and `Converse` are **management events**, on by default, while `InvokeAgent`, `Retrieve` and `ApplyGuardrail` are **data events**, off by default and separately billed ([CloudTrail](https://docs.aws.amazon.com/bedrock/latest/userguide/logging-using-cloudtrail.html)). When several guardrails evaluate one request, the event does not identify which produced each assessment.

**Model invocation logging** carries the content, is disabled by default, and is not available on `bedrock-mantle` ([model invocation logging](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html)). Remember from section 3 that guardrail-blocked content appears here in plain text; CloudWatch Logs data protection is the mitigation.

**AgentCore Observability** emits OpenTelemetry-compatible telemetry into CloudWatch ([observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html)). Two setup facts save an afternoon: you must enable **CloudWatch Transaction Search** once as a prerequisite, and the **ADOT Collector is not supported** for agent observability, only the SDK or the Lambda layer.

## 7. Evaluation

**Bedrock evaluations** cover programmatic scoring, human workers, a judge model, and retrieval-augmented generation, with built-in metrics named `Builtin.Correctness`, `Builtin.Faithfulness`, `Builtin.Harmfulness` and so on ([evaluation](https://docs.aws.amazon.com/bedrock/latest/userguide/evaluation.html)). Two naming traps: there is **no metric called groundedness** here, the equivalent is faithfulness; and harmfulness, stereotyping and refusal are scored so that higher is worse.

**AgentCore Evaluations** is the agent-specific one, and it is the more interesting. It runs **online**, sampling a configurable percentage of live production traces, as well as on demand, in batch, over a dataset, or against a simulated user. Evaluators can be built in, drawn from the DeepEval and AutoEval open-source libraries, custom judge models, or **custom code in Lambda** for deterministic checks. Levels are `TOOL_CALL`, `TRACE` and `SESSION` ([evaluators](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluators.html)).

Trajectory evaluation is built in and needs no model: `Builtin.TrajectoryExactOrderMatch`, `TrajectoryInOrderMatch` and `TrajectoryAnyOrderMatch` compare the actual tool sequence against an expected one ([ground truth evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/ground-truth-evaluations.html)). That is exercise 05's gate, as a managed service.

**There is no first-party red-teaming product.** What exists is guidance in the [Well-Architected Agentic AI Lens](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp05.html) and permission to test AgentCore under the [penetration testing policy](https://aws.amazon.com/security/penetration-testing/). Say this plainly when comparing platforms, because Azure does ship one.

## 8. Cost and quota

**There is no dollar-denominated spend cap anywhere in Bedrock or AgentCore.** The cost management FAQ goes as far as saying that requiring every call to be tagged is not possible from the Bedrock side ([cost management FAQ](https://docs.aws.amazon.com/bedrock/latest/userguide/cost-mgmt-faq.html)). What you get instead:

- **Quotas**, including `Model invocation max tokens per day`, which is the closest thing to a ceiling. Note that `bedrock-runtime` and `bedrock-mantle` have **separate quota pools** even for the same model ([quotas](https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html)).
- **Harness limits**, under a heading that says plainly *set hard caps so a runaway agent can't burn through resources*: `maxIterations` defaulting to 75, `timeoutSeconds` to 3600, and an optional `maxTokens` ([harness operations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-operations.html)).
- **Gateway rate limits**, scoped by JWT claim, IAM principal, target or tool, enforced on requests, tokens or connections. A rate of zero is an explicit block, which makes this the emergency lever for isolating one caller.
- **Five separate cost attribution mechanisms**, which is four more than most teams expect: IAM principal attribution, application inference profiles, projects, workspaces and per-request metadata ([cost management](https://docs.aws.amazon.com/bedrock/latest/userguide/cost-management.html)).

## 9. Lifecycle and org policy

**AWS Organizations now has a `BEDROCK_POLICY` policy type**, distinct from a service control policy, which enforces a named guardrail across a root, an organisational unit or an account ([Bedrock policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_bedrock.html)).

The setting that closes the obvious hole is `selective_content_guarding`. Set to `comprehensive`, which is the default, everything is evaluated regardless of what the caller tagged, so an application cannot tag-scope its way out of a guardrail. Where organisation, account and request guardrails all apply, **all three are enforced and the effect is a union, with the most restrictive control winning** ([guardrail enforcements](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-enforcements.html)).

Four traps on that page are worth writing into your runbook: a **numeric guardrail version** is required, because DRAFT is mutable; a resource-based policy granting `bedrock:ApplyGuardrail` is mandatory; **an Automated Reasoning policy must not be included**, as it causes runtime failures; and **an invalid guardrail ARN makes every Bedrock call in the target organisation fail**.

The **AWS Agent Registry** is the inventory: a governed catalogue of agents, tools, skills and MCP servers, with approval workflows, automatic detection of AgentCore runtimes and gateways across Organizations member accounts, customer-managed key encryption and cross-account sharing through Resource Access Manager ([registry GA](https://aws.amazon.com/about-aws/whats-new/2026/08/aws-agent-registry-generally-available/)).

---

## What we could not verify

1. **AgentCore PrivateLink service-name strings.** These came from a search summary rather than a successful direct fetch. Re-check before putting them in a template.
2. **AgentCore payments GA status.** Preview in May 2026, features added through August, no GA announcement found.
3. **Which harm categories support the `IMAGE` modality.** The API accepts it; the coverage per category is not stated.
4. **Whether AWS Security Agent covers prompt injection and jailbreaking.** The Well-Architected lens asserts it; the product page does not mention it.
5. **Provisioned throughput commitment terms.** Two AWS pages disagree, one saying one or six months, the other one or three. Do not quote either until reconciled.
6. **The direction of `AWS_GENAI_CONTENT_EXTRACTION_OPT_OUT`.** The documented description reads counter-intuitively for a flag with that name. Test it before relying on it as a privacy control.
