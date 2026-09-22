# Frameworks, regulations and where your controls land

**Verified against primary sources on 22 September 2026.** Dates and obligations were checked against the legal texts and standards bodies themselves, not summaries. See [What we could not verify](#what-we-could-not-verify).

Two things most material currently gets wrong, and both matter:

1. **The EU AI Act timeline was formally amended.** Regulation (EU) 2026/1744 is in force and moved the high-risk deadlines. Anything written before August 2026 has the wrong dates.
2. **The OWASP LLM Top 10 has a 2026 edition** that reorders and renames items, and there is now a **separate agentic list**. Tooling still largely references the 2025 list.

---

## 1. The EU AI Act, as amended

**Regulation (EU) 2026/1744** of 8 July 2026, the "Digital Omnibus on AI", amends the AI Act. Published in the Official Journal on 24 July 2026, in force from **27 July 2026** ([text](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ%3AL_202601744)).

A warning for anyone checking this themselves: the Commission's own AI Act Service Desk page for Article 113 was still serving the **pre-amendment** text when we looked. Consolidated texts lag. Read the amending regulation.

### What already applies

| Obligation | Since |
|---|---|
| Prohibited practices, and the definitions and scope in Chapters I and II | 2 February 2025 |
| AI literacy, Article 4, in its amended and weaker form | 2 February 2025, replaced text from 27 July 2026 |
| General-purpose AI model obligations, Articles 53 to 55 | 2 August 2025 |
| Governance, notified bodies, penalties | 2 August 2025 |
| **Transparency obligations, Article 50** | **2 August 2026** |
| Fines for general-purpose AI model providers, Article 101 | 2 August 2026 |
| Standards, conformity assessment, registration, Articles 40 to 49 | 2 August 2026 |

### What is still ahead

| Obligation | Date |
|---|---|
| New prohibitions on non-consensual intimate imagery and child sexual abuse material | 2 December 2026 |
| Machine-readable marking for systems already on the market before August 2026 | 2 December 2026 |
| **High-risk obligations for Annex III standalone systems**, Articles 6 to 27 | **2 December 2027** |
| **High-risk obligations for Annex I product-embedded systems** | **2 August 2028** |
| General-purpose AI models placed on the market before August 2025 | 2 August 2027 |

The high-risk dates were previously 2 August 2026 and 2 August 2027. The stated reason, in recital 40, is the delayed availability of standards and the delayed establishment of national competent authorities. Note that the final text uses **fixed dates**, not the conditional standards-linked trigger that appeared in the proposal, so there is no stop-the-clock mechanism.

### Two amendments an engineer will feel

**Article 4 was weakened.** It now says providers and deployers shall *take measures to support the development of* AI literacy, and adds explicitly that the obligation *does not require providers or deployers to guarantee any specific level of AI literacy of any individual*. The previous text required them to ensure a sufficient level.

**A new Article 4a** creates a legal basis for processing special-category personal data strictly for **bias detection and correction**, extended to deployers of high-risk systems. If you have been unable to test for bias because you were not allowed to hold the attribute you needed to test against, this is the provision to read.

Also worth knowing: the new Annex XIV notified-body designation codes include **AIH 0401, covering AI systems based on emerging technologies "including Agentic AI"**. That is the first time agentic AI is named in the Act's legal text.

### Mapping to the control catalogue

| Article | Control families |
|---|---|
| 9, risk management | The whole of exercise 01 |
| 10, data governance | Data boundary |
| 12, logging | Observability |
| 13, transparency to deployers | Lifecycle |
| 14, human oversight | Action controls |
| 15, accuracy, robustness, cybersecurity | Input, output, evaluation |
| 50, transparency | Output |

---

## 2. NIST AI Risk Management Framework

**AI RMF 1.0**, NIST AI 100-1, released 26 January 2023 and still at version 1.0. NIST states it is being revised under the White House AI Action Plan; **there is no published version 2.0** ([NIST](https://www.nist.gov/itl/ai-risk-management-framework)).

Four functions, 19 categories, **72 subcategories**, which are the actual unit you map a control to:

| Function | Categories | Subcategories | In one line |
|---|---|---|---|
| GOVERN | 6 | 19 | Policies, accountability, culture, third parties |
| MAP | 5 | 18 | Context, categorisation, capabilities, impacts |
| MEASURE | 4 | 22 | Methods, trustworthiness evaluation, tracking, feedback |
| MANAGE | 4 | 13 | Prioritise, treat, manage third-party risk, recover |

**NIST AI 600-1, the Generative AI Profile**, released 26 July 2024, names twelve risks: CBRN information or capabilities, confabulation, dangerous violent or hateful content, data privacy, environmental impacts, harmful bias or homogenisation, human-AI configuration, information integrity, information security, intellectual property, obscene degrading or abusive content, and value chain and component integration ([PDF](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)).

The mapping unit in the profile is **subcategory times risk equals suggested action**, and the profile explicitly covers only some subcategories. Do not expect a complete grid.

---

## 3. ISO/IEC 42001

Published December 2023. It certifies an **AI management system**, not a model or a product: policies, objectives, roles, risk and impact assessment, lifecycle controls, monitoring, internal audit and continual improvement, audited on a three-year cycle with annual surveillance.

It shares the Annex SL structure with ISO 27001, so context, leadership, internal audit and management review can run as one integrated system. The control sets are distinct and do not overlap: 27001 Annex A is information security, 42001 Annex A is AI management. **42001 is not a security standard and does not subsume 27001**, and 27001 certification is not a prerequisite.

What 42001 adds with no 27001 equivalent: AI impact assessment covering individuals and society rather than only the organisation, data quality for training, bias, model drift, and obligations that depend on your role in the value chain.

### Provider certification status

| Provider | In scope |
|---|---|
| **AWS** | Amazon Bedrock, Amazon Q Business, Amazon Textract, Amazon Transcribe. First surveillance audit completed November 2025 with no findings ([FAQ](https://aws.amazon.com/compliance/iso-42001-faqs/)) |
| **Google Cloud** | The broadest scope of the three, covering the Gemini Enterprise Agent Platform, generative AI on it, Document AI, and more ([certification](https://cloud.google.com/security/compliance/iso-42001)) |
| **Microsoft** | Nine services including Microsoft Foundry, Copilot, Copilot Studio and Security Copilot ([offering](https://learn.microsoft.com/en-us/compliance/regulatory/offering-iso-42001)) |

**The point both AWS and Microsoft state explicitly: their certification does not make you certified.** Microsoft's wording is that you are responsible for engaging an assessor to evaluate the controls within your own organisation. If someone tells you the platform's certificate covers your deployment, they are wrong.

---

## 4. OWASP

### Top 10 for LLM Applications 2026

Published 3 August 2026, superseding the 2025 list ([resource](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/)).

| ID | Item | Moved |
|---|---|---|
| LLM01:2026 | Prompt Injection | same |
| LLM02:2026 | Sensitive Information Disclosure | same |
| LLM03:2026 | Excessive Agency | **up from 6** |
| LLM04:2026 | Supply Chain | |
| LLM05:2026 | Data and Model Poisoning | |
| LLM06:2026 | Unbounded Consumption | **up from 10** |
| LLM07:2026 | Misinformation | |
| LLM08:2026 | Hidden Context Exposure | **renamed from System Prompt Leakage** |
| LLM09:2026 | Vector and Embedding Weaknesses | |
| LLM10:2026 | Improper Output Handling | **down from 5** |

The methodology now blends a practitioner vote with real incident data. Excessive agency and unbounded consumption both climbing is the story: the risks that rose are the ones that only exist once a model can act.

The list draws its own scope boundary, and it is a good one to quote in a design review: this list owns the risk when the model is a component inside your application; the moment it becomes an actor, with tools it can call, memory it carries between sessions and consequences it sets in motion, the risk moves to the agentic list.

### Top 10 for Agentic Applications 2026

Announced 9 December 2025 ([resource](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)). This is the one to review an agent against.

| ID | Item | Control family it lands in |
|---|---|---|
| ASI01 | Agent Goal Hijack | Input |
| ASI02 | Tool Misuse and Exploitation | Authorization, action |
| ASI03 | Identity and Privilege Abuse | Identity, authorization |
| ASI04 | Agentic Supply Chain Vulnerabilities | Lifecycle |
| ASI05 | Unexpected Code Execution | Action |
| ASI06 | Memory and Context Poisoning | Input, data boundary |
| ASI07 | Insecure Inter-Agent Communication | Identity, data boundary |
| ASI08 | Cascading Failures | Action, cost |
| ASI09 | Human-Agent Trust Exploitation | Action |
| ASI10 | Rogue Agents | Identity, lifecycle |

A companion document, **Agentic AI Threats and Mitigations**, carries a longer taxonomy from T1 to T17, adding insecure inter-agent protocol abuse and supply chain compromise in version 1.1. Note that the landing page says version 1.0 of February 2025 while serving a version 1.1 PDF of December 2025; cite the version you actually read.

---

## 5. Shared responsibility for AI

The three providers answer different questions here, which is itself worth teaching.

**Microsoft is the only one with an explicit published model,** and there are two. The [AI shared responsibility model](https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility-ai) splits AI platform, AI application and AI usage. The [AI agent shared responsibility model](https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility-ai-agent) adds three agent layers on top: orchestration, tools and actions, and memory and state.

That second page is the single most directly usable artefact in this whole reference. Its matrix has thirteen rows across software, platform and software-as-a-service tiers. Three rows stay **entirely with the customer at every tier**, which is the finding to carry away:

- Human-in-the-loop approval for high-impact actions
- Acceptable-use policy and accountability for actions
- Agent instructions, system prompt and scope, at all but the SaaS tier

Its closing line is worth quoting in a steering meeting: *autonomy never reduces accountability.*

**AWS gives you a scoping model rather than a responsibility model.** The [Agentic AI Security Scoping Matrix](https://aws.amazon.com/ai/security/agentic-ai-scoping-matrix/) has four scopes by degree of agency, from no agency to full agency, across six security dimensions. It answers "how much did you take on", not "who does what".

**Google gives you a control framework.** SAIF 2.0, announced 6 October 2025, extends SAIF to agentic AI with an Agent Risk Map and three principles: agents must have well-defined human controllers, their powers must be carefully limited, and their actions and planning must be observable ([announcement](https://blog.google/technology/safety-security/ai-security-frontier-strategy-tools/)). There is no AI-specific responsibility matrix; Google defers to its generic shared responsibility and shared fate model.

---

## 6. Agent-specific standards

**Model Context Protocol** is at revision `2026-07-28` ([specification](https://modelcontextprotocol.io/specification/latest)). Its three normative principles are user consent and control, data privacy, and tool safety, and the specification is candid that **it cannot enforce them at the protocol level**.

Three normative rules to build into any MCP integration:

- Tool descriptions and annotations *should be considered untrusted* unless they come from a trusted server.
- Servers **must not** accept tokens that were not explicitly issued for them. This is the confused deputy defence.
- Servers **must not** treat possession of a state handle as authentication. MCP is now stateless with no protocol-level sessions, so handles must be bound server-side to the authenticated user.

**Agent2Agent** was created by Google in April 2025 and donated to the Linux Foundation, reaching version 1.0 in April 2026 with 150 or more supporting organisations. Its governance model is worth noting because it is unusual: **identity is not carried in protocol payloads**, authentication is delegated to HTTP headers using OAuth 2.0 and OpenID Connect, and the **Agent Card is the security contract**, declaring supported authentication schemes ([enterprise readiness](https://a2a-protocol.org/latest/topics/enterprise-ready/)). Version 1.0 added signed agent cards.

**Agent identity has no ratified standard.** Be explicit about this. What exists is active work: the NIST AI Agent Standards Initiative announced 17 February 2026, whose third pillar is research into agent authentication and identity infrastructure; an NCCoE concept paper on software and AI agent identity and authorization; and two OpenID Foundation working group drafts approved on 15 June 2026, including a profile for MCP tool authorization. There is also an individual Internet-Draft proposing OpenID Connect claims for agents, which has **no standards standing** and should not be presented as one.

Meanwhile the thing actually shipping is vendor implementation, principally Microsoft Entra Agent ID. That gap between a shipping product and an absent standard is the current state of agent identity, and it is worth saying plainly rather than implying more maturity than exists.

---

## What we could not verify

1. **The internal structure of ISO/IEC 42001.** The standards body returns an error to automated fetches. The commonly cited figures of 38 Annex A controls under 9 objectives are consistent across secondary sources but were not confirmed against ISO itself.
2. **Whether AI Act Chapter III Section 5 really applies from August 2026** while the Sections 1 to 3 requirements it operationalises are deferred. That is a reading of the amended text; no Commission clarification was found.
3. **When a penalty can bite for a high-risk obligation that has not yet applied.** Chapter XII has applied since August 2025, but the interaction is an inference, not an explicit provision.
4. **Whether the final Article 6 high-risk classification guidelines have been adopted.** A draft was published 19 May 2026.
5. **The publication date of the AWS Agentic AI Security Scoping Matrix.** The page carries none.
6. **The control families in the OWASP Agent Control Standard**, published 1 September 2026. The landing page does not list them.
7. **Whether the frozen MCP revision's security page differs from the draft** that was read.
