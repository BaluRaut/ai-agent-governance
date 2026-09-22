# 09 · Govern Microsoft Copilot

**Families:** identity, authorization, output, data boundary, observability, cost, lifecycle.
**Cloud account needed:** no, to complete the exercise. A Microsoft 365 tenant with the right licences, to apply it for real.

## Why this one is different

The other deployment exercises write infrastructure as code. Microsoft's Copilot governance plane is mostly **tenant settings across four admin centres**, not resources in a template. So the artefact here is a **conformance check**: a function that reads a tenant's configuration and reports what is missing, which you can run against an export on a schedule.

That difference is itself the lesson. Ask any platform "what would infrastructure as code look like here", and the answer tells you how governable it really is.

## The four places settings live

Copilot governance is spread deliberately thin, and knowing which console owns which control saves hours.

| Console | Owns |
|---|---|
| Microsoft 365 admin center | Agent registry, publish approvals, agent management rules, user access |
| Power Platform admin center | Who may build, data policies over connectors, Copilot Credits and per-agent limits |
| Microsoft Purview | DLP for Copilot, sensitivity labels, audit, retention, Communication Compliance |
| Microsoft Entra | Agent ID, Conditional Access, access packages and sponsors |

## Steps

1. Read `tenant.ts`. It describes two tenants: one configured carelessly, one hardened.
2. Open `exercise.ts` and implement the eleven rules in `assess()`.
3. Run: `npm run ex -- 09`
4. The README section below has the actual commands to apply each control in a real tenant.

## Done when

The careless tenant produces every finding, the hardened one produces none, and you can say which console each finding is fixed in.

## Applying these for real

First time in a tenant? [Provider setup](../../reference/provider-setup.md) covers which licence gates which control, the admin roles needed, and what you can try without a Copilot licence at all.

Do this in a test tenant first. Several of these changes are visible to every user immediately.

**Stop anonymous agents and risky knowledge sources.** Power Platform admin center → Security → Data and privacy → Data policy. Set these connectors to Blocked: `Chat without Microsoft Entra ID authentication in Copilot Studio`, and, if your risk profile calls for it, `Knowledge source with public websites and data in Copilot Studio` and `HTTP`. Enforcement is real time and a violation makes the Publish button unavailable.

**Restrict who can build.** Power Platform admin center → Settings → Copilot Author, bound to a security group. Note there is no switch that globally disables agent creation; the nearest equivalent is turning off publishing of agents that use generative AI features.

**And the part that surprises everyone about that setting:** assigning the group does **not** revoke anyone's existing access. To actually stop a person authoring, all three must hold: they are not in the group, they have no Copilot Studio licence, **and they have no Microsoft Copilot licence**. That third condition means a tenant which rolled Copilot out broadly has effectively given everyone the ability to author agents, while the admin setting suggests otherwise.

**Turn off web grounding** where it is not wanted. This one has a single home: the policy is `Allow web search in Copilot`, and it is available **only in the Cloud Policy service for Microsoft 365**, scopable to users or groups. Leaving it unconfigured means web search is on.

**Stop oversharing at the source.** SharePoint admin center → Sites → Active sites → the site → Settings → Restrict content from Microsoft Copilot. Or in PowerShell:

```powershell
Set-SPOSite -Identity <site-url> -RestrictContentOrgWideSearch $true
Start-SPORestrictedContentDiscoverabilityReport
```

Up to 20,000 sites. On sites over 500,000 items the change can take more than a week to apply.

**Cap spend per agent.** Power Platform admin center → Licensing → Products → Copilot Studio → Summary → Manage Agents. Set a monthly credit limit. The agent is turned off automatically when it hits the limit, which makes this a real control rather than an alert.

**Clean up ownerless agents.** Microsoft 365 admin center → Agents → Settings → Agent management rules. Enable reassignment of ownerless agents to the previous owner's manager, and rejection of publish requests older than your chosen number of days.

## Notice

- **Sensitivity labels only hold if users lack the EXTRACT right.** A label that encrypts but grants EXTRACT to everyone does not stop Copilot returning the content. This is the most commonly misunderstood control on the platform.
- **Blocking behaves differently per agent platform.** Blocking a SharePoint or Foundry agent only affects Copilot Chat. Read the table in the platform reference before promising anyone an agent is off.
- **Admin actions fail silently** against agents in environments running Power Platform Firewall in active enforcement. Silent failure is worse than an error, so verify rather than assume.
- **Treat the Copilot Author setting as a narrowing, not a gate.** The exercise models it as `copilotAuthorRestrictedToGroup`, and the finding it raises is worth raising, but in a real tenant you must check the licence side too. A control that reports success while doing nothing is worse than no control.
