# 07 · Deploy Model Armor and a model allowlist

**Families:** input, output, authorization, lifecycle, cost.
**Cloud account needed:** no, to pass the checks. Yes, to apply it.

## What you will build

Terraform for the two controls that make Google's platform governable from the top rather than per application:

1. A **Model Armor template** with prompt injection and jailbreak detection, the responsible AI filters, and malicious URL detection.
2. A **floor setting**, which is the good idea on this platform. A floor setting defines the **minimum** every template in an organisation, folder or project must meet. Teams may be stricter. They cannot be weaker.
3. An **organisation policy** that allowlists which models may be used at all.
4. An **agent** deployed with agent identity rather than a shared service account.
5. A **budget**, with an honest note about what Terraform can and cannot do here.

## Why the floor setting matters more than the template

A template is a control one team applies. A floor setting is a control nobody can configure their way below. If you take one idea from this platform into your own architecture, take that one: express the baseline as a floor rather than as a default, because a default is something people change.

## Steps

1. Complete the `TODO` blocks in `terraform/`.
2. Run: `npm run ex -- 07`
3. Compare with `solution/terraform/`.

## Done when

Every check passes, and you can say in one sentence why the floor setting is a stronger control than the template, even though the template has more filters in it.

## Applying it for real

First time on this platform? [Provider setup](../../reference/provider-setup.md) has the account prerequisites, the APIs to enable, permissions, CLI authentication and teardown.

## Verify the provider schema before you apply

These resources are newer than most, and the provider schema moves. The **verified** command-line forms are below; treat them as the source of truth and check the Terraform field names against the current provider registry before applying. `terraform validate` will catch most of it.

```bash
gcloud model-armor templates create TEMPLATE_ID \
  --project=PROJECT_ID --location=LOCATION \
  --rai-settings-filters='[{"filterType":"HATE_SPEECH","confidenceLevel":"MEDIUM_AND_ABOVE"}]' \
  --pi-and-jailbreak-filter-settings-enforcement=enabled \
  --pi-and-jailbreak-filter-settings-confidence-level=HIGH \
  --malicious-uri-filter-settings-enforcement=enabled \
  --template-metadata-log-sanitize-operations

gcloud model-armor floorsettings update \
  --full-uri=projects/PROJECT_ID/locations/global/floorSetting \
  --add-integrated-services=VERTEX_AI \
  --vertex-ai-enforcement-type=INSPECT_AND_BLOCK
```

**Cost.** Model Armor bills per screened request. The organisation policy and floor setting cost nothing. Deploying an agent runtime bills while it exists, so destroy it.

## Notice

- **Model Armor fails open.** The documentation says sanitisation may be skipped if the service is unavailable or unreachable, and a request routed to a region with no matching template errors. Create the template in every region you serve from, and decide in advance what your application does when screening did not happen.
- **Gemini's own filters default to Off on newer models**, and are available for response filtering only, not prompt filtering. So the built-in filters are not the input control. Model Armor is.
- **Location constraints do not cover generative AI the way you expect.** Resource location constraints do not apply to Model Garden publisher models, and are not enforced through the SDKs or the REST API. Use `constraints/gcp.restrictEndpointUsage` for that job.
- **Redeploying an agent changes its principal.** A new `reasoningEngines` resource means a new identity, and prior grants are not inherited. Grant baseline roles to a project-wide `principalSet` rather than to each agent, or re-bind after every deploy.
- **Spend caps are not in Terraform.** Google now has a genuine hard cap that blocks usage at 100% of budget, including provisioned throughput, but the documentation shows it as console-only. The Terraform below sets an alerting budget, which is not the same thing, and the comment says so.
