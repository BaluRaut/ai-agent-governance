# 04 · Audit trail

**Families:** observability, identity, data boundary. **Cloud account needed:** no.

## Why

After an incident, one question gets asked, and it is never "do you have logs". It is **why did it do that**. Answering it needs an unbroken chain: this input, under this version of this prompt, with this retrieved context, chose this tool with these arguments, got this result, produced this output, for this person. Miss any link and the honest answer becomes "we don't know".

Two properties separate an audit trail from application logging.

- **It is written for a reader six months from now** who was not there, may not be an engineer, and may be a regulator.
- **It is tamper-evident.** A log anyone can quietly edit proves nothing. You will chain each event to the one before it, so a changed or deleted record shows up.

## Steps

1. Open `exercise.ts`. Implement `emit()`, then `redact()`, then `reconstruct()`.
2. Run: `npm run ex -- 04`

## Done when

The printed reconstruction reads as an account a non-engineer could follow, the chain verifies, and breaking one event on purpose makes verification fail.

## Notice

- **Redact the content, keep the identities.** The `actor` field is the point of an audit log: it must say which agent acted and for whom, so those identifiers stay. What gets redacted is the content the agent handled. Getting this backwards produces a log that is either useless or a second copy of your customer database.
- **Redact when you write, not when you read.** Once a customer's identifiers are in the log store, every downstream copy, export and backup has them too. The retention clock in the data boundary family applies to your audit store as hard as it applies to your database, and audit stores usually hold the most sensitive text in the whole system.
- **Record versions, not just content.** A trace without the prompt version cannot explain a behaviour change, and behaviour changes are what you will actually be investigating.
- **This is also the evidence for other families.** An approval from exercise 02 that is not in a trace did not happen, as far as anyone auditing you is concerned.
