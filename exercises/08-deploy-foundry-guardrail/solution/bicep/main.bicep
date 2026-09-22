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
var keyUriParts = split(keyVaultKeyUri, '/')

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

resource account 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: accountName
  location: location
  kind: 'AIServices'
  sku: {
    name: 'S0'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    customSubDomainName: accountName
    allowProjectManagement: true

    // Agents, evaluations and datasets require Entra ID regardless, so keys only
    // widen the blast radius. Propagation can take hours; verify with a 401.
    disableLocalAuth: true

    publicNetworkAccess: 'Disabled'

    // Does not reach prompt agents on Foundry-managed storage. For customer-managed
    // keys over agent conversation history you need the standard setup with your own
    // storage, Cosmos DB and AI Search.
    encryption: {
      keySource: 'Microsoft.KeyVault'
      keyVaultProperties: {
        keyVaultUri: '${keyUriParts[0]}//${keyUriParts[2]}/'
        keyName: keyUriParts[4]
        keyVersion: keyUriParts[5]
      }
    }

    // Immutable. You cannot add outbound injection to an existing deployment.
    networkInjections: empty(agentSubnetId) ? null : [
      {
        scenario: 'agent'
        subnetArmId: agentSubnetId
        useMicrosoftManagedNetwork: false
      }
    ]
  }
}

// In ARM a guardrail is still called a RAI policy.
resource guardrail 'Microsoft.CognitiveServices/accounts/raiPolicies@2026-05-15-preview' = {
  parent: account
  name: '${namePrefix}-guardrail'
  properties: {
    mode: 'Blocking'
    basePolicyName: 'Microsoft.DefaultV2'
    contentFilters: [
      { name: 'Hate', blocking: true, enabled: true, severityThreshold: 'Medium', source: 'Prompt' }
      { name: 'Hate', blocking: true, enabled: true, severityThreshold: 'Medium', source: 'Completion' }
      { name: 'Sexual', blocking: true, enabled: true, severityThreshold: 'Medium', source: 'Prompt' }
      { name: 'Sexual', blocking: true, enabled: true, severityThreshold: 'Medium', source: 'Completion' }
      { name: 'Violence', blocking: true, enabled: true, severityThreshold: 'Medium', source: 'Prompt' }
      { name: 'Violence', blocking: true, enabled: true, severityThreshold: 'Medium', source: 'Completion' }
      { name: 'Selfharm', blocking: true, enabled: true, severityThreshold: 'Medium', source: 'Prompt' }
      { name: 'Selfharm', blocking: true, enabled: true, severityThreshold: 'Medium', source: 'Completion' }
      // The user prompt attack shield.
      { name: 'Jailbreak', blocking: true, enabled: true, source: 'Prompt' }
      // The cross-prompt injection shield. This is the one that matters for an agent
      // reading retrieved documents, inbound email, or a web page.
      { name: 'Indirect Attack', blocking: true, enabled: true, source: 'Prompt' }
      { name: 'Protected Material Text', blocking: true, enabled: true, source: 'Completion' }
      { name: 'Protected Material Code', blocking: false, enabled: true, source: 'Completion' }
    ]
  }
}

resource project 'Microsoft.CognitiveServices/accounts/projects@2025-06-01' = {
  parent: account
  name: '${namePrefix}-project'
  location: location
  // Immutable after creation.
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    displayName: 'Governed agent project'
  }
}

resource tracing 'Microsoft.CognitiveServices/accounts/projects/connections@2025-06-01' = {
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

// The deployment must name the guardrail, or nothing is filtered. For hosted agents
// the equivalent field takes the full resource ID, and a reference to a policy that
// does not exist fails open silently.
resource deployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  parent: account
  name: '${namePrefix}-chat'
  dependsOn: [
    guardrail
  ]
  sku: {
    name: 'GlobalStandard'
    capacity: 10
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-5-mini'
      version: '1'
    }
    raiPolicyName: guardrail.name
  }
}

resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: account
  name: '${namePrefix}-diagnostics'
  properties: {
    workspaceId: logAnalytics.id
    logs: [
      {
        category: 'Audit'
        enabled: true
      }
      {
        category: 'Trace'
        enabled: true
      }
      {
        category: 'RequestResponse'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

output accountId string = account.id
output guardrailId string = guardrail.id
output guardrailName string = guardrail.name
