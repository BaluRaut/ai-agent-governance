import type { Sample } from "./corpus.js";

export interface Verdict {
  flagged: boolean;
  signals: string[];
}

export interface Scores {
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
  recall: number;
  precision: number;
  falsePositiveRate: number;
}

export function score(samples: Sample[], detect: (t: string) => Verdict): Scores {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const s of samples) {
    const flagged = detect(s.text).flagged;
    if (s.injection && flagged) tp++;
    else if (s.injection && !flagged) fn++;
    else if (!s.injection && flagged) fp++;
    else tn++;
  }
  return {
    truePositive: tp,
    falsePositive: fp,
    trueNegative: tn,
    falseNegative: fn,
    recall: tp + fn === 0 ? 1 : tp / (tp + fn),
    precision: tp + fp === 0 ? 1 : tp / (tp + fp),
    falsePositiveRate: fp + tn === 0 ? 0 : fp / (fp + tn),
  };
}

export function report(name: string, s: Scores): void {
  const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
  console.log(
    `  ${name.padEnd(14)} recall ${pct(s.recall).padStart(4)}   ` +
      `precision ${pct(s.precision).padStart(4)}   ` +
      `false positives ${pct(s.falsePositiveRate).padStart(4)}   ` +
      `(caught ${s.truePositive}, missed ${s.falseNegative}, wrongly flagged ${s.falsePositive})`,
  );
}

export function missed(samples: Sample[], detect: (t: string) => Verdict): Sample[] {
  return samples.filter((s) => s.injection && !detect(s.text).flagged);
}
