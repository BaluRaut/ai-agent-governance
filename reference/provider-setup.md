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

# AWS, for exercise 06

## Command line and credentials

```bash
curl -fsSL https://awscli.amazonaws.com/v2/install.sh | bash   # macOS, recommended by AWS
aws --version                                                  # expect 2.x
```

Either credential route works, because the Terraform provider reads the standard chain. Identity Center is the one AWS recommends; the long-term key flow is labelled *not recommended* on its own page ([quickstart](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html)).

```bash
aws configure sso          # then: aws sso login --profile lab; export AWS_PROFILE=lab
# or
aws configure              # access key, secret, region, output format
```

Do not run Terraform until this returns an ARN:

```bash
aws sts get-caller-identity
```

## Permissions

AWS publishes the guardrail policy itself ([guardrail permissions](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-permissions.html)), and adds one line that catches Terraform users specifically: if you pass tags when creating a guardrail, you also need `bedrock:TagResource`. **Terraform's `tags` and `default_tags` will trigger that.**

Four managed policies get the exercise deployed, with one gap you must patch:

```
AmazonBedrockFullAccess
CloudWatchLogsFullAccess
IAMFullAccess
AWSKeyManagementServicePowerUser   + the inline patch below
```

`AWSKeyManagementServicePowerUser` is missing three actions, and each breaks a specific step: `kms:ScheduleKeyDeletion` breaks `terraform destroy`, `kms:PutKeyPolicy` breaks setting a key policy, and `kms:EnableKeyRotation` breaks the `enable_key_rotation = true` in the exercise. Add them inline.

Two things about `AmazonBedrockFullAccess` that are worth knowing before you debug an apply for an hour:

- **It grants no `iam:CreateRole`, no `kms:CreateKey` and no `logs:` actions at all.** That is why the other three policies are on the list.
- **Its `iam:PassRole` grant is scoped to `arn:aws:iam::*:role/*AmazonBedrock*`.** A sensibly named role like `agent-gov-bedrock-logging` is refused, with an error that does not mention the name. This is why the exercise names its role `AmazonBedrockLogging-…`, and the comment in the file says so.

`AmazonBedrockLimitedAccess` cannot build this exercise: it is an explicit allowlist with no `PutModelInvocationLoggingConfiguration`.

## Model access

Your instinct is right and there are two exceptions. Verbatim: *access to all Amazon Bedrock foundation models is enabled by default with the correct AWS Marketplace permissions in all commercial AWS Regions*, and a first invocation of a third-party model starts the subscription in the background ([model access](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)). So no console click-through.

The exceptions: the invoking principal still needs the Marketplace actions, which `AmazonBedrockFullAccess` grants, and **Anthropic models still require a one-time first-use form** per account or organisation management account. There is a Terraform resource for that, `aws_bedrock_use_case_for_model_access`, which adopts an existing submission rather than failing.

**None of this affects exercise 06**, because creating a guardrail and calling `ApplyGuardrail` need no model access at all.

## Region

Use **`us-east-1` or `us-west-2`**. Automated Reasoning checks are generally available in exactly six regions: those two plus `us-east-2`, `eu-central-1`, `eu-west-3` and `eu-west-1` ([automated reasoning](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-automated-reasoning-checks.html)).

Be aware that **AWS no longer publishes a region list for Guardrails generally**, and none has ever existed for contextual grounding. The best published lower bound is the 25-region safeguard tier list ([tiers](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-tiers.html)). The two regions above satisfy everything.

## Deploying

```bash
cd exercises/06-deploy-bedrock-guardrail/terraform
terraform init
terraform plan -out=tfplan     # read this before applying
terraform apply tfplan
terraform destroy
```

Two documented behaviours worth knowing. A saved plan file **stores sensitive values in cleartext**, so keep `tfplan` out of git; the repository's ignore rules already do. And `terraform destroy` takes no plan file, so for a reviewable teardown use `terraform plan -destroy -out=destroy.tfplan` then apply that.

## Two things that will bite a shared account

**Model invocation logging is a singleton per region per account.** The provider documentation says so plainly: defining it in more than one configuration overwrites the other. Two learners in one account will clobber each other.

**Automated Reasoning has no Terraform resource.** There is no argument on `aws_bedrock_guardrail` for it and no separate resource in the provider. AWS's own guidance is to automate it through CloudFormation. If you want to try it, do it in the console.

## Cost

| | Idle |
|---|---|
| Guardrail with no traffic | **Nothing.** Billing is per text unit, with no standing meter |
| Customer-managed key | **One dollar a month**, prorated hourly |
| Empty log group | **Nothing.** Every dimension is per gigabyte, with five free |

**About one dollar a month, all of it the key.** And note the teardown trap: the key keeps billing through its pending-deletion window, minimum seven days, after you destroy everything else.

---

# Google Cloud, for exercise 07

## Command line and credentials

Only one authentication command matters, and it is not the obvious one. The provider's own documentation says to authenticate with **Application Default Credentials**, and `gcloud auth login` alone does not set those. Google's own concept page is blunt: the command line tool itself does not use these credentials.

```bash
gcloud init
gcloud config set project PROJECT_ID
gcloud auth application-default login                       # the one Terraform reads
gcloud auth application-default set-quota-project PROJECT_ID
```

Set the quota project override too, because credentials from the command line tool are associated with a Google-owned project:

```hcl
provider "google" {
  project               = var.project_id
  user_project_override = true
  billing_project       = var.project_id
}
```

## Services to enable

```bash
gcloud services enable \
  modelarmor.googleapis.com \
  aiplatform.googleapis.com \
  orgpolicy.googleapis.com \
  cloudresourcemanager.googleapis.com \
  billingbudgets.googleapis.com
```

There is no per-region enablement. Model Armor uses a client-side endpoint override, needed only for a location other than the default:

```bash
gcloud config set api_endpoint_overrides/modelarmor "https://modelarmor.LOCATION.rep.googleapis.com/"
```

**No Security Command Center tier is required.** Model Armor is included in the Premium and Enterprise tiers and can also be bought and used on its own ([pricing](https://cloud.google.com/security-command-center/pricing)).

## Permissions

| To do this | Role | Where |
|---|---|---|
| Create a Model Armor template | `roles/modelarmor.admin` | project |
| Set a floor setting | `roles/modelarmor.floorSettingsAdmin` | the node being set |
| Set `vertexai.allowedModels` | `roles/orgpolicy.policyAdmin` | **the organisation** |
| Enable the services above | `roles/serviceusage.serviceUsageAdmin` | project |

## Do you need an Organization? A split answer

**Floor settings: no.** They can be set at organisation, folder **or project** level, and the Terraform `parent` argument accepts all three ([floor settings](https://docs.cloud.google.com/security-command-center/docs/configure-model-armor-floor-settings)). A solo project gets the inline-enforcement half, which is the interesting half for learning.

**Organisation policies: effectively yes.** The API accepts a project scope, but `roles/orgpolicy.policyAdmin` is documented only as granted on the organisation, and a project created under a personal Google account has no organisation node to grant it on.

**Three fallbacks, best first:**

1. **Do the Model Armor half for real** with `parent = "projects/PROJECT_ID"` and `location = "global"`. No organisation needed, and this is where the lesson lives.
2. **Sign up for Cloud Identity free** if you own any domain. That creates the organisation and the policy half works as written.
3. **Dry run the policy.** Write `google_org_policy_policy` with `dry_run_spec` instead of `spec`, which is audit-only by design, and `terraform validate` it without applying.

## Deploying

```bash
cd exercises/07-deploy-model-armor/terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan
terraform destroy
```

The floor setting needs provider version 6.45 or later; the exercise pins 8.x.

## Two schema notes

**The filter type vocabulary differs between surfaces.** The provider documents `SEXUALLY_EXPLICIT`, `HATE_SPEECH`, `HARASSMENT` and `DANGEROUS`. Note the last one: not `DANGEROUS_CONTENT`, which is what Gemini's own safety categories use. The provider also documents only three confidence levels, while the API accepts a fourth, `NONE`.

**Watch out for a typo in the published floor setting example.** One registry example writes `parent = "project/my-project-name"`. The correct prefix is `projects/`.

## Cost

**Treat this as free.** Model Armor gives 2,000,000 tokens a month at no cost standalone, and charges ten cents per million after that. Sensitive Data Protection inside Model Armor carries no additional charge. Organisation policies and floor settings cost nothing. A learning exercise will not come close to the free allowance.

---

# Azure, for exercise 08

## Command line and credentials

```bash
brew update && brew install azure-cli     # macOS 13 or newer
az login                                  # add --use-device-code with no browser
az account set --subscription "My Demos"
az account show --output table
```

Note that Microsoft now requires multifactor authentication for the Azure command line for user identities.

## Register the resource providers

Deploying a Bicep file registers the providers **in** the template automatically, but the Azure Resource Manager documentation states plainly that supporting resources are not covered, and gives monitoring and security resources as the example. That is exactly what exercise 08 deploys, so register by hand:

```bash
for ns in Microsoft.CognitiveServices Microsoft.OperationalInsights Microsoft.Insights \
          Microsoft.KeyVault Microsoft.Storage Microsoft.MachineLearningServices; do
  az provider register --namespace "$ns" --wait
done

az provider show -n Microsoft.CognitiveServices --query registrationState -o tsv
```

Skipping this produces `MissingSubscriptionRegistration` or `NoRegisteredProviderFound`.

## Permissions

**Contributor at resource group scope** deploys everything in the exercise. But Contributor is management plane only, so pair it with **Foundry User** at account scope if you also want to call the model.

The Foundry roles were renamed and Microsoft recommends using the identifiers rather than the names while the rename rolls out ([RBAC](https://learn.microsoft.com/en-us/azure/ai-foundry/concepts/rbac-azure-ai-foundry)):

| Role | Identifier |
|---|---|
| Foundry User | `53ca6127-db72-4b80-b1b0-d745d6d5456d` |
| Foundry Owner | `c883944f-8b7b-4483-af10-35834be79c4a` |
| Foundry Project Manager | `eadc314b-1a2d-4efa-be10-5d325db5065e` |

**Do not use roles beginning with Cognitive Services, and do not use Azure AI Developer.** The documentation says so directly: despite the name, that one is scoped to machine learning workspaces and hubs, not to Foundry projects.

Assigning a role needs Owner or Role Based Access Control Administrator; Contributor explicitly cannot.

## The Key Vault decision you cannot undo

Customer-managed keys **require** both soft delete and purge protection, and the command line reference says of purge protection, verbatim: *enabling this functionality is irreversible*. Soft delete is on by default for new vaults and cannot be turned off. The retention period is fixed at creation and **cannot be changed afterwards**.

The consequence for a learning exercise is concrete: **use seven days, not the ninety-day default**, or you cannot reuse the vault name for three months.

```bash
az keyvault create \
  --name kv-lab-$RANDOM \
  --resource-group rg-agent-gov \
  --location swedencentral \
  --enable-purge-protection true \
  --enable-rbac-authorization true \
  --retention-days 7

az keyvault key create --vault-name <kv> --name cmk-foundry --kty RSA --size 2048
```

Only RSA 2048 is supported. The vault and the Foundry account must be in the same region. Grant the account's identity access **before** enabling the key, and note that you cannot switch between Microsoft-managed and customer-managed keys after deployment.

One unresolved detail: Microsoft's own pages disagree on whether the role is **Key Vault Crypto User** or **Key Vault Crypto Service Encryption User**. The newer page uses the first. Try that, and fall back on a 403.

## Deploying

```bash
az group create --name rg-agent-gov --location swedencentral

# what-if is the stronger check: it predicts changes and validates the file
az deployment group what-if \
  --resource-group rg-agent-gov \
  --template-file exercises/08-deploy-foundry-guardrail/bicep/main.bicep \
  --parameters keyVaultKeyUri=<your-key-uri>

az deployment group create \
  --resource-group rg-agent-gov \
  --template-file exercises/08-deploy-foundry-guardrail/bicep/main.bicep \
  --parameters keyVaultKeyUri=<your-key-uri>

az group delete --name rg-agent-gov --yes
```

The Bicep compiler needs no separate install: the Azure command line installs a self-contained copy when a command needs it, though it does not put it on your path.

## Model quota

`gpt-5-mini`, which the exercise deploys, needs **no access request**. The only models currently gated by a registration form are computer use and Grok.

There is a quota system though, and it is new. Microsoft introduced seven tiers, and subscription-level quota management started in May 2026 ([quotas](https://learn.microsoft.com/en-us/azure/foundry/openai/quotas-limits)). The lowest tier includes `gpt-5-mini` at Global Standard with the largest allocation of the four models available there, which is why the exercise uses it. Check your own allocation before deploying.

A risk note rather than a verified fact: community reports describe brand-new subscriptions starting at zero tokens per minute. If your deployment fails on quota, that is the likely cause.

## Cost

| | Idle |
|---|---|
| Foundry account with no inference | **Nothing.** No fixed meter exists |
| Log Analytics with no ingestion | **Nothing.** Five gigabytes a month are free |
| Application Insights | Billed through the workspace |
| Key Vault Standard with a software key | **Effectively nothing.** Per-operation only |

**About nothing per month**, unless you choose a Premium vault with a hardware-backed key, which adds a dollar. What would break that: availability tests, sending all metrics in the diagnostic setting, or adding Sentinel to the workspace.

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

## Provider versions

Checked against the Terraform registry on 22 September 2026. These move faster than anything else on this page, and a major version behind is the commonest reason an exercise's code will not plan.

| Provider | Version then | Used by |
|---|---|---|
| `hashicorp/aws` | 6.66.0 | Exercise 06, pinned `~> 6.0` |
| `hashicorp/google` | 8.3.0 | Exercise 07, pinned `~> 8.0` |
| `hashicorp/google-beta` | 8.3.0 | Exercise 07, pinned `~> 8.0` |

Check the current versions yourself before applying anything:

```bash
curl -s https://registry.terraform.io/v1/providers/hashicorp/google | python3 -c "import json,sys; print(json.load(sys.stdin)['version'])"
```

Every resource these exercises use was confirmed present in the current providers on that date: `aws_bedrock_guardrail`, `aws_bedrock_guardrail_version`, `aws_bedrock_model_invocation_logging_configuration`, `google_model_armor_template`, `google_model_armor_floorsetting`, `google_org_policy_policy`, `google_billing_budget` and `google_vertex_ai_reasoning_engine`. Present is not the same as unchanged, so read the argument reference for anything that fails to plan.

## What we could not verify

Listed so you can tell a gap from a fact. Nothing on this page was executed against a live account.

**AWS.** There is no published region list for Guardrails generally, nor for contextual grounding; the 25-region safeguard tier list is a confirmed lower bound rather than the answer. The gaps in `AWSKeyManagementServicePowerUser` and the role-name constraint on `iam:PassRole` are read off the policy documents, not confirmed by an apply. "An empty log group is free" is an inference from the absence of a per-log-group dimension in the pricing.

**Google.** Whether a project with no organisation can have an organisation policy applied at all is genuinely unclear; the interface accepts it and the required role is documented only at organisation scope. Treat it as blocked in practice and use the fallbacks. Behaviour of a `NONE` confidence level through Terraform is untested, since the provider does not document it.

**The `google_vertex_ai_reasoning_engine` schema.** Two verification passes disagreed about whether `identity_type` is an argument on it. Exercise 07 says so in its own README. Check the current resource documentation before applying that block.

**Azure.** Microsoft's pages disagree on the Key Vault role name for customer-managed keys, and both are current. No page explicitly states that the two monitoring providers must be registered by hand; that follows from the general rule plus the absence of a default-registration marker. Whether a brand-new subscription reliably receives non-zero model quota is a community report rather than documentation.

**Microsoft 365.** Listed at the end of that section.

## If something fails

- **Permission denied.** Compare against the roles listed in your platform's section below. The commonest cause is having enough permission to create the resource but not the identity or key it depends on.
- **An unknown resource type or argument.** The provider schema moved. Check the current registry documentation for that resource; these are among the newest resources any of these providers ship.
- **A region error.** Several of these features exist in a subset of regions. Guardrail features, customer-managed keys and semantic governance all have shorter region lists than the base service.
