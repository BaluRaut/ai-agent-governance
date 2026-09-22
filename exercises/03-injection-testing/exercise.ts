import { check, finish, info, section } from "../../src/lib/check.js";
import { CORPUS, EVASIONS } from "./corpus.js";
import { missed, report, score, type Verdict } from "./metrics.js";

/**
 * A crude prompt-injection detector.
 *
 * Return every signal you find. Signals are what an analyst reads afterwards;
 * a bare true/false tells them nothing about why.
 */
export function detect(text: string): Verdict {
  const signals: string[] = [];
  const t = text.toLowerCase();

  // Signal 1 — written for you. Classic instruction override.
  if (/\b(ignore|disregard|forget)\b[^.]{0,30}\b(previous|prior|above|earlier|all)\b/.test(t)) {
    signals.push("instruction-override");
  }

  // TODO 2 — impersonated control messages. Look for text pretending to be a
  //   system or assistant channel: "system:", "[[...system...]]", "note to ai",
  //   "assistant:". Push the signal "impersonated-channel".

  // TODO 3 — persona jailbreaks. Look for "you are now", "pretend you are",
  //   "unrestricted mode", "without any filtering", "no restrictions".
  //   Push "persona-override".

  // TODO 4 — exfiltration shape. A URL carrying conversation content, or an
  //   instruction to send data somewhere. Look for an http(s) URL appearing
  //   together with words like send, upload, append, include, post, or a
  //   markdown image whose URL has a query string. Push "exfiltration-channel".

  // TODO 5 — approval bypass. Look for "without asking", "skip the approval",
  //   "do not ask", "bypass", "pre-approved", "you have permission".
  //   Push "approval-bypass".

  // TODO 6 — hidden content. HTML comments, or zero-width characters.
  //   Test for "<!--" or /[​-‏⁠]/ in the ORIGINAL text, not the
  //   lowercased copy. Push "hidden-content".

  return { flagged: signals.length > 0, signals };
}

section("03 · Injection testing");

const main = score(CORPUS, detect);
const evasion = score(EVASIONS, detect);
report("main corpus", main);
report("evasion set", evasion);

section("What got through");
const got = missed(CORPUS, detect);
const gotEvasions = missed(EVASIONS, detect);
for (const s of [...got, ...gotEvasions]) {
  console.log(`  ${s.id.padEnd(4)} [${s.category.padEnd(12)}] ${s.text.replace(/\s+/g, " ").slice(0, 88)}`);
}
if (got.length + gotEvasions.length === 0) info("nothing, which almost certainly means the patterns are too wide");

section("Checks");
check("recall on the main corpus is at least 0.70", main.recall >= 0.7, `it is ${main.recall.toFixed(2)} — work through TODOs 2 to 6`);
check("false positives stay at or below 0.15", main.falsePositiveRate <= 0.15, `it is ${main.falsePositiveRate.toFixed(2)} — the benign samples b3 and b5 are meant to tempt you`);
check("benign text about the word 'system prompt' is not flagged", !detect("Can you explain how the system prompt works in an LLM application?").flagged, "asking about a thing is not doing the thing");
check("every flagged sample carries at least one named signal", CORPUS.every((s) => !detect(s.text).flagged || detect(s.text).signals.length > 0));

// The point of the exercise.
const stillGetsThrough = missed(EVASIONS, detect).length;
check(
  "the evasion set is not fully caught, and you have seen why",
  stillGetsThrough > 0,
  "if you caught all six, your patterns are almost certainly over-fitted and your false positives will be worse in production",
);
info(`${stillGetsThrough} of ${EVASIONS.length} evasions walked past the filter.`);
info("This is the expected result. A filter lowers the rate; it does not close the hole.");
info("Exercise 02's untrusted-origin policy is what makes the remainder survivable:");
info("anything irreversible waits for a person whenever untrusted content is in the context.");
finish();
