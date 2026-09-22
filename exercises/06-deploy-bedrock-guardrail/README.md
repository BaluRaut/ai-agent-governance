# 06 · Deploy a Bedrock guardrail

**Families:** input, output, data boundary, observability, authorization.
**Cloud account needed:** no, to pass the checks. Yes, to apply it for real.

## What you will build

Terraform for four things that belong together, and are usually built separately and then never joined up:

1. A **guardrail** with content filters, a denied topic, personal data filters and contextual grounding.
2. A **published numeric version** of it, because enforcement cannot reference a draft.
3. **Model invocation logging**, so there is a record of what was actually sent.
4. An **IAM policy that denies inference unless the guardrail is attached**, because a guardrail an application can simply not pass is a suggestion.

That fourth piece is the one people miss. Steps one to three give you a control; step four makes it mandatory.

## How this is graded without an account

`npm run ex -- 06` reads the files in `terraform/` and checks that each control is present and correctly configured. It makes no API calls and costs nothing. Where a production pipeline would run `terraform plan` and evaluate policy against the plan output, this keeps the exercise runnable anywhere. Exercise 10 builds the pipeline version.

If you have Terraform installed, `terraform -chdir=terraform validate` is a useful second check on syntax.

## Steps

1. Open the files in `terraform/` and complete the `TODO` blocks.
2. Run: `npm run ex -- 06`
3. Compare against `solution/terraform/` when you are done.

## Applying it for real

Only with an account you are allowed to change, and read the cost note first.

```bash
cd exercises/06-deploy-bedrock-guardrail/terraform
terraform init
terraform plan -out=tf.plan      # read this before applying
terraform apply tf.plan
# when you are finished
terraform destroy
```

**Cost.** The guardrail itself has no standing charge; you are billed per text unit evaluated. The KMS key carries a small monthly charge. Model invocation logging bills CloudWatch Logs or S3 storage, and on a busy account that is the line item that surprises people. Destroy what you create.

## Notice

- **Guardrails do not work on the `bedrock-mantle` endpoint.** Neither does model invocation logging. If your application uses that endpoint, everything in this exercise silently does not apply to it. Check which endpoint your SDK is configured for before you conclude you are covered.
- **Guardrails do not evaluate tool-use fields.** Content and personal data filters skip tool input, tool results and tool specifications. An agent's most dangerous traffic is exactly there, which is why AgentCore Policy at the gateway exists and why exercise 02 mattered.
- **Personal data masking does not reach the invocation logs.** The logged input always contains the original unmodified request. If you enable logging, you have created a second store of unredacted customer data, and it inherits every retention and access obligation your database has. CloudWatch Logs data protection is the mitigation.
- **The version must be numeric.** Draft is mutable, so enforcement will not accept it, and a mutable guardrail is not a control anyone can attest to.
