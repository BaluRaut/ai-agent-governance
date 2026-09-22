/**
 * A machine-readable description of an agent, written BEFORE it is built.
 *
 * Governance work starts here. Almost every control requirement in this
 * repository is derived from one of these fields, which is the point: if you
 * cannot fill this in, you do not yet know what you are about to deploy.
 */

/** How sensitive the data an agent touches is. Ordered, least to most restricted. */
export const DATA_CLASSES = [
  "public",
  "internal",
  "confidential",
  "personal",
  "special-category",
] as const;
export type DataClass = (typeof DATA_CLASSES)[number];

/** What a tool does to the world. This, not the tool's name, decides its controls. */
export type Effect =
  /** Returns information and changes nothing. */
  | "read"
  /** Changes state that can be corrected afterwards. */
  | "write"
  /** Moves money, sends a message, deletes a record: cannot be taken back. */
  | "irreversible";

/** How much the agent is trusted to proceed on its own. */
export type Autonomy =
  /** Drafts for a person, who acts. */
  | "suggest"
  /** Acts, but a person approves each consequential step. */
  | "act-with-approval"
  /** Acts on its own within its permissions. */
  | "act";

export interface ToolSpec {
  name: string;
  effect: Effect;
  /** True when the tool writes to a system other teams rely on as the truth. */
  systemOfRecord?: boolean;
  /** Data classes this tool can reach. */
  dataClasses?: DataClass[];
  /** True when the tool can send data outside the organisation's boundary. */
  egress?: boolean;
}

export interface AgentSpec {
  id: string;
  name: string;
  purpose: string;
  /** Where it runs. Drives which platform controls in reference/platforms apply. */
  platform:
    | "bedrock"
    | "vertex-ai"
    | "copilot-studio"
    | "azure-ai-foundry"
    | "self-hosted";
  autonomy: Autonomy;
  /** Who can talk to it. */
  audience: "internal" | "customer" | "public";
  /** Data classes reachable anywhere in the agent, including through its tools. */
  dataClasses: DataClass[];
  tools: ToolSpec[];
  /**
   * True when the agent reads content that neither you nor the user authored:
   * web pages, inbound email, uploaded documents, third-party API responses.
   * This is the single field that most changes an agent's risk.
   */
  ingestsUntrustedContent: boolean;
  memory?: {
    enabled: boolean;
    scope: "session" | "user" | "tenant";
    retentionDays?: number;
  };
  /** Regions the workload is permitted to run and store data in. */
  regions?: string[];
  /** Expected monthly spend in USD, if known. Used by the cost family. */
  budgetUsdPerMonth?: number;
}

/** True when the agent can reach data at or above the given class. */
export function touchesAtLeast(spec: AgentSpec, cls: DataClass): boolean {
  const floor = DATA_CLASSES.indexOf(cls);
  const all = new Set<DataClass>([
    ...spec.dataClasses,
    ...spec.tools.flatMap((t) => t.dataClasses ?? []),
  ]);
  return [...all].some((c) => DATA_CLASSES.indexOf(c) >= floor);
}

/** Tools whose effect is at least as consequential as the one given. */
export function toolsWithEffect(spec: AgentSpec, ...effects: Effect[]): ToolSpec[] {
  return spec.tools.filter((t) => effects.includes(t.effect));
}

/** True when any tool can send data outside the organisation. */
export function canEgress(spec: AgentSpec): boolean {
  return spec.tools.some((t) => t.egress === true);
}

/**
 * The three properties that, together, make data exfiltration possible without
 * anyone attacking your infrastructure: the agent can reach data worth taking,
 * it reads content an attacker can write, and it has a way to send data out.
 * Any two are usually survivable. All three is the combination to design away.
 */
export function hasExfiltrationTriad(spec: AgentSpec): boolean {
  return (
    touchesAtLeast(spec, "confidential") &&
    spec.ingestsUntrustedContent &&
    canEgress(spec)
  );
}
