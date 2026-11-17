/**
 * One-rep-max (e1RM) estimators.
 *
 * Every formula here has the form `weight * factor(reps)`, so the inverse
 * (what weight should I use for N reps?) is exact: `oneRm / factor(reps)`.
 *
 * Convention: a set of 1 rep returns the weight lifted unchanged, because a
 * successful single is the max by definition. Without this, several formulas
 * (Epley, Mayhew, ...) report a 1RM higher than the weight actually lifted.
 *
 * Accuracy: these are regressions on small samples. Treat anything beyond
 * ~10 reps as a rough guess.
 */

export type OneRmFormula = "epley" | "brzycki" | "lombardi" | "oconnor" | "mayhew" | "wathen" | "lander";

export const ONE_RM_FORMULAS: readonly OneRmFormula[] = ["epley", "brzycki", "lombardi", "oconnor", "mayhew", "wathen", "lander"];

/** Highest rep count accepted. Brzycki and Lander are singular at 37 and 38 reps. */
export const MAX_REPS = 36;

function assertReps(reps: number): void {
  if (typeof reps !== "number" || !Number.isInteger(reps) || reps < 1 || reps > MAX_REPS) {
    throw new RangeError(`reps must be an integer from 1 to ${MAX_REPS}, got ${String(reps)}`);
  }
}

/** The multiplier a formula applies to the lifted weight at a given rep count. */
export function repFactor(reps: number, formula: OneRmFormula = "epley"): number {
  assertReps(reps);
  if (reps === 1) return 1;
  switch (formula) {
    case "epley":
      return 1 + reps / 30;
    case "brzycki":
      return 36 / (37 - reps);
    case "lombardi":
      return Math.pow(reps, 0.1);
    case "oconnor":
      return 1 + reps / 40;
    case "mayhew":
      return 100 / (52.2 + 41.9 * Math.exp(-0.055 * reps));
    case "wathen":
      return 100 / (48.8 + 53.8 * Math.exp(-0.075 * reps));
    case "lander":
      return 100 / (101.3 - 2.67123 * reps);
    default: {
      const never: never = formula;
      throw new TypeError(`unknown formula: ${String(never)}`);
    }
  }
}

function assertWeight(weight: number): void {
  if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) {
    throw new RangeError(`weight must be a positive finite number, got ${String(weight)}`);
  }
}

/** Estimate a one-rep max from a submaximal set. Same unit in, same unit out. */
export function estimateOneRepMax(weight: number, reps: number, formula: OneRmFormula = "epley"): number {
  assertWeight(weight);
  return weight * repFactor(reps, formula);
}

/** Estimate with every formula, plus the mean and min/max spread. */
export function estimateOneRepMaxAll(weight: number, reps: number): {
  estimates: Record<OneRmFormula, number>;
  mean: number;
  min: number;
  max: number;
} {
  assertWeight(weight);
  const estimates = {} as Record<OneRmFormula, number>;
  for (const f of ONE_RM_FORMULAS) estimates[f] = weight * repFactor(reps, f);
  const values = Object.values(estimates);
  const sum = values.reduce((a, b) => a + b, 0);
  return { estimates, mean: sum / values.length, min: Math.min(...values), max: Math.max(...values) };
}

/**
 * Estimate a 1RM from a set taken short of failure, using reps-in-reserve.
 * Convention: `reps + (10 - rpe)` is treated as the reps to failure.
 * This is a common coaching shortcut, not a validated model; RPE below 6 is rejected.
 */
export function estimateOneRepMaxFromRpe(weight: number, reps: number, rpe: number, formula: OneRmFormula = "epley"): number {
  if (typeof rpe !== "number" || !Number.isFinite(rpe) || rpe < 6 || rpe > 10) {
    throw new RangeError(`rpe must be between 6 and 10, got ${String(rpe)}`);
  }
  assertReps(reps);
  const effectiveReps = Math.round(reps + (10 - rpe));
  assertReps(effectiveReps);
  return estimateOneRepMax(weight, effectiveReps, formula);
}

/** What weight to put on the bar for `reps` reps, given a 1RM. Inverse of estimateOneRepMax. */
export function weightForReps(oneRepMax: number, reps: number, formula: OneRmFormula = "epley"): number {
  assertWeight(oneRepMax);
  return oneRepMax / repFactor(reps, formula);
}
