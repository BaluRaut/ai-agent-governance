# Microsoft Copilot and Copilot Studio

**Verified against Microsoft Learn on 22 September 2026.** Every claim below was checked against a live documentation page, linked inline. This area moves fast; re-verify before you rely on it, and see [What we could not verify](#what-we-could-not-verify) at the end.

## Read this first: three changes that invalidate older material

If you learned this platform before 2026, three things have moved.

**The product was renamed.** "Microsoft 365 Copilot is now named **Microsoft Copilot**, and Microsoft 365 Copilot Chat is now named **Microsoft Copilot Chat**", with older names surviving in licences and UI during a transition period ([manage-public-web-access](https://learn.microsoft.com/en-us/microsoft-365/copilot/manage-public-web-access)).

**There is a new control plane: Microsoft Agent 365.** It became generally available for Commercial on **1 May 2026**, is licensed per user, and is organised around observe, govern and secure ([Agent 365 overview](https://learn.microsoft.com/en-us/microsoft-agent-365/overview)).

**The agent registry moved out of Entra into Agent 365.** The Agent registry and Agent collections blades in the Entra admin center were retired on 1 May 2026, and the `agentRegistry` Graph API is being deprecated, with agents registered through it needing re-registration. Entra continues to provide the identity foundation through Agent ID ([Entra what's new](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new)).

## The product boundary that governs everything else

Two different products with two different admin surfaces get called "Copilot". Almost every governance confusion traces back to this.

| | **Microsoft Copilot** (what staff use) | **Copilot Studio** (where agents are built) |
|---|---|---|
| Primary admin centre | Microsoft 365 admin center | Power Platform admin center |
| Data controls | Purview DLP, sensitivity labels, Restricted Content Discovery | Data policies over connectors, endpoint filtering |
| Approval gate | Agents → All agents → Requests | Publish blocked by data-policy violation |
| Content safety | Built in, no admin dial | Maker-configurable moderation level |
| Cost unit | Licences and pay-as-you-go | Copilot Credits, with per-agent limits |

Agent 365 and Entra Agent ID span both.

---

## 1. Identity

**Microsoft Entra Agent ID** reached general availability in April 2026 ([Entra what's new](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new)) and is available to all Entra customers ([what is Entra Agent ID](https://learn.microsoft.com/en-us/entra/agent-id/what-is-microsoft-entra-agent-id)).

Watch the licensing seam. The platform is available to everyone, but *extending Entra security features to agents requires Microsoft Agent 365*, which is included with Microsoft 365 E7 and available as an add-on to E5, A5 and Business Premium. Conditional Access for agents additionally requires Entra ID P1 or P2 plus an Agent 365 licence per user, with licence enforcement described as coming soon ([Conditional Access for Agent ID](https://learn.microsoft.com/en-us/entra/identity/conditional-access/agent-id)).

**Four object types** make up the model ([Agent ID governance overview](https://learn.microsoft.com/en-us/entra/id-governance/agent-id-governance-overview)): an *agent identity blueprint* is a template whose policy all derived identities inherit; a *blueprint principal*; an *agent identity*, which is a first-class identity account and explicitly not a service principal, designed for scale and ephemerality ([what are agent identities](https://learn.microsoft.com/en-us/entra/agent-id/what-are-agent-identities)); and an optional *agent user*, a paired user account that can hold licences, a mailbox, a calendar and group memberships.

**Conditional Access targets a different object depending on how the agent acts.** This is the part people get wrong.

| The agent acts | The policy targets |
|---|---|
| On behalf of a user | Users and groups, because the user is the subject |
| As an application, autonomously | The agent identity |
| As a user, through its paired account | The agent's user account |

Four documented gaps are worth committing to memory, all from the [Conditional Access page](https://learn.microsoft.com/en-us/entra/identity/conditional-access/agent-id): a policy targeting *all users* does not include agent user accounts; you cannot scope such a policy by the agent user's group membership; a policy targeting an agent identity does not apply to that agent's user account; and Conditional Access does not apply at all when Security defaults are on or when the agent authenticates with an API key rather than an Entra token.

**Lifecycle** runs through access packages, with a named human **sponsor** who is accountable. If a sponsor leaves, sponsorship transfers automatically to their manager, and managing sponsorship through Lifecycle Workflows became generally available in May 2026 ([Entra what's new](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new)).

**Copilot Studio agents get identities automatically now.** Before May 2026 Copilot Studio provisioned an Azure app registration per agent; after May 2026 it creates an Entra Agent ID instead, you can no longer opt out, and all such identities descend from one tenant blueprint, `25664c89-cea5-4ab6-b924-a54fd8a19ae0`. On publish, Copilot Studio attaches API permissions to that identity for each Power Platform connector the agent uses, so an Entra admin can see what an agent can reach without opening the Power Platform admin center ([manage Entra Agent IDs](https://learn.microsoft.com/en-us/microsoft-copilot-studio/admin-use-entra-agent-identities)).

## 2. Authorization

An agent identity can hold Microsoft Graph permissions, Azure RBAC roles, Entra directory roles and app roles, and supports OAuth 2.0, MCP and A2A, in both delegated and autonomous flows ([what are agent identities](https://learn.microsoft.com/en-us/entra/agent-id/what-are-agent-identities)).

For Copilot Studio the real authorization surface is **data policies** over connectors, in the Power Platform admin center under Security → Data and privacy → Data policy. Connectors are classified Business, Non-business or Blocked, enforcement is real time, and **a violation makes the Publish button unavailable** with a downloadable report ([data loss prevention](https://learn.microsoft.com/en-us/microsoft-copilot-studio/admin-data-loss-prevention)). Since early 2025 this enforcement applies to all tenants and the exemption is gone.

The connector names are the actual policy levers:

| To stop this | Block this connector |
|---|---|
| Anonymous agents | `Chat without Microsoft Entra ID authentication in Copilot Studio` |
| Public-website knowledge | `Knowledge source with public websites and data in Copilot Studio` |
| SharePoint and OneDrive knowledge | `Knowledge source with SharePoint and OneDrive in Copilot Studio` |
| Arbitrary outbound calls | `HTTP` |
| Autonomous, event-triggered agents | `Microsoft Copilot Studio` |

Blocking a Power Platform connector also blocks the tools of any MCP server reached through it. Where an outright block is too blunt, [endpoint filtering](https://learn.microsoft.com/en-us/power-platform/admin/connector-endpoint-filtering) gives allow and deny lists for SharePoint, public websites and HTTP.

## 3. Input controls

For Microsoft Copilot, blocking prompt injection and jailbreak attempts is built in and has no admin dial ([Copilot controls: security and governance](https://learn.microsoft.com/en-us/microsoft-365/copilot/copilot-controls/security-governance)).

For Copilot Studio, moderation runs on every generative request, covers jailbreaking, prompt injection, prompt exfiltration and copyright, and **checks content twice, on the way in and again before the agent answers** ([generative answers FAQ](https://learn.microsoft.com/en-us/microsoft-copilot-studio/faqs-generative-answers)). The moderation level is configurable at three scopes: the generative answers node, the agent's generative AI settings, and an individual prompt. The default is **High** ([generative answers node](https://learn.microsoft.com/en-us/microsoft-copilot-studio/nlu-boost-node)).

One input control deserves separate mention because it addresses indirect injection specifically: a Purview DLP rule conditioned on *email received from external users* excludes inbound external mail from grounding, summarisation and citation. It is in preview ([DLP for Copilot](https://learn.microsoft.com/en-us/purview/dlp-microsoft365-copilot-location-learn-about)).

## 4. Output controls

Sensitivity labels are the main output control, and the mechanism is more specific than most summaries admit: **when a label applies encryption, the user needs the EXTRACT usage right as well as VIEW before an AI app will return the content** ([Purview for Copilot Studio](https://learn.microsoft.com/en-us/purview/ai-copilot-studio)). Responses display the highest-priority label among the sources used, and new content in Office apps inherits it.

DLP for Copilot adds four condition-and-action pairs, of which two are generally available and two in preview, at the [DLP location page](https://learn.microsoft.com/en-us/purview/dlp-microsoft365-copilot-location-learn-about). Two constraints matter in practice: DLP **cannot scan files uploaded directly into a prompt**, only typed prompt text; and policy changes take up to four hours to take effect.

For Copilot Studio the DLP location applies **only when the knowledge source is SharePoint** ([Purview for Copilot Studio](https://learn.microsoft.com/en-us/purview/ai-copilot-studio)), which is a narrower footprint than the Microsoft Copilot side and worth checking against your own knowledge sources.

Groundedness is controlled by two switches: *Allow ungrounded responses*, which when off keeps the agent inside its configured knowledge, and *Search only selected sources* per node, which pins a topic to an explicit list and does not fall back to agent-level sources ([knowledge in Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/knowledge-copilot-studio)). Neither checks whether the source is correct.

## 5. Action controls

Publishing an agent tenant-wide **requires administrator approval**, from Microsoft 365 admin center → Agents → All agents → Requests. This covers agents from Copilot Studio, Microsoft Foundry and the Microsoft 365 Agents Toolkit. Updates queue separately and users keep the previous version until approved ([agent requests](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/agent-requests)).

Per-agent actions include block and unblock, delete, assign or add an owner, and start or stop for Foundry agents ([agent actions](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/agent-actions)). Two traps live here. Blocking scope differs by platform: blocking a SharePoint or Foundry agent affects only its availability in Copilot Chat, while blocking a Copilot Studio or Agent Builder agent is broader. And admin actions from the Microsoft 365 admin center **fail silently against agents in environments with Power Platform Firewall in active enforcement**, because the request arrives from an upstream service IP; the Power Platform API is the workaround.

Copilot Studio runs an automatic **security scan before publishing** that warns when a secure default has been weakened, such as no authentication, maker-provided credentials, or sharing with the whole organisation ([security scan](https://learn.microsoft.com/en-us/microsoft-copilot-studio/security-scan)). Note what it does: it warns. It does not block. Blocking is what data policies are for.

## 6. Data boundary

Retention for Copilot is now separate from Teams chat retention, with its own locations: Microsoft Copilot experiences, Enterprise AI apps and Other AI apps ([retention policies for Copilot](https://learn.microsoft.com/en-us/purview/retention-policies-copilot)). Interactions are copied into a hidden folder in the user's Exchange mailbox, then moved to SubstrateHolds on expiry.

The single most important sentence on that page, for anyone who has to answer a deletion request honestly: *messages visible in your AI apps are not an accurate reflection of whether they are retained or permanently deleted for compliance requirements.* Verify with eDiscovery, not the interface. The documented worked example shows a delete-after-one-day policy taking up to sixteen days before the message stops returning in eDiscovery.

For oversharing, **Restricted Content Discovery** is the current control: site-level, up to 20,000 sites, it removes AI entry points from the site including the ability to create agents there, and it does not change permissions or remove content from the index ([restricted content discovery](https://learn.microsoft.com/en-us/sharepoint/restricted-content-discovery)). Restricted SharePoint Search is retiring, with new enablement blocked from **31 July 2026** ([restricted SharePoint search](https://learn.microsoft.com/en-us/sharepoint/restricted-sharepoint-search)).

Customer Lockbox is available, with two exclusions to note: Copilot Studio security audit logging and Agent 365 governance and audit events are not covered ([security and governance](https://learn.microsoft.com/en-us/microsoft-copilot-studio/security-and-governance)).

## 7. Observability

Auditing is included in **Audit (Standard)** and needs no extra configuration if auditing is on ([audit Copilot](https://learn.microsoft.com/en-us/purview/audit-copilot)). Copilot Studio and Foundry agents are covered at no additional cost; non-Microsoft AI apps are pay-as-you-go with 180-day retention.

The operation is `CopilotInteraction`. Several fields turn the audit log from a record of activity into governance evidence, and they are the ones to build your queries around:

| Field | Why it matters |
|---|---|
| `AccessedResources` | Includes `SensitivityLabelId` and **`XPIADetected`**, a flag for cross-prompt injection found in a grounding resource |
| `Messages[].JailbreakDetected` | A jailbreak attempt on the prompt |
| `AgentId`, `AgentName`, `AgentVersion` | Which agent and which version, the link to the lifecycle family |
| `ModelTransparencyDetails` | Which provider and model actually served the turn |
| `AISystemPlugin.Id` | Contains `BingWebSearch` when the answer was grounded on the public web |
| `DLPEvaluationDeferred` | A bitmask recording where DLP evaluation was skipped |

eDiscovery works off the user's mailbox; Copilot Studio items are found with the `ItemClass` property `IPM.SkypeTeams.Message.Copilot.Studio.*`. Communication Compliance has a *Detect Microsoft Copilot interactions* template, and requires pay-as-you-go billing to cover Copilot Studio data even though Microsoft Copilot data is included ([communication compliance for Copilot](https://learn.microsoft.com/en-us/purview/communication-compliance-copilot)).

## 8. Evaluation

This is the weakest family on this platform relative to the others in this repository, and the honest summary is that Microsoft's Copilot governance surface is strong on data, identity and audit, and thin on release-gating evaluation. What exists is the pre-publish security scan described under action controls, which is advisory, and the risk signals aggregated into the agent registry from Purview, Entra and Defender ([agent registry](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/agent-registry)). For Azure-hosted agents the evaluation tooling lives in Azure AI Foundry; see that page.

## 9. Cost and quota

The unit was renamed from messages to **Copilot Credits**: one credit is one interaction ([manage Copilot Credits and capacity](https://learn.microsoft.com/en-us/power-platform/admin/manage-copilot-studio-copilot-credits-capacity)).

Three layers of spend control, and the middle one is the interesting one:

- **Environment.** Prepaid pooled credits allocated per environment, or pay-as-you-go against an Azure subscription. With neither overage option enabled, the environment is hard-capped and credit-consuming experiences stop working.
- **Per agent.** A monthly credit limit per agent, with notifications as usage approaches it and a **hard stop that turns the agent off** when it is reached. This is a genuine limit rather than an alert, which is rarer than it should be.
- **Feature.** When prepaid capacity runs out, new agent flow runs are blocked while the parent agent keeps working for non-flow interactions.

For forensics, per-environment reports break spend down by agent, product, channel, model, knowledge source and tool.

## 10. Lifecycle

The **agent registry** in Microsoft 365 admin center → Agents → All Agents → Registry is the inventory. It distinguishes Microsoft, partner-built, published-by-your-org and shared agents, and surfaces tenant cards for total agents, **agents without owners**, **unmanaged agents** created outside Agent 365, and agents at risk. Risk signals aggregate from Purview, Entra and Defender, and require an E7 or Agent 365 licence ([agent registry](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/agent-registry)).

Bulk **agent management rules** are the practical governance tool ([agent settings](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/agent-settings)): reassign ownerless Agent Builder agents to the previous owner's manager, block ownerless agents without usage, apply a policy template in bulk, and reject publish requests older than a chosen number of days. Sharing controls apply only to agents built with Agent Builder.

Who can build at all is controlled by the **Copilot Author** setting in the Power Platform admin center, bound to a security group. Note that you cannot globally disable agent creation; what you can disable is publishing agents that use generative AI features ([security and governance](https://learn.microsoft.com/en-us/microsoft-copilot-studio/security-and-governance)).

**That setting does less than its name suggests, and this is the most consequential misconception on the platform.** Assigning the security group **does not revoke access from anyone who already has it**. For a person to actually lose the ability to author, three things must all be true: they are not in the group, they hold no Copilot Studio per-user or trial licence, and **they hold no Microsoft Copilot licence** ([troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/power-platform/copilot-studio/licensing/authors-access)). The third condition is the one nobody expects. An organisation that has deployed Copilot widely has, in effect, granted agent authoring widely, and the admin setting will not tell you so.

One posture note worth carrying into a risk register: on third-party MCP servers Microsoft states plainly that these are non-Microsoft products, that you connect at your own risk, and that Microsoft has no responsibility in relation to your use of them ([agent registry](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/agent-registry)).

---

## What we could not verify

Listed so you do not mistake a gap for a fact.

1. **Agent 365 policy templates** and the **agent map** pages were referenced from verified pages but not read.
2. **The exact moderation level labels** in Copilot Studio. One page says the range runs from Lowest to Highest; search summaries show Minimum, Low, Medium, High, Maximum. The default of High is verified; check the product interface before teaching the label set.
3. **Whether "Copilot Control System" was formally renamed to "Copilot controls."** A URL redirect suggests it; no announcement was found.
4. **Whether generative-answers moderation uses Azure AI Content Safety.** That service is named for prompt builder prompts specifically, not for generative answers.
5. **The preview status of automatic Entra Agent ID creation for Copilot Studio.** Entra governance docs label it preview; the Copilot Studio page describes it as the mandatory default. The documentation disagrees with itself.
6. **Microsoft Copilot pay-as-you-go spend caps.** The licensing pages were not read.
7. **A deprecation date for the Entra `agentRegistry` Graph API.** Microsoft says details will follow.
