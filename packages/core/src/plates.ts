/**
 * Plate loading. All arithmetic is done in integer hundredths of a unit so that
 * 2.5 + 1.25 + 0.25 never turns into 3.9999999999999996.
 */

export type Unit = "kg" | "lb";

export const KG_PER_LB = 0.45359237; // exact, by international definition

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export const DEFAULT_PLATES: Record<Unit, readonly number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25, 0.5, 0.25],
  lb: [45, 35, 25, 10, 5, 2.5, 1.25],
};

export const DEFAULT_BAR: Record<Unit, number> = { kg: 20, lb: 45 };

export interface PlateOptions {
  unit?: Unit;
  /** Bar weight in `unit`. Default 20 kg / 45 lb. */
  bar?: number;
  /** Plate denominations available, one pair of each is NOT assumed: supply is unlimited. */
  plates?: readonly number[];
  /** Combined weight of both collars/clips, in `unit`. Default 0. */
  collars?: number;
}

export interface PlateResult {
  unit: Unit;
  target: number;
  bar: number;
  /** Plates for ONE side of the bar, heaviest first. */
  perSide: number[];
  /** Weight actually loaded: bar + collars + 2 * sum(perSide). Never exceeds the target. */
  achieved: number;
  /** target - achieved. Zero when the target is exactly loadable. */
  remainder: number;
  exact: boolean;
}

const SCALE = 100;
const toUnits = (x: number): number => Math.round(x * SCALE);
const fromUnits = (n: number): number => n / SCALE;

/**
 * Greedy plate loading, heaviest plate first. Greedy is optimal for the standard
 * denominations (each plate divides evenly into larger ones or nearly so); with an
 * exotic custom set it still returns a valid load that never exceeds the target.
 */
export function platesPerSide(target: number, options: PlateOptions = {}): PlateResult {
  const unit = options.unit ?? "kg";
  const bar = options.bar ?? DEFAULT_BAR[unit];
  const collars = options.collars ?? 0;
  const denominations = [...(options.plates ?? DEFAULT_PLATES[unit])].sort((a, b) => b - a);

  for (const [name, value] of [["target", target], ["bar", bar], ["collars", collars]] as const) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be a non-negative finite number, got ${String(value)}`);
    }
  }
  if (denominations.length === 0 || denominations.some((p) => !(p > 0) || !Number.isFinite(p))) {
    throw new RangeError("plates must be a non-empty list of positive numbers");
  }
  if (target < bar + collars) {
    throw new RangeError(`target ${target} ${unit} is lighter than the bar${collars ? " plus collars" : ""} (${bar + collars} ${unit})`);
  }

  const targetU = toUnits(target);
  const fixedU = toUnits(bar) + toUnits(collars);
  let perSideU = Math.floor((targetU - fixedU) / 2); // plate weight we may load per side
  const perSide: number[] = [];

  for (const plate of denominations) {
    const plateU = toUnits(plate);
    while (plateU <= perSideU) {
      perSide.push(plate);
      perSideU -= plateU;
    }
  }

  const loadedU = perSide.reduce((sum, p) => sum + toUnits(p), 0);
  const achievedU = fixedU + 2 * loadedU;
  return {
    unit,
    target,
    bar,
    perSide,
    achieved: fromUnits(achievedU),
    remainder: fromUnits(targetU - achievedU),
    exact: achievedU === targetU,
  };
}
