import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLATES,
  KG_PER_LB,
  ONE_RM_FORMULAS,
  estimateOneRepMax,
  estimateOneRepMaxAll,
  estimateOneRepMaxFromRpe,
  kgToLb,
  lbToKg,
  platesPerSide,
  repFactor,
  weightForReps,
} from "../src/index.js";

describe("one-rep-max", () => {
  it("matches hand-computed values for 100 x 5", () => {
    expect(estimateOneRepMax(100, 5, "epley")).toBeCloseTo(100 * (1 + 5 / 30), 10);
    expect(estimateOneRepMax(100, 5, "brzycki")).toBeCloseTo(112.5, 10); // 100 * 36 / 32
    expect(estimateOneRepMax(100, 5, "oconnor")).toBeCloseTo(112.5, 10);
    expect(estimateOneRepMax(100, 5, "lombardi")).toBeCloseTo(100 * Math.pow(5, 0.1), 10);
    expect(estimateOneRepMax(100, 5, "lander")).toBeCloseTo((100 * 100) / (101.3 - 2.67123 * 5), 10);
    expect(estimateOneRepMax(100, 5, "mayhew")).toBeCloseTo((100 * 100) / (52.2 + 41.9 * Math.exp(-0.055 * 5)), 10);
    expect(estimateOneRepMax(100, 5, "wathen")).toBeCloseTo((100 * 100) / (48.8 + 53.8 * Math.exp(-0.075 * 5)), 10);
  });

  it("a single returns the weight lifted, for every formula", () => {
    for (const f of ONE_RM_FORMULAS) expect(estimateOneRepMax(180, 1, f)).toBe(180);
  });

  it("estimates never fall below the weight lifted and rise with reps", () => {
    for (const f of ONE_RM_FORMULAS) {
      let prev = 100;
      for (let r = 1; r <= 12; r++) {
        const e = estimateOneRepMax(100, r, f);
        expect(e).toBeGreaterThanOrEqual(prev - 1e-12);
        prev = e;
      }
    }
  });

  it("weightForReps is the exact inverse", () => {
    for (const f of ONE_RM_FORMULAS) {
      for (const reps of [1, 3, 5, 8, 10, 15]) {
        const e1rm = estimateOneRepMax(142.5, reps, f);
        expect(weightForReps(e1rm, reps, f)).toBeCloseTo(142.5, 9);
      }
    }
  });

  it("rejects bad reps and weights", () => {
    expect(() => repFactor(0)).toThrow(RangeError);
    expect(() => repFactor(2.5)).toThrow(RangeError);
    expect(() => repFactor(37)).toThrow(RangeError); // Brzycki is singular at 37
    expect(() => estimateOneRepMax(0, 5)).toThrow(RangeError);
    expect(() => estimateOneRepMax(-10, 5)).toThrow(RangeError);
    expect(() => estimateOneRepMax(Number.NaN, 5)).toThrow(RangeError);
  });

  it("estimateOneRepMaxAll reports mean and spread", () => {
    const r = estimateOneRepMaxAll(100, 5);
    expect(Object.keys(r.estimates).sort()).toEqual([...ONE_RM_FORMULAS].sort());
    expect(r.min).toBeLessThanOrEqual(r.mean);
    expect(r.mean).toBeLessThanOrEqual(r.max);
  });

  it("RPE adds reps in reserve", () => {
    expect(estimateOneRepMaxFromRpe(100, 5, 8)).toBeCloseTo(estimateOneRepMax(100, 7), 10);
    expect(estimateOneRepMaxFromRpe(100, 5, 10)).toBeCloseTo(estimateOneRepMax(100, 5), 10);
    expect(() => estimateOneRepMaxFromRpe(100, 5, 5)).toThrow(RangeError);
    expect(() => estimateOneRepMaxFromRpe(100, 5, 10.5)).toThrow(RangeError);
  });
});

describe("unit conversion", () => {
  it("uses the exact international pound", () => {
    expect(KG_PER_LB).toBe(0.45359237);
    expect(lbToKg(225)).toBeCloseTo(102.0582833, 6);
    expect(kgToLb(lbToKg(315))).toBeCloseTo(315, 10);
  });
});

describe("plate loading", () => {
  it("loads 100 kg on a 20 kg bar as 25 + 15 per side", () => {
    const r = platesPerSide(100);
    expect(r.perSide).toEqual([25, 15]);
    expect(r).toMatchObject({ achieved: 100, remainder: 0, exact: true });
  });

  it("loads 225 lb as one pair of 45s on each side... twice", () => {
    const r = platesPerSide(225, { unit: "lb" });
    expect(r.perSide).toEqual([45, 45]);
    expect(r.exact).toBe(true);
  });

  it("handles fractional plates without float drift", () => {
    const r = platesPerSide(28, { unit: "kg" }); // 20 bar + 2 * (2.5 + 1.25 + 0.25)
    expect(r.perSide).toEqual([2.5, 1.25, 0.25]);
    expect(r.achieved).toBe(28);
    expect(r.exact).toBe(true);
  });

  it("never exceeds the target and reports the remainder", () => {
    const r = platesPerSide(100.1);
    expect(r.achieved).toBe(100);
    expect(r.remainder).toBeCloseTo(0.1, 10);
    expect(r.exact).toBe(false);
  });

  it("accounts for collars", () => {
    const r = platesPerSide(100, { collars: 5 }); // 2.5 kg each
    expect(r.perSide).toEqual([25, 10, 2.5]);
    expect(r.achieved).toBe(100);
  });

  it("supports a custom bar and plate set (unlimited supply)", () => {
    const r = platesPerSide(95, { unit: "lb", bar: 35, plates: [25, 10, 5] });
    expect(r.perSide).toEqual([25, 5]);
    expect(r.achieved).toBe(95);
  });

  it("returns an empty side for exactly the bar", () => {
    const r = platesPerSide(20);
    expect(r.perSide).toEqual([]);
    expect(r.exact).toBe(true);
  });

  it("rejects targets lighter than the bar and bad plate sets", () => {
    expect(() => platesPerSide(15)).toThrow(RangeError);
    expect(() => platesPerSide(100, { plates: [] })).toThrow(RangeError);
    expect(() => platesPerSide(100, { plates: [25, -5] })).toThrow(RangeError);
    expect(() => platesPerSide(Number.NaN)).toThrow(RangeError);
  });

  it("every default plate set sums correctly for a sweep of targets", () => {
    for (const unit of ["kg", "lb"] as const) {
      const bar = unit === "kg" ? 20 : 45;
      const smallest = Math.min(...DEFAULT_PLATES[unit]);
      for (let t = bar; t <= bar + 400; t += 0.25) {
        const r = platesPerSide(t, { unit });
        const loaded = bar + 2 * r.perSide.reduce((a, b) => a + b, 0);
        expect(Math.abs(loaded - r.achieved)).toBeLessThan(1e-9);
        expect(r.achieved).toBeLessThanOrEqual(t + 1e-9);
        expect(r.remainder).toBeLessThan(2 * smallest + 1e-9);
      }
    }
  });
});
