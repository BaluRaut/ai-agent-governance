// Microsoft Foundry account, project, guardrail and model deployment,
// governed from the first deployment.

@description('Base name for resources.')
param namePrefix string = 'agentgov'

@description('Region. Note that customer-managed keys are available only in some regions.')
param location string = 'swedencentral'

@description('Key Vault key URI for the customer-managed key.')
param keyVaultKeyUri string

@description('Resource ID of the subnet to inject agent egress into. Immutable after creation.')
param agentSubnetId string = ''

var accountName = '${namePrefix}-foundry'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${namePrefix}-logs'
  location: location
  properties: {
    retentionInDays: 90
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${namePrefix}-appi'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource account 'Microsoft.CognitiveServices/accounts@2026-07-01' = {
  name: accountName
  location: location
  kind: 'AIServices'
  sku: {
    name: 'S0'
  }
  // TODO 1 — give the account a system-assigned managed identity.
  //   identity: { type: 'SystemAssigned' }

  properties: {
    customSubDomainName: accountName
    allowProjectManagement: true

    // TODO 2 — disable key authentication.
    //   disableLocalAuth: true
    // Agents, evaluations and datasets require Entra ID and do not accept keys anyway,
    // so leaving keys enabled only widens the blast radius. Propagation can take hours,
    // so verify with a 401 rather than assuming.

    // TODO 3 — close public network access.
    //   publicNetworkAccess: 'Disabled'

    // TODO 4 — configure the customer-managed key.
    //   encryption: {
    //     keySource: 'Microsoft.KeyVault'
    //     keyVaultProperties: { keyVaultUri: ..., keyName: ..., keyVersion: ... }
    //   }
    // Use the keyVaultKeyUri parameter. Remember this does not reach prompt agents
    // on Foundry-managed storage.
  }
}

// TODO 5 — the guardrail.
// Add a resource of type 'Microsoft.CognitiveServices/accounts/raiPolicies@2026-07-01'
// named guardrail, parented to the account, with:
//   properties: {
//     mode: 'Blocking'
//     basePolicyName: 'Microsoft.DefaultV2'
//     contentFilters: [ ... ]
//   }
// Each content filter entry is:
//   { name: 'Hate', blocking: true, enabled: true, severityThreshold: 'Medium', source: 'Prompt' }
// Include, at minimum:
//   - Hate, Sexual, Violence, Selfharm on both 'Prompt' and 'Completion'
//   - 'Jailbreak' on 'Prompt'          (the user prompt attack shield)
//   - 'Indirect Attack' on 'Prompt'    (the cross-prompt injection shield, the one that
//                                       matters for an agent reading retrieved content)
//   - 'Protected Material Text' on 'Completion'

resource project 'Microsoft.CognitiveServices/accounts/projects@2026-07-01' = {
  parent: account
  name: '${namePrefix}-project'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    displayName: 'Governed agent project'
  }
}

// Application Insights is attached as a connection, not a property.
resource tracing 'Microsoft.CognitiveServices/accounts/projects/connections@2026-07-01' = {
  parent: project
  name: 'appinsights'
  properties: {
    category: 'AppInsights'
    target: appInsights.id
    authType: 'AAD'
    isSharedToAll: false
    metadata: {
      ApiType: 'Azure'
      ResourceId: appInsights.id
    }
  }
}

// TODO 6 — a model deployment that actually uses the guardrail.
// Add a 'Microsoft.CognitiveServices/accounts/deployments@2026-07-01' resource with:
//   properties: {
//     model: { format: 'OpenAI', name: 'gpt-5-mini', version: '1' }
//     raiPolicyName: <the guardrail resource's name>
//   }
//   sku: { name: 'GlobalStandard', capacity: 10 }
// A guardrail attached to nothing protects nothing.

// TODO 7 — diagnostic settings.
// Add a 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' resource scoped to
// the account, sending the 'Audit' and 'Trace' log categories to logAnalytics.
//   scope: account
//   properties: {
//     workspaceId: logAnalytics.id
//     logs: [ { category: 'Audit', enabled: true }, { category: 'Trace', enabled: true } ]
//   }

output accountId string = account.id
