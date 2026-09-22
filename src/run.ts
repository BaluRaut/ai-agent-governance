import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const exercisesDir = join(here, "..", "exercises");
const folders = readdirSync(exercisesDir).filter((f) => /^\d\d-/.test(f)).sort();
const args = process.argv.slice(2);
const wanted = args.find((a) => !a.startsWith("--"));
const which = args.includes("--solution") ? "solution" : "exercise";

function label(folder: string): string {
  return folder.replace(/^(\d\d)-/, "$1  ").replace(/-/g, " ");
}

if (args.includes("--list") || (!wanted && !args.includes("--all"))) {
  console.log("\nExercises\n─────────");
  for (const f of folders) {
    const cloud = existsSync(join(exercisesDir, f, "terraform")) || existsSync(join(exercisesDir, f, "bicep"));
    console.log(`  ${label(f)}${cloud ? "   [deploys to a cloud account]" : ""}`);
  }
  console.log("\nRun one:            npm run ex -- 03");
  console.log("Run a solution:     npm run ex -- 03 --solution");
  console.log("Run every check:    npm run check:all");
  process.exit(0);
}

// --all runs every exercise's own checks, so you can see where you stand.
if (args.includes("--all")) {
  let failedAny = false;
  for (const folder of folders) {
    const file = join(exercisesDir, folder, `${which}.ts`);
    if (!existsSync(file)) continue;
    try {
      await import(pathToFileURL(file).href);
    } catch (error) {
      failedAny = true;
      console.error(`\n${folder} threw: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (process.exitCode === 1) failedAny = true;
  }
  console.log(failedAny ? "\nSome exercises failed." : "\nEvery exercise passed.");
  process.exitCode = failedAny ? 1 : 0;
  process.exit(process.exitCode);
}

const folder = folders.find((f) => f === wanted || f.startsWith(String(wanted).padStart(2, "0") + "-"));
if (!folder) {
  console.error(`No exercise matches "${wanted}". Try: npm run list`);
  process.exit(1);
}
const file = join(exercisesDir, folder, `${which}.ts`);
if (!existsSync(file)) {
  console.error(`Missing ${file}`);
  process.exit(1);
}
console.log(`▶ ${folder}/${which}.ts`);
await import(pathToFileURL(file).href);
