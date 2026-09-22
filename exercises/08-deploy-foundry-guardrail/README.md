# 08 · Deploy a Microsoft Foundry guardrail

**Families:** input, output, identity, data boundary, observability.
**Cloud account needed:** no, to pass the checks. Yes, to deploy it.

## What you will build

Bicep for a Foundry account and project that is governed from the first deployment rather than hardened afterwards:

1. A **guardrail**, which in Azure Resource Manager is still an object called a RAI policy, with the content categories plus both Prompt Shields.
2. A model deployment that **references that guardrail**, because a guardrail attached to nothing protects nothing.
3. **Key authentication disabled** and a managed identity, because agents and evaluations require Entra ID anyway.
4. **Private network access** and a **customer-managed key**.
5. **Diagnostic settings** carrying the audit and trace categories.

## Two decisions you cannot change later

Read these before you write any Bicep, because both are immutable and both have caught teams out.

**Outbound networking cannot be updated.** You cannot add virtual network injection to an existing Foundry deployment. Getting this wrong means redeploying, not reconfiguring.

**A project's managed identity type is fixed at creation.** A user-assigned identity is supported only when configured as the project is created.

## The failure mode this exercise exists to teach

For hosted agents, an agent that references a guardrail policy which **does not exist is created successfully and reports active, while no content filtering is applied at all**. The guardrail fails open, and nothing tells you. Pass the full resource identifier rather than a bare name, and test that filtering actually fires before you believe it.

That is why the checks below insist on a reference by resource ID, and why you should add a test that sends something the guardrail must block.

## Steps

1. Complete the `TODO` blocks in `bicep/main.bicep`.
2. Run: `npm run ex -- 08`
3. Compare with `solution/bicep/main.bicep`.

## Deploying it for real

```bash
az group create --name rg-agent-gov --location swedencentral
az deployment group create \
  --resource-group rg-agent-gov \
  --template-file exercises/08-deploy-foundry-guardrail/bicep/main.bicep \
  --parameters keyVaultKeyUri=<your-key-uri>
# when finished
az group delete --name rg-agent-gov --yes
```

**Cost.** The account itself has no standing charge; model deployments bill per token. Private endpoints and Key Vault carry small hourly charges, and a customer-managed key requires a Key Vault with purge protection, which you cannot simply delete afterwards. Use a disposable subscription if you have one.

## Notice

- **The agent's guardrail fully overrides the model's.** Risks are detected based on the guardrail assigned to the agent, not to its underlying model. If an agent has its own guardrail, the model's is not additionally applied, so an agent guardrail that is narrower than the model's is a downgrade, not a supplement.
- **Turning a category off needs approval.** Severity Off is available only to customers approved through a limited access review. Treat Off as a request, not a setting.
- **Budget about 50 to 100 milliseconds per intervention point.** Four intervention points is not free, and the tool-call and tool-response points are the expensive ones on a chatty agent.
- **Customer-managed keys do not cover prompt agents on Foundry-managed storage.** To get them over agent conversation history and vector stores you need the standard setup with your own storage, Cosmos DB and AI Search.
