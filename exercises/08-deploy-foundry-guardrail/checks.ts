import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { check, finish, info, section } from "../../src/lib/check.js";
import { block, loadIac, mentions } from "../../src/lib/iac.js";

const here = dirname(fileURLToPath(import.meta.url));

export function run(relativeDir: string, title: string): void {
  section(title);
  const src = loadIac(join(here, relativeDir));
  if (src.trim().length === 0) {
    check("bicep files were found", false, `nothing readable in ${relativeDir}`);
    finish();
    return;
  }

  const account = block(src, /resource\s+account\s+'Microsoft\.CognitiveServices\/accounts@[^']+'\s*=\s*\{/);
  check("a Foundry account is declared", account !== null);
  check("the account has a managed identity", account !== null && /identity\s*:\s*\{[^}]*type\s*:\s*'(System|User)Assigned/.test(account), "TODO 1");
  check("key authentication is disabled", account !== null && /disableLocalAuth\s*:\s*true/.test(account), "TODO 2");
  check("public network access is closed", account !== null && /publicNetworkAccess\s*:\s*'Disabled'/.test(account), "TODO 3");
  check("a customer-managed key is configured", account !== null && /keySource\s*:\s*'Microsoft\.KeyVault'/.test(account), "TODO 4");

  const guardrail = block(src, /resource\s+\w+\s+'Microsoft\.CognitiveServices\/accounts\/raiPolicies@[^']+'\s*=\s*\{/);
  check("a guardrail (RAI policy) exists", guardrail !== null, "TODO 5");
  check("the guardrail blocks rather than annotates", guardrail !== null && /mode\s*:\s*'Blocking'/.test(guardrail), "annotate-only records the problem and ships it anyway");

  const needed = ["Hate", "Sexual", "Violence", "Selfharm"];
  const missing = needed.filter((n) => !(guardrail && new RegExp(`name\\s*:\\s*'${n}'`).test(guardrail)));
  check("the four content categories are present", missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : undefined);
  check(
    "each content category is filtered on both prompt and completion",
    guardrail !== null && needed.every((n) => {
      const lines = guardrail.split("\n").filter((l) => l.includes(`'${n}'`));
      return lines.some((l) => l.includes("'Prompt'")) && lines.some((l) => l.includes("'Completion'"));
    }),
    "filtering only the prompt leaves the answer unchecked",
  );
  check("the user prompt attack shield is on", guardrail !== null && mentions(guardrail, "'Jailbreak'"), "TODO 5");
  check(
    "the indirect attack shield is on",
    guardrail !== null && mentions(guardrail, "'Indirect Attack'"),
    "this is the cross-prompt injection shield, the one that matters for an agent reading retrieved content",
  );

  const deployment = block(src, /resource\s+\w+\s+'Microsoft\.CognitiveServices\/accounts\/deployments@[^']+'\s*=\s*\{/);
  check("a model deployment exists", deployment !== null, "TODO 6");
  check(
    "the deployment references the guardrail",
    deployment !== null && /raiPolicyName\s*:/.test(deployment),
    "a guardrail attached to nothing protects nothing, and a bad reference fails open silently",
  );

  const diagnostics = block(src, /resource\s+\w+\s+'Microsoft\.Insights\/diagnosticSettings@[^']+'\s*=\s*\{/);
  check("diagnostic settings are configured", diagnostics !== null, "TODO 7");
  check(
    "both the Audit and Trace categories are sent",
    diagnostics !== null && mentions(diagnostics, "'Audit'") && mentions(diagnostics, "'Trace'"),
    "Audit alone records control-plane activity, not what the agent did",
  );

  check(
    "Application Insights is attached as a connection",
    mentions(src, "category: 'AppInsights'"),
    "in Foundry this is a connection, not a resource property",
  );

  info("Not covered here: the agent's own guardrail overrides the model's, so check both.");
  finish();
}
