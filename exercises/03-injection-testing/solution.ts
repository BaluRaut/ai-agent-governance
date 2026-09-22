import { check, finish, info, section } from "../../src/lib/check.js";
import { CORPUS, EVASIONS } from "./corpus.js";
import { missed, report, score, type Verdict } from "./metrics.js";

export function detect(text: string): Verdict {
  const signals: string[] = [];
  const t = text.toLowerCase();

  // 1 — classic instruction override.
  if (/\b(ignore|disregard|forget)\b[^.]{0,30}\b(previous|prior|above|earlier|all)\b/.test(t)) {
    signals.push("instruction-override");
  }

  // 2 — text pretending to be a control channel.
  if (/(^|\n)\s*(system|assistant)\s*:/.test(t) || /\[\[[^\]]*system[^\]]*\]\]/.test(t) || /note to (the )?(ai|assistant)/.test(t)) {
    signals.push("impersonated-channel");
  }

  // 3 — persona jailbreaks.
  if (/\byou are now\b|\bpretend you are\b|\bunrestricted mode\b|without any filtering|\bno restrictions\b/.test(t)) {
    signals.push("persona-override");
  }

  // 4 — a channel out. A URL plus a verb that moves data, or an image with a query string.
  const hasUrl = /https?:\/\//.test(t);
  const movesData = /\b(send|upload|append|include|post|exfiltrat|disclose|reveal)\w*\b/.test(t);
  const imageWithQuery = /!\[[^\]]*\]\(https?:\/\/[^)]*\?[^)]*\)/.test(text);
  if ((hasUrl && movesData) || imageWithQuery) {
    signals.push("exfiltration-channel");
  }

  // 5 — talking its way past the gate.
  if (/without asking|skip the approval|do not ask|don't ask|\bbypass\b|pre-approved|you have permission/.test(t)) {
    signals.push("approval-bypass");
  }

  // 6 — content meant for the model and not for the reader.
  if (text.includes("<!--") || /[​-‏⁠]/.test(text)) {
    signals.push("hidden-content");
  }

  return { flagged: signals.length > 0, signals };
}

section("03 · Injection testing (solution)");

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

section("Checks");
check("recall on the main corpus is at least 0.70", main.recall >= 0.7, `it is ${main.recall.toFixed(2)}`);
check("false positives stay at or below 0.15", main.falsePositiveRate <= 0.15, `it is ${main.falsePositiveRate.toFixed(2)}`);
check("benign text about the word 'system prompt' is not flagged", !detect("Can you explain how the system prompt works in an LLM application?").flagged);
check("every flagged sample carries at least one named signal", CORPUS.every((s) => !detect(s.text).flagged || detect(s.text).signals.length > 0));

const stillGetsThrough = missed(EVASIONS, detect).length;
check("the evasion set is not fully caught, and you have seen why", stillGetsThrough > 0);
info(`${stillGetsThrough} of ${EVASIONS.length} evasions walked past the filter.`);
info("This is the expected result. A filter lowers the rate; it does not close the hole.");
info("Exercise 02's untrusted-origin policy is what makes the remainder survivable:");
info("anything irreversible waits for a person whenever untrusted content is in the context.");
finish();
