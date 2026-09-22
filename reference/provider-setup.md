# Provider setup

Exact prerequisites and commands for deploying the cloud exercises for real. **You do not need any of this to finish the exercises** — 06 to 09 are graded by reading the infrastructure code you write, so they pass on a laptop with no account and no cost. This page is for when you want to see the controls actually exist.

> **Verified 22 September 2026.** Commands and permissions were checked against vendor documentation on that date, with sources linked inline. Cloud consoles and provider schemas move; treat a failure as "this changed" before assuming you typed it wrong. Nothing here was run against a live account.

## Four rules before you start

**Use an account you are allowed to break.** Not a production account, not your employer's main subscription, not the tenant your colleagues use. Several of these changes are visible to every user immediately, and at least one of them, Key Vault purge protection, cannot be undone.

**Set a budget before you create anything.** Every cloud lets you do this in five minutes, and the exercise about cost controls is exercise 07 for a reason. Do it first rather than learning the lesson the expensive way.

**Write down what you create.** A list of resource group, project or stack names, on paper if necessary. The single most common way to spend money by accident is to forget something exists.

**Destroy it the same day.** Not "at the weekend". The teardown command for each platform is at the end of its section, and every one of them is one line.

## What you can actually try

Honest about what each platform costs you to experiment with, because the answers differ a lot.

| Exercise | Platform | What you need | Realistic cost of a day's use |
|---|---|---|---|
| 06 | AWS | Any account | Cents, plus about a dollar a month for the key if you leave it |
| 07 | Google Cloud | A project; **an Organization for the floor setting and org policy** | Cents, and nothing for the policies |
| 08 | Azure | A subscription, and quota for a model deployment | Small, but the Key Vault choice is one way |
| 09 | Microsoft 365 | A tenant, and licences that gate most of the interesting controls | The hardest of the four to try cheaply |

**Exercise 07's most interesting control needs an Organization.** Floor settings and organisation policies are set above the project level, so a standalone personal project cannot hold them. If that is what you have, the template and the agent parts still work and the floor setting does not. That is worth knowing before you spend an evening on it.

**Exercise 09 is the one most people cannot fully try.** The governance controls are gated behind licences, several of them enterprise tier. The exercise is designed to be completed without a tenant for exactly this reason, and the section below is honest about which controls you can see with nothing, with a trial, and only with a paid licence.

---

# Microsoft 365, for exercise 09

**Read this before you spend an evening on it.** This is the hardest of the four to try cheaply, and being honest about that is more useful than a list of steps you cannot follow. Most of the interesting controls are gated behind licences, several at enterprise tier. The exercise is designed to be completed without a tenant for exactly this reason.

## What you can try, by what you hold

| You have | You can actually configure |
|---|---|
| **Nothing but a free Entra tenant** | Agent identities and blueprints in Entra, custom security attributes, Entra audit and sign-in logs ([Entra Agent ID](https://learn.microsoft.com/en-us/entra/agent-id/what-is-microsoft-entra-agent-id)) |
| **Any normal Microsoft 365 plan** | The **agent registry** in the admin centre, and basic agent governance: publish, block, delete, approve, reassign owner, and the conditions-based lifecycle rules. Viewing all agents needs no licence at all, only the AI Reader role ([registry convergence](https://learn.microsoft.com/en-us/entra/agent-id/agent-registry-convergence)) |
| **Copilot Studio individual trial** | Authoring and the test chat panel. **You cannot publish**, which means you cannot exercise the publish-approval gate ([licensing](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing-subscriptions)) |
| **Purview Suite trial**, 90 days, needs you to already hold E3 | Real hands-on with DSPM, DLP, Communication Compliance, Audit Premium ([trial](https://learn.microsoft.com/en-us/purview/purview-trial)) |
| **At least one Copilot licence** | Restricted Content Discovery and most of SharePoint Advanced Management, plus the DLP Copilot location having anything to act on |
| **Microsoft Agent 365**, included with E7 or an add-on to E5 | Conditional Access for agents, agent policy templates, agent observability, the agent Graph API |

**So the honest summary.** You can see and configure the agent registry, basic agent governance and Entra agent identities on free or trial licensing. You cannot try Conditional Access for agents, Restricted Content Discovery, or DLP for Copilot without paying.

## Getting a tenant

The Microsoft 365 Developer Program still exists but is **heavily gated** as of 2026, and one requirement catches everyone: **linking a valid billing account is mandatory during sandbox setup and cannot be bypassed** ([FAQ](https://learn.microsoft.com/en-us/office/developer-program/microsoft-365-developer-program-faq)). You need an active agreement with an Azure subscription, and Billing Account Reader is explicitly not enough permission. Eligibility runs through a Visual Studio Professional or Enterprise subscription, an ISV or partner programme, or Premier and Unified Support. The sandbox itself is free, for 25 users and 90 days.

One note if you go this route and want Copilot: sandboxes provisioned from July 2026 can buy add-ons directly, and **an existing developer tenant without commerce capability cannot be converted**. You would need a new one.

## Licences, per control

| Control | What it needs |
|---|---|
| Entra Agent ID, the platform | All Entra customers, no extra licence |
| **Extending Entra security features to agents** | Microsoft Agent 365 |
| Conditional Access for agents | Entra ID P1 or P2, **plus** Agent 365 per user |
| Microsoft Agent 365 | Included with Microsoft 365 E7, or an add-on to E5, A5 or Business Premium |
| Restricted Content Discovery | A base plan, **plus** at least one Copilot licence in the organisation, or the SharePoint Advanced Management Plan 1 add-on, or E7 |
| Communication Compliance over Copilot | Included for Copilot data. **Copilot Studio data needs pay-as-you-go billing enabled** |
| Copilot Studio authoring | **Two** licences: a tenant one and a per-user one. This trips people up constantly |

Two licence facts are worth pulling out. Communication Compliance is free over Microsoft Copilot data and billed over Copilot Studio data, so governing your own agents costs money in a way that governing Copilot does not. And the exact stock keeping unit for the DLP Copilot location and for DSPM is not stated on their own pages; both defer to the licensing guidance, so check that rather than assuming E5.

## Admin roles

| To do this | You need |
|---|---|
| Create a DLP policy with the Copilot location | AI Administrator, or a Purview Data Security AI Admin, Compliance Administrator, Information Protection Admin or Global Administrator |
| Configure Restricted Content Discovery | SharePoint Administrator, or SharePoint Advanced Management Administrator |
| **Approve agent publish requests** | **AI Administrator or Global Administrator only.** Other roles can see governance gaps and cannot act on them ([roles](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/agent-roles-perms)) |
| Configure the web search policy | Office Apps Administrator, Security Administrator or Global Administrator |
| See all agents in the registry | AI Reader, which is the least-privilege role and needs no licence |
| **Read actual prompts and responses** | Content Explorer Content Viewer **plus** Purview Data Security AI Content Viewer. **No admin role grants this on its own**, which is a good design |

## Where each thing lives

| Console | URL |
|---|---|
| Microsoft 365 admin centre | `admin.microsoft.com` |
| Microsoft Purview | `purview.microsoft.com` |
| Power Platform admin centre | `admin.powerplatform.microsoft.com` |
| Microsoft Entra | `entra.microsoft.com` |
| Cloud Policy service | `config.office.com` |
| Copilot Studio | `copilotstudio.microsoft.com` |

## The commands

SharePoint, for Restricted Content Discovery ([connect](https://learn.microsoft.com/en-us/powershell/sharepoint/sharepoint-online/connect-sharepoint-online), [RCD](https://learn.microsoft.com/en-us/sharepoint/restricted-content-discovery)):

```powershell
Install-Module -Name Microsoft.Online.SharePoint.PowerShell -Scope CurrentUser
# PowerShell 7 needs this shim; Windows PowerShell 5 does not
Import-Module Microsoft.Online.SharePoint.PowerShell -UseWindowsPowerShell
Connect-SPOService -Url https://contoso-admin.sharepoint.com

# Restrict one site, and check it
Set-SPOSite -Identity <site-url> -RestrictContentOrgWideSearch $true
Get-SPOSite -Identity <site-url> | Select RestrictContentOrgWideSearch

# Let site admins do it themselves, with a justification that gets audited
Set-SPOTenant -DelegateRestrictedContentDiscoverabilityManagement $true

# Tenant-wide report
Start-SPORestrictedContentDiscoverabilityReport
Get-SPORestrictedContentDiscoverabilityReport
```

The agent registry over Graph, which needs an Agent 365 licence ([API](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/api/admin-settings/package/copilotpackages-list)):

```powershell
Connect-MgGraph -Scopes 'CopilotPackages.Read.All'
$uri = "https://graph.microsoft.com/v1.0/copilot/admin/catalog/packages"
do {
    $response = Invoke-MgGraphRequest -Method GET -Uri $uri
    $response.value | ForEach-Object { Write-Host $_.displayName }
    $uri = $response.'@odata.nextLink'
} while ($uri)
```

Note this replaced the old Entra agent registry API. The Entra registry blades were **retired on 1 May 2026**, the old Graph API is being deprecated, and **agents registered through it will need re-registering** ([what's new](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new)). The deprecation date has not been announced.

## The order to do things in

Dependencies, not preferences. Each of these silently does nothing if the one above it is missing.

1. **Turn security defaults off** before attempting any Conditional Access. While they are on, Conditional Access is inert, and nothing tells you.
2. **Turn Purview Audit on.** Every later audit, eDiscovery and reporting claim rests on it.
3. **Create and apply sensitivity labels** before writing a label-based DLP policy. A rule matching on labels has nothing to match until labels exist.
4. **Assign at least one Copilot licence** before expecting Restricted Content Discovery or SharePoint Advanced Management to appear at all.
5. **Create an agent identity blueprint and register it** before expecting the agent to show up in the Agent 365 registry.
6. Only then: Conditional Access for agents, policy templates, observability.

Microsoft's own sequence for the data side is remediate oversharing, then set up guardrails, then meet regulations ([deployment guidance](https://learn.microsoft.com/en-us/microsoft-365/copilot/secure-govern-copilot-foundational-deployment-guidance)). Worth noting that it frames Restricted Content Discovery and the Copilot DLP policy as **interim** measures while you fix the underlying permissions, not as the destination.

## The gotcha that catches everyone

**Setting the Copilot Author security group does not revoke anyone's access.** In Microsoft's words, it does not automatically revoke access from other users. To actually stop someone authoring, all three must be true: they are not in the group, they have no Copilot Studio per-user or trial licence, **and** they have no Microsoft Copilot licence ([troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/power-platform/copilot-studio/licensing/authors-access)).

That third condition is the one nobody expects, and it means a tenant that rolled out Copilot broadly has effectively given everyone the ability to author agents. If you check one thing in your own tenant after reading this page, check that.

## Not verified

- **The exact licence for the DLP Copilot location and for DSPM.** Both pages defer to the security and compliance licensing guidance rather than naming a plan.
- **Which role sets the Copilot Author group, and which sets per-agent credit limits.** The documentation says "admins" without naming one.
- **Whether the web search policy also appears in the Microsoft 365 admin centre.** Two Microsoft pages disagree; the Cloud Policy path is the one the authoritative page gives.
- **The deprecation date for the old agent registry Graph API.** Microsoft says details will follow.

---

## Teardown, in one place

Put these somewhere you will find them. Run them the day you finish.

```bash
# AWS
cd exercises/06-deploy-bedrock-guardrail/terraform && terraform destroy

# Google Cloud
cd exercises/07-deploy-model-armor/terraform && terraform destroy

# Azure — deletes everything in the group in one go
az group delete --name rg-agent-gov --yes --no-wait
```

Two things a `destroy` will not clean up, so check them by hand:

- **A KMS or Key Vault key.** Both clouds schedule key deletion rather than performing it, and Azure Key Vault with purge protection enabled cannot be purged early at all. Budget for the key hanging around for the retention window you set.
- **Log data already written.** Destroying a log group or workspace removes future ingestion. Anything already stored was billed and, if it contains prompts, is still data you are responsible for.

## If something fails

- **Permission denied.** Compare against the roles listed in your platform's section below. The commonest cause is having enough permission to create the resource but not the identity or key it depends on.
- **An unknown resource type or argument.** The provider schema moved. Check the current registry documentation for that resource; these are among the newest resources any of these providers ship.
- **A region error.** Several of these features exist in a subset of regions. Guardrail features, customer-managed keys and semantic governance all have shorter region lists than the base service.
