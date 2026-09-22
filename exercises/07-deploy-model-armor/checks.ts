import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { check, finish, info, section } from "../../src/lib/check.js";
import { arg, argAll, blocks, loadIac, mentions, resource } from "../../src/lib/iac.js";

const here = dirname(fileURLToPath(import.meta.url));

export function run(relativeDir: string, title: string): void {
  section(title);
  const src = loadIac(join(here, relativeDir));
  if (src.trim().length === 0) {
    check("terraform files were found", false, `nothing readable in ${relativeDir}`);
    finish();
    return;
  }

  const template = resource(src, "google_model_armor_template");
  const raiTypes = template ? blocks(template, /rai_filters\s*\{/).map((b) => arg(b, "filter_type")) : [];
  const NEEDED = ["HATE_SPEECH", "HARASSMENT", "SEXUALLY_EXPLICIT", "DANGEROUS_CONTENT"];
  const missing = NEEDED.filter((t) => !raiTypes.includes(t));

  check("a Model Armor template exists", template !== null);
  check("the four responsible AI filters are configured", missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : "TODO 1");
  check(
    "prompt injection and jailbreak detection is enabled",
    template !== null && /pi_and_jailbreak_filter_settings\s*\{[\s\S]*?filter_enforcement\s*=\s*"ENABLED"/.test(template),
    "TODO 2: the filter that matters most for an agent",
  );
  check("malicious URL detection is enabled", template !== null && mentions(template, "malicious_uri_filter_settings"), "TODO 3");
  check(
    "sanitize operations are logged",
    template !== null && /log_sanitize_operations\s*=\s*true/.test(template),
    "without this you cannot show what the filter did",
  );

  const floor = resource(src, "google_model_armor_floorsetting");
  check("a floor setting exists", floor !== null, "TODO 4: this is the control nobody can configure below");
  check("floor setting enforcement is on", floor !== null && /enable_floor_setting_enforcement\s*=\s*true/.test(floor), "TODO 4");
  check("the floor blocks rather than only inspecting", floor !== null && /inspect_and_block\s*=\s*true/.test(floor), "inspect-only records the problem and ships it");
  check("the floor covers the AI platform service", floor !== null && mentions(floor, "AI_PLATFORM"), "TODO 4");
  check(
    "the floor also requires injection detection",
    floor !== null && mentions(floor, "pi_and_jailbreak_filter_settings"),
    "a floor that omits it lets a team omit it too",
  );

  const allowed = resource(src, "google_org_policy_policy", "allowed_models");
  check("a model allowlist policy exists", allowed !== null, "TODO 5");
  check(
    "the allowlist names models individually with an action",
    allowed !== null && /publishers\/[^"]+\/models\/[^"]+:(predict|deploy|tune)/.test(allowed),
    "values take the form publishers/PUBLISHER/models/MODEL:ACTION",
  );
  check("grounding sources are constrained too", resource(src, "google_org_policy_policy", "grounding_sources") !== null);

  const engine = resource(src, "google_vertex_ai_reasoning_engine");
  check("an agent runtime is declared", engine !== null, "TODO 6");
  check(
    "the agent uses its own identity, not a shared service account",
    engine !== null && /identity_type\s*=\s*"AGENT_IDENTITY"/.test(engine),
    "TODO 6: this field is immutable, so it cannot be added later",
  );

  const binding = resource(src, "google_project_iam_member");
  check(
    "baseline roles are granted to a principalSet, not to one agent",
    binding !== null && mentions(binding, "principalSet://"),
    "redeployment gives an agent a new principal and prior grants are not inherited",
  );

  const budget = resource(src, "google_billing_budget");
  check("a budget exists", budget !== null, "TODO 7");
  check(
    "the budget has at least two threshold rules",
    budget !== null && argAll(budget, "threshold_percent").length >= 2,
    "one threshold gives you no warning before the last one",
  );

  info("The budget alerts. It does not cap. Set the real spend cap in the console and record that you did.");
  finish();
}
