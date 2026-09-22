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

  const guardrail = resource(src, "aws_bedrock_guardrail");
  const contentPolicy = guardrail ? blocks(guardrail, /content_policy_config\s*\{/) : [];
  const filterTypes = contentPolicy.flatMap((b) => argAll(b, "type"));
  const REQUIRED = ["PROMPT_ATTACK", "HATE", "INSULTS", "SEXUAL", "VIOLENCE", "MISCONDUCT"];
  const missing = REQUIRED.filter((t) => !filterTypes.includes(t));

  check("a guardrail resource exists", guardrail !== null, "TODO 1 onwards live in guardrail.tf");
  check(
    "all six content filter categories are configured",
    missing.length === 0,
    missing.length ? `missing: ${missing.join(", ")}` : undefined,
  );
  check(
    "the prompt attack filter is at HIGH on input",
    contentPolicy.some((b) => /PROMPT_ATTACK/.test(b) && /input_strength\s*=\s*"HIGH"/.test(b)),
    "this is the filter that matters most for an agent",
  );

  const topics = guardrail ? blocks(guardrail, /topics_config\s*\{/) : [];
  check("at least one denied topic is defined", topics.length >= 1, "TODO 2");
  check(
    "each denied topic has a definition, not just a name",
    topics.length > 0 && topics.every((t) => (arg(t, "definition") ?? "").length > 20),
    "the model classifies on the definition; a bare name gives it nothing to work with",
  );

  const pii = guardrail ? blocks(guardrail, /pii_entities_config\s*\{/) : [];
  const actions = pii.map((b) => arg(b, "action"));
  check("personal data filters are configured", pii.length >= 2, "TODO 3");
  check("at least one type is blocked outright", actions.includes("BLOCK"), "TODO 3: something that must never appear");
  check("at least one type is anonymised rather than blocked", actions.includes("ANONYMIZE"), "TODO 3: refusing everything makes the agent useless");

  const grounding = guardrail ? blocks(guardrail, /contextual_grounding_policy_config\s*\{/) : [];
  const groundingTypes = grounding.flatMap((b) => argAll(b, "type"));
  check(
    "contextual grounding and relevance are both configured",
    groundingTypes.includes("GROUNDING") && groundingTypes.includes("RELEVANCE"),
    "TODO 4",
  );
  const thresholds = grounding.flatMap((b) => argAll(b, "threshold")).map(Number);
  check(
    "every grounding threshold is between 0 and 0.99",
    thresholds.length > 0 && thresholds.every((t) => t > 0 && t <= 0.99),
    "1 is not a valid threshold",
  );

  check("the guardrail is encrypted with a customer-managed key", arg(guardrail, "kms_key_arn") !== null, "without this it uses an AWS managed key");

  const version = resource(src, "aws_bedrock_guardrail_version");
  check("a numeric version is published", version !== null, "TODO 5: enforcement cannot reference DRAFT");

  const logging = resource(src, "aws_bedrock_model_invocation_logging_configuration");
  check("model invocation logging is enabled", logging !== null, "TODO 6");
  const logGroup = resource(src, "aws_cloudwatch_log_group");
  check(
    "the log group has a deliberate retention period",
    (arg(logGroup, "retention_in_days") ?? "") !== "",
    "the logs hold unmasked customer data, so retention is not optional",
  );

  const enforce = resource(src, "aws_iam_policy", "require_guardrail");
  check("an enforcement policy exists", enforce !== null, "TODO 7 in enforcement.tf");
  check(
    "it denies rather than allows",
    enforce !== null && /Effect\s*=\s*"Deny"/.test(enforce),
    "an Allow cannot make anything mandatory",
  );
  check(
    "it keys on bedrock:GuardrailIdentifier",
    enforce !== null && mentions(enforce, "bedrock:GuardrailIdentifier"),
    "this is the condition key that makes the guardrail compulsory",
  );
  check(
    "it covers the streaming and Converse operations too",
    enforce !== null && mentions(enforce, "bedrock:Converse") && mentions(enforce, "bedrock:InvokeModelWithResponseStream"),
    "denying only InvokeModel leaves three ways around it",
  );

  info("Remember what this does not cover: the bedrock-mantle endpoint, and tool-use fields.");
  finish();
}
