/**
 * The ten control families used throughout this repository.
 *
 * They are deliberately platform-neutral. Every platform under reference/platforms
 * is described in terms of these families, so you can compare like with like, and
 * every exercise states which families it exercises.
 */
export const CONTROL_FAMILIES = [
  "identity",
  "authorization",
  "input",
  "output",
  "action",
  "data-boundary",
  "observability",
  "evaluation",
  "cost",
  "lifecycle",
] as const;

export type ControlFamily = (typeof CONTROL_FAMILIES)[number];

export const FAMILY_TITLES: Record<ControlFamily, string> = {
  identity: "Identity",
  authorization: "Authorization",
  input: "Input controls",
  output: "Output controls",
  action: "Action controls",
  "data-boundary": "Data boundary",
  observability: "Observability",
  evaluation: "Evaluation",
  cost: "Cost and quota",
  lifecycle: "Lifecycle",
};

/** The question each family exists to answer. Useful when reviewing a design. */
export const FAMILY_QUESTIONS: Record<ControlFamily, string> = {
  identity: "Who is this agent, as distinct from the person who triggered it?",
  authorization: "What may it do, and is that the least it needs?",
  input: "What reaches its context, and who can influence that?",
  output: "What may leave, and what must never leave?",
  action: "Which actions change the world, and who approves those?",
  "data-boundary": "Where does the data sit, who holds the keys, how long is it kept?",
  observability: "Could you reconstruct a single decision six months from now?",
  evaluation: "How do you know it still behaves, after the last change?",
  cost: "What stops one loop from spending the quarter's budget overnight?",
  lifecycle: "Who approved this version, and how would you withdraw it?",
};

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export function severityRank(s: Severity): number {
  return SEVERITIES.indexOf(s);
}

/** A control requirement raised against an agent design. */
export interface Requirement {
  family: ControlFamily;
  severity: Severity;
  /** Imperative and testable: what must be true. */
  requirement: string;
  /** Which property of the agent triggered this. */
  because: string;
}

export function sortRequirements(rs: Requirement[]): Requirement[] {
  return [...rs].sort(
    (a, b) =>
      severityRank(b.severity) - severityRank(a.severity) ||
      CONTROL_FAMILIES.indexOf(a.family) - CONTROL_FAMILIES.indexOf(b.family) ||
      a.requirement.localeCompare(b.requirement),
  );
}

export function formatRequirements(rs: Requirement[]): string {
  if (rs.length === 0) return "  (none)";
  return sortRequirements(rs)
    .map(
      (r) =>
        `  [${r.severity.toUpperCase().padEnd(8)}] ${FAMILY_TITLES[r.family].padEnd(15)} ${r.requirement}\n` +
        `${" ".repeat(28)}because ${r.because}`,
    )
    .join("\n");
}
