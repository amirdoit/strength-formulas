/**
 * Bodyweight-adjusted scoring formulas.
 *
 * Constants are the published formula definitions, cross-checked against the
 * MIT-licensed OpenPowerlifting `coefficients` crate (see NOTICE.md).
 *
 * Conventions (match OpenPowerlifting so results line up with public meet data):
 *  - Bodyweights outside a formula's valid range are clamped to the range edge,
 *    except IPF Points / IPF GL, which return 0 below their minimum bodyweight.
 *  - A non-positive bodyweight or total scores 0.
 *  - NaN / Infinity throw a TypeError. Silent NaN scores are worse than a crash.
 */

export type Sex = "male" | "female";
export type Equipment = "raw" | "equipped";
/** Events the IPF GL coefficients are defined for. */
export type GoodliftEvent = "sbd" | "bench";
/** Events the legacy IPF Points coefficients are defined for. */
export type IpfEvent = "sbd" | "squat" | "bench" | "deadlift";

function assertFinite(name: string, value: number): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number, got ${String(value)}`);
  }
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

/** Horner evaluation. `coeffs` are highest-degree first. */
function poly(coeffs: readonly number[], x: number): number {
  let acc = 0;
  for (const c of coeffs) acc = acc * x + c;
  return acc;
}

function guard(bodyweightKg: number, totalKg: number): boolean {
  assertFinite("bodyweightKg", bodyweightKg);
  assertFinite("totalKg", totalKg);
  return bodyweightKg > 0 && totalKg > 0;
}

// ---------------------------------------------------------------------------
// Wilks (original, 1994): 500 / poly5(bodyweight)
// ---------------------------------------------------------------------------

// Highest-degree first: [x^5, x^4, x^3, x^2, x^1, x^0]
const WILKS_MEN = [-1.291e-8, 7.01863e-6, -0.00113732, -0.002388645, 16.2606339, -216.0475144] as const;
const WILKS_WOMEN = [-0.00000009054, 0.00004731582, -0.00930733913, 0.82112226871, -27.23842536447, 594.31747775582] as const;

export function wilksCoefficient(sex: Sex, bodyweightKg: number): number {
  assertFinite("bodyweightKg", bodyweightKg);
  return sex === "male"
    ? 500 / poly(WILKS_MEN, clamp(bodyweightKg, 40, 201.9))
    : 500 / poly(WILKS_WOMEN, clamp(bodyweightKg, 26.51, 154.53));
}

/** Original Wilks points (1994 coefficients, 500-point scale). */
export function wilks(sex: Sex, bodyweightKg: number, totalKg: number): number {
  if (!guard(bodyweightKg, totalKg)) return 0;
  return wilksCoefficient(sex, bodyweightKg) * totalKg;
}

// ---------------------------------------------------------------------------
// Wilks-2020: 600 / poly5(bodyweight). A different scale from original Wilks.
// ---------------------------------------------------------------------------

const WILKS2020_MEN = [-0.0000000120804336482315, 0.00000707665973070743, -0.00139583381094385, 0.073694103462609, 8.47206137941125, 47.4617885411949] as const;
const WILKS2020_WOMEN = [-0.000000023334613884954, 0.00000938773881462799, -0.0010504000506583, -0.0330725063103405, 13.7121941940668, -125.425539779509] as const;

export function wilks2020Coefficient(sex: Sex, bodyweightKg: number): number {
  assertFinite("bodyweightKg", bodyweightKg);
  return sex === "male"
    ? 600 / poly(WILKS2020_MEN, clamp(bodyweightKg, 40, 200.95))
    : 600 / poly(WILKS2020_WOMEN, clamp(bodyweightKg, 40, 150.95));
}

/** Wilks-2020 points (600-point scale; not interchangeable with original Wilks). */
export function wilks2020(sex: Sex, bodyweightKg: number, totalKg: number): number {
  if (!guard(bodyweightKg, totalKg)) return 0;
  return wilks2020Coefficient(sex, bodyweightKg) * totalKg;
}

// ---------------------------------------------------------------------------
// DOTS: 500 / poly4(bodyweight)
// ---------------------------------------------------------------------------

const DOTS_MEN = [-0.000001093, 0.0007391293, -0.1918759221, 24.0900756, -307.75076] as const;
const DOTS_WOMEN = [-0.0000010706, 0.0005158568, -0.1126655495, 13.6175032, -57.96288] as const;

export function dotsCoefficient(sex: Sex, bodyweightKg: number): number {
  assertFinite("bodyweightKg", bodyweightKg);
  return sex === "male"
    ? 500 / poly(DOTS_MEN, clamp(bodyweightKg, 40, 210))
    : 500 / poly(DOTS_WOMEN, clamp(bodyweightKg, 40, 150));
}

/** DOTS points (Dynamic Objective Team Scoring). Same coefficients for raw and equipped. */
export function dots(sex: Sex, bodyweightKg: number, totalKg: number): number {
  if (!guard(bodyweightKg, totalKg)) return 0;
  return dotsCoefficient(sex, bodyweightKg) * totalKg;
}

// ---------------------------------------------------------------------------
// IPF GL (GOODLIFT): total * 100 / (A - B * e^(-C * bodyweight))
// Defined for SBD totals and bench-only, raw ("classic") and equipped.
// ---------------------------------------------------------------------------

type GlParams = readonly [a: number, b: number, c: number];

const GL_PARAMS: Record<GoodliftEvent, Record<Sex, Record<Equipment, GlParams>>> = {
  sbd: {
    male: { raw: [1199.72839, 1025.18162, 0.00921], equipped: [1236.25115, 1449.21864, 0.01644] },
    female: { raw: [610.32796, 1045.59282, 0.03048], equipped: [758.63878, 949.31382, 0.02435] },
  },
  bench: {
    male: { raw: [320.98041, 281.40258, 0.01008], equipped: [381.22073, 733.79378, 0.02398] },
    female: { raw: [142.40398, 442.52671, 0.04724], equipped: [221.82209, 357.00377, 0.02937] },
  },
};

export interface GoodliftOptions {
  /** Default "raw". */
  equipment?: Equipment;
  /** Default "sbd" (squat+bench+deadlift total). */
  event?: GoodliftEvent;
}

/** IPF GL points. Returns 0 below 35 kg bodyweight (the formula is undefined there). */
export function goodlift(sex: Sex, bodyweightKg: number, totalKg: number, options: GoodliftOptions = {}): number {
  if (!guard(bodyweightKg, totalKg)) return 0;
  const equipment = options.equipment ?? "raw";
  const event = options.event ?? "sbd";
  const [a, b, c] = GL_PARAMS[event][sex][equipment];
  if (bodyweightKg < 35) return 0;
  const denominator = a - b * Math.exp(-c * bodyweightKg);
  if (denominator === 0) return 0;
  return totalKg * Math.max(0, 100 / denominator);
}

// ---------------------------------------------------------------------------
// Legacy IPF Points (normal-distribution model, mean 500 / sd 100)
// ---------------------------------------------------------------------------

type IpfParams = readonly [mean1: number, mean2: number, dev1: number, dev2: number];

const IPF_PARAMS: Record<IpfEvent, Record<Sex, Record<Equipment, IpfParams>>> = {
  sbd: {
    male: { raw: [310.67, 857.785, 53.216, 147.0835], equipped: [387.265, 1121.28, 80.6324, 222.4896] },
    female: { raw: [125.1435, 228.03, 34.5246, 86.8301], equipped: [176.58, 373.315, 48.4534, 110.0103] },
  },
  squat: {
    male: { raw: [123.1, 363.085, 25.1667, 75.4311], equipped: [150.485, 446.445, 36.5155, 103.7061] },
    female: { raw: [50.479, 105.632, 19.1846, 56.2215], equipped: [74.6855, 171.585, 21.9475, 52.2948] },
  },
  bench: {
    male: { raw: [86.4745, 259.155, 17.57845, 53.122], equipped: [133.94, 441.465, 35.3938, 113.0057] },
    female: { raw: [25.0485, 43.848, 6.7172, 13.952], equipped: [49.106, 124.209, 23.199, 67.492] },
  },
  deadlift: {
    male: { raw: [103.5355, 244.765, 15.3714, 31.5022], equipped: [110.135, 263.66, 14.996, 23.011] },
    female: { raw: [47.136, 67.349, 9.1555, 13.67], equipped: [51.002, 69.8265, 8.5802, 5.7258] },
  },
};

export interface IpfPointsOptions {
  /** Default "raw". */
  equipment?: Equipment;
  /** Default "sbd". */
  event?: IpfEvent;
}

/** Legacy IPF Points. Returns 0 below 40 kg bodyweight. Never negative. */
export function ipfPoints(sex: Sex, bodyweightKg: number, totalKg: number, options: IpfPointsOptions = {}): number {
  if (!guard(bodyweightKg, totalKg)) return 0;
  const equipment = options.equipment ?? "raw";
  const event = options.event ?? "sbd";
  if (bodyweightKg < 40) return 0;
  const [mean1, mean2, dev1, dev2] = IPF_PARAMS[event][sex][equipment];
  const logBw = Math.log(bodyweightKg);
  const mean = mean1 * logBw - mean2;
  const dev = dev1 * logBw - dev2;
  if (dev === 0) return 0;
  return Math.max(0, 500 + (100 * (totalKg - mean)) / dev);
}

// ---------------------------------------------------------------------------
// Convenience: everything at once
// ---------------------------------------------------------------------------

export interface AllScores {
  wilks: number;
  wilks2020: number;
  dots: number;
  goodlift: number;
  ipfPoints: number;
}

export function allScores(
  sex: Sex,
  bodyweightKg: number,
  totalKg: number,
  options: { equipment?: Equipment; event?: GoodliftEvent } = {},
): AllScores {
  const opts: { equipment?: Equipment; event?: GoodliftEvent } = {};
  if (options.equipment !== undefined) opts.equipment = options.equipment;
  if (options.event !== undefined) opts.event = options.event;
  return {
    wilks: wilks(sex, bodyweightKg, totalKg),
    wilks2020: wilks2020(sex, bodyweightKg, totalKg),
    dots: dots(sex, bodyweightKg, totalKg),
    goodlift: goodlift(sex, bodyweightKg, totalKg, opts),
    ipfPoints: ipfPoints(sex, bodyweightKg, totalKg, opts),
  };
}
