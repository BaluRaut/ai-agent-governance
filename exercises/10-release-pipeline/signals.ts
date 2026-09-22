import type { Severity } from "../../src/lib/controls.js";

/** Everything the earlier exercises produced, arriving at one gate. */
export interface ReleaseSignals {
  agent: string;
  version: string;
  owner: string | null;

  /** From exercise 01, filtered to requirements not yet implemented. */
  openRequirements: Array<{ id: string; family: string; severity: Severity; requirement: string }>;

  /** From exercises 06 and 08: infrastructure conformance. */
  iac: { checked: number; failed: string[] };

  /** From exercise 05: case-level comparison against the accepted baseline. */
  evals: { safetyRegressions: string[]; capabilityRegressions: string[]; total: number };

  /** From a red-team run. Attack success rate, 0 to 1. */
  redTeam: { attackSuccessRate: number; threshold: number };

  /** From exercise 04: is the trace chain intact for the test runs? */
  auditChainVerified: boolean;
}

export interface Waiver {
  /** The finding id this waives. */
  findingId: string;
  owner: string;
  reason: string;
  /** ISO date. A waiver past this date does not apply. */
  expires: string;
}

export interface GateResult {
  deploy: boolean;
  blockers: string[];
  /** Waivers that were applied, so they appear in the record every time. */
  waived: Array<{ findingId: string; owner: string; expires: string }>;
  /** Waivers that were offered but refused, and why. */
  refusedWaivers: string[];
}

const today = "2026-09-22";

const base = (over: Partial<ReleaseSignals> = {}): ReleaseSignals => ({
  agent: "refund-agent",
  version: "v14",
  owner: "platform-team",
  openRequirements: [],
  iac: { checked: 18, failed: [] },
  evals: { safetyRegressions: [], capabilityRegressions: [], total: 40 },
  redTeam: { attackSuccessRate: 0.04, threshold: 0.1 },
  auditChainVerified: true,
  ...over,
});

export const SCENARIOS: Array<{ name: string; signals: ReleaseSignals; waivers: Waiver[]; expectDeploy: boolean }> = [
  {
    name: "clean release",
    signals: base(),
    waivers: [],
    expectDeploy: true,
  },
  {
    name: "safety regression in the eval suite",
    signals: base({ evals: { safetyRegressions: ["safe-dosage"], capabilityRegressions: [], total: 40 } }),
    waivers: [],
    expectDeploy: false,
  },
  {
    name: "infrastructure conformance failure",
    signals: base({ iac: { checked: 18, failed: ["model invocation logging is enabled"] } }),
    waivers: [],
    expectDeploy: false,
  },
  {
    name: "critical requirement still open",
    signals: base({
      openRequirements: [
        { id: "REQ-ACT-01", family: "action", severity: "critical", requirement: "Require confirmation before issuing a refund" },
      ],
    }),
    waivers: [],
    expectDeploy: false,
  },
  {
    name: "critical requirement with a waiver, which is refused",
    signals: base({
      openRequirements: [
        { id: "REQ-ACT-01", family: "action", severity: "critical", requirement: "Require confirmation before issuing a refund" },
      ],
    }),
    waivers: [{ findingId: "REQ-ACT-01", owner: "a.kulkarni", reason: "Shipping for the pilot", expires: "2026-12-31" }],
    expectDeploy: false,
  },
  {
    name: "medium requirement with a valid waiver",
    signals: base({
      openRequirements: [
        { id: "REQ-COST-01", family: "cost", severity: "medium", requirement: "Set a hard platform quota" },
      ],
    }),
    waivers: [{ findingId: "REQ-COST-01", owner: "a.kulkarni", reason: "Quota request with the provider is open", expires: "2026-12-31" }],
    expectDeploy: true,
  },
  {
    name: "medium requirement with an expired waiver",
    signals: base({
      openRequirements: [
        { id: "REQ-COST-01", family: "cost", severity: "medium", requirement: "Set a hard platform quota" },
      ],
    }),
    waivers: [{ findingId: "REQ-COST-01", owner: "a.kulkarni", reason: "Quota request is open", expires: "2026-06-30" }],
    expectDeploy: false,
  },
  {
    name: "red team above threshold",
    signals: base({ redTeam: { attackSuccessRate: 0.23, threshold: 0.1 } }),
    waivers: [],
    expectDeploy: false,
  },
  {
    name: "no owner",
    signals: base({ owner: null }),
    waivers: [],
    expectDeploy: false,
  },
  {
    name: "broken audit chain",
    signals: base({ auditChainVerified: false }),
    waivers: [],
    expectDeploy: false,
  },
];

export { today };
