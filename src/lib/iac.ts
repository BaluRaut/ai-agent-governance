import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * A deliberately small reader for infrastructure code.
 *
 * It is not a parser. It finds blocks by their header and reads arguments out of
 * them, which is enough to check that a control is present and configured, and
 * needs no cloud account, no credentials and no Terraform binary. Where a real
 * pipeline would run `terraform plan` and evaluate policy against the plan JSON,
 * this keeps the exercises runnable on a laptop on a train.
 */

/** Read every .tf and .bicep file in a directory, with comments stripped. */
export function loadIac(dir: string): string {
  if (!existsSync(dir)) return "";
  const files = readdirSync(dir).filter((f) => f.endsWith(".tf") || f.endsWith(".bicep"));
  const raw = files.map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/(^|\s)(#|\/\/).*$/, ""))
    .join("\n");
}

/**
 * Return the body of the first block whose header matches, with braces balanced.
 * Works for Terraform blocks and Bicep resources alike.
 */
export function block(src: string, header: RegExp): string | null {
  const match = header.exec(src);
  if (!match) return null;
  let i = src.indexOf("{", match.index);
  if (i === -1) return null;
  let depth = 0;
  const start = i + 1;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i);
    }
  }
  return null;
}

/** Every block body whose header matches. */
export function blocks(src: string, header: RegExp): string[] {
  const out: string[] = [];
  const global = new RegExp(header.source, header.flags.includes("g") ? header.flags : header.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = global.exec(src)) !== null) {
    const body = block(src.slice(m.index), new RegExp(header.source, header.flags));
    if (body !== null) out.push(body);
  }
  return out;
}

/** True when a Terraform resource of this type exists, optionally with this name. */
export function hasResource(src: string, type: string, name?: string): boolean {
  const n = name ? `"${name}"` : `"[^"]+"`;
  return new RegExp(`resource\\s+"${type}"\\s+${n}\\s*\\{`).test(src);
}

/** The body of a named Terraform resource. */
export function resource(src: string, type: string, name?: string): string | null {
  const n = name ? `"${name}"` : `"[^"]+"`;
  return block(src, new RegExp(`resource\\s+"${type}"\\s+${n}\\s*\\{`));
}

/** The value of `key = ...` inside a body, as written, quotes stripped. */
export function arg(body: string | null, key: string): string | null {
  if (!body) return null;
  const m = new RegExp(`(^|\\n)\\s*${key}\\s*=\\s*([^\\n]+)`).exec(body);
  if (!m) return null;
  return m[2]!.trim().replace(/^["']|["'],?$/g, "").trim();
}

/** Every value of a repeated `key = ...` inside a body. */
export function argAll(body: string | null, key: string): string[] {
  if (!body) return [];
  const out: string[] = [];
  const re = new RegExp(`(^|\\n)\\s*${key}\\s*=\\s*([^\\n]+)`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) out.push(m[2]!.trim().replace(/^["']|["'],?$/g, "").trim());
  return out;
}

/** True when the text contains this literal, ignoring case and whitespace runs. */
export function mentions(src: string, needle: string): boolean {
  const flat = (s: string) => s.toLowerCase().replace(/\s+/g, " ");
  return flat(src).includes(flat(needle));
}
