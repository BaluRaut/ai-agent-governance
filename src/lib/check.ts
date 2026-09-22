let passed = 0;
let failed = 0;

/** Print a pass/fail line. Returns the condition so you can branch on it. */
export function check(name: string, ok: boolean, hint?: string): boolean {
  if (ok) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✘ ${name}${hint ? `\n    hint: ${hint}` : ""}`);
  }
  return ok;
}

/** Print a heading. */
export function section(title: string): void {
  console.log(`\n${title}\n${"─".repeat(Math.min(title.length, 64))}`);
}

/** Print a line that is information, not a graded check. */
export function info(line: string): void {
  console.log(`  · ${line}`);
}

/** Summarise and set the exit code. Call once at the end of an exercise. */
export function finish(): void {
  console.log(`\n${passed} passed, ${failed} failed${failed === 0 ? " — exercise complete" : ""}`);
  if (failed > 0) process.exitCode = 1;
  // The module is cached across exercises when the runner is in --all mode, so
  // each exercise starts its own count rather than continuing the last one.
  passed = 0;
  failed = 0;
}
