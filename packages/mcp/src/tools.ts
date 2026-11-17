import { z } from "zod";
import {
  ONE_RM_FORMULAS,
  allScores,
  estimateOneRepMax,
  estimateOneRepMaxAll,
  estimateOneRepMaxFromRpe,
  kgToLb,
  lbToKg,
  platesPerSide,
  weightForReps,
  type OneRmFormula,
} from "strength-formulas";

const sex = z.enum(["male", "female"]).describe("Sex category the formula coefficients are defined for.");
const formula = z.enum(ONE_RM_FORMULAS as [OneRmFormula, ...OneRmFormula[]]);
const unit = z.enum(["kg", "lb"]);

export const schemas = {
  strength_scores: {
    sex,
    bodyweight_kg: z.number().positive().describe("Lifter bodyweight in kilograms."),
    total_kg: z.number().positive().describe("Competition total (squat + bench + deadlift), or bench alone when event is 'bench', in kilograms."),
    equipment: z.enum(["raw", "equipped"]).optional().describe("Only affects IPF GL and IPF Points. Default raw."),
    event: z.enum(["sbd", "bench"]).optional().describe("Only affects IPF GL and IPF Points. Default sbd (full-power total)."),
  },
  estimate_one_rep_max: {
    weight: z.number().positive().describe("Weight lifted, in any unit. The result is in the same unit."),
    reps: z.number().int().min(1).max(36).describe("Reps completed. Estimates degrade above ~10 reps."),
    rpe: z.number().min(6).max(10).optional().describe("Optional RPE of the set. Adds (10 - RPE) reps in reserve before estimating."),
    formula: formula.optional().describe("One formula. Omit to get all seven plus the mean and spread."),
  },
  weight_for_reps: {
    one_rep_max: z.number().positive().describe("The lifter's 1RM, in any unit. The result is in the same unit."),
    reps: z.number().int().min(1).max(36),
    formula: formula.optional().describe("Default epley."),
  },
  plate_loading: {
    target: z.number().positive().describe("Total bar weight to load, in `unit`."),
    unit: unit.optional().describe("Default kg."),
    bar: z.number().nonnegative().optional().describe("Bar weight. Default 20 kg / 45 lb."),
    collars: z.number().nonnegative().optional().describe("Combined collar weight. Default 0."),
    plates: z.array(z.number().positive()).min(1).optional().describe("Available plate sizes (unlimited supply). Defaults to a standard set."),
  },
  convert_weight: {
    value: z.number().describe("Value to convert."),
    from: unit,
  },
} as const;

const r2 = (n: number): number => Math.round(n * 100) / 100;

export function strengthScores(a: { sex: "male" | "female"; bodyweight_kg: number; total_kg: number; equipment?: "raw" | "equipped"; event?: "sbd" | "bench" }) {
  const opts: { equipment?: "raw" | "equipped"; event?: "sbd" | "bench" } = {};
  if (a.equipment) opts.equipment = a.equipment;
  if (a.event) opts.event = a.event;
  const s = allScores(a.sex, a.bodyweight_kg, a.total_kg, opts);
  return {
    inputs: { sex: a.sex, bodyweight_kg: a.bodyweight_kg, total_kg: a.total_kg, equipment: a.equipment ?? "raw", event: a.event ?? "sbd" },
    scores: { wilks: r2(s.wilks), wilks_2020: r2(s.wilks2020), dots: r2(s.dots), ipf_gl: r2(s.goodlift), ipf_points_legacy: r2(s.ipfPoints) },
    notes: [
      "Wilks is on a 500-point scale, Wilks-2020 on a 600-point scale, IPF GL on a ~100-point scale. They are not interchangeable.",
      "Equipment and event only affect IPF GL and legacy IPF Points. Wilks, Wilks-2020 and DOTS use one set of coefficients.",
    ],
  };
}

export function estimateOneRepMaxTool(a: { weight: number; reps: number; rpe?: number; formula?: OneRmFormula }) {
  const caveat = "Regression estimates from small samples; treat anything beyond ~10 reps as rough. A set of 1 returns the weight lifted.";
  const effectiveReps = a.rpe === undefined ? a.reps : Math.round(a.reps + (10 - a.rpe));
  if (a.formula) {
    const value = a.rpe === undefined ? estimateOneRepMax(a.weight, a.reps, a.formula) : estimateOneRepMaxFromRpe(a.weight, a.reps, a.rpe, a.formula);
    return { formula: a.formula, estimated_one_rep_max: r2(value), effective_reps: effectiveReps, caveat };
  }
  const all = estimateOneRepMaxAll(a.weight, effectiveReps);
  const estimates = Object.fromEntries(Object.entries(all.estimates).map(([k, v]) => [k, r2(v)]));
  return { estimates, mean: r2(all.mean), min: r2(all.min), max: r2(all.max), effective_reps: effectiveReps, caveat };
}

export function weightForRepsTool(a: { one_rep_max: number; reps: number; formula?: OneRmFormula }) {
  const f = a.formula ?? "epley";
  return { formula: f, weight: r2(weightForReps(a.one_rep_max, a.reps, f)), reps: a.reps };
}

export function plateLoadingTool(a: { target: number; unit?: "kg" | "lb"; bar?: number; collars?: number; plates?: number[] }) {
  const opts: { unit?: "kg" | "lb"; bar?: number; collars?: number; plates?: number[] } = {};
  if (a.unit) opts.unit = a.unit;
  if (a.bar !== undefined) opts.bar = a.bar;
  if (a.collars !== undefined) opts.collars = a.collars;
  if (a.plates) opts.plates = a.plates;
  const r = platesPerSide(a.target, opts);
  return {
    unit: r.unit,
    per_side: r.perSide,
    achieved: r.achieved,
    remainder: r.remainder,
    exact: r.exact,
    note: r.exact ? "Exact load." : `Closest loadable weight at or below the target; ${r.remainder} ${r.unit} short.`,
  };
}

export function convertWeightTool(a: { value: number; from: "kg" | "lb" }) {
  return a.from === "kg" ? { kg: a.value, lb: kgToLb(a.value) } : { kg: lbToKg(a.value), lb: a.value };
}
