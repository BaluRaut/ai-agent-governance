# 03 · Injection testing

**Families:** input, output, action. **Cloud account needed:** no.

## Why

Every platform in this repository sells you an input filter. Before you buy one, build a bad one and measure it. Ten minutes of measurement will teach you more about what filters can and cannot do than any product page.

The thing to understand: a model has no reliable way to tell your instructions from text it was handed. A retrieved document, a web page, an uploaded PDF, an inbound email. All of it arrives as tokens in one context, and all of it reads as instructions. This is not a defect awaiting a patch. It is how the architecture works.

So the question is never "is the filter good". It is "what is my plan for the fraction that gets through".

## Steps

1. Open `exercise.ts`. Implement `detect()` using the signals listed in the TODOs.
2. Run it: `npm run ex -- 03`. Read the precision and recall it prints.
3. Then read the second table, the evasion set, and see what walked past you.
4. The last check is the point of the exercise. Do not skip it.

## Done when

Recall on the main corpus is at or above 0.70, false positives on benign text are at or below 0.15, and you have seen the evasion set get through.

## Notice

- **Recall and precision pull against each other.** Widen the patterns to catch more attacks and you start blocking ordinary sentences. An agent that refuses a fifth of honest requests gets switched off by its users, which is a security outcome too.
- **A commercial filter is a better version of the same shape.** It has a trained classifier instead of your patterns, so its numbers are better. Its numbers are still not 1.0, and it still cannot see intent.
- **This is why the last check exists.** The detector's job is to reduce the rate. The policy engine from exercise 02 is what makes the remainder survivable, by requiring a person before anything irreversible happens. Layers, not a wall.
