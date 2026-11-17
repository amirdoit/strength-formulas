import { describe, expect, it } from "vitest";
import vectors from "./vectors.json";
import { allScores, dots, goodlift, ipfPoints, wilks, wilks2020, wilks2020Coefficient, wilksCoefficient } from "../src/index.js";
import type { Equipment, GoodliftEvent, IpfEvent, Sex } from "../src/index.js";

type Row = {
  fn: "wilks" | "wilks2020" | "dots" | "goodlift" | "ipfPoints";
  sex: Sex;
  bw: number;
  total: number;
  equipment?: Equipment;
  event?: string;
  expected: number;
};

function actual(r: Row): number {
  switch (r.fn) {
    case "wilks":
      return wilks(r.sex, r.bw, r.total);
    case "wilks2020":
      return wilks2020(r.sex, r.bw, r.total);
    case "dots":
      return dots(r.sex, r.bw, r.total);
    case "goodlift":
      return goodlift(r.sex, r.bw, r.total, { equipment: r.equipment!, event: r.event as GoodliftEvent });
    case "ipfPoints":
      return ipfPoints(r.sex, r.bw, r.total, { equipment: r.equipment!, event: r.event as IpfEvent });
  }
}

describe("golden vectors (generated from OpenPowerlifting's Rust source by scripts/gen-vectors.py)", () => {
  const rows = vectors.rows as Row[];
  it(`matches all ${rows.length} vectors to 1e-9 relative`, () => {
    const failures: string[] = [];
    for (const r of rows) {
      const a = actual(r);
      const tol = 1e-9 * Math.max(1, Math.abs(r.expected));
      if (!(Math.abs(a - r.expected) <= tol)) {
        failures.push(`${JSON.stringify(r)} -> got ${a}`);
        if (failures.length >= 5) break;
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("published examples (copied from OpenPowerlifting's own test suite)", () => {
  it("Wilks coefficients at 100 kg", () => {
    expect(wilksCoefficient("male", 100)).toBeCloseTo(0.6085890719066511, 12);
    expect(wilksCoefficient("female", 100)).toBeCloseTo(0.8325833167368228, 12);
  });

  it("Wilks points", () => {
    expect(wilks("male", 100, 1000)).toBeCloseTo(608.58907, 4);
    expect(wilks("female", 60, 500)).toBeCloseTo(557.4434, 3);
  });

  it("Wilks-2020 coefficients match the official 4-decimal tables (men)", () => {
    const table: Array<[number, number]> = [
      [40, 1.3895], [50, 1.151], [60, 0.9968], [70, 0.8923], [80, 0.8191], [90, 0.767],
      [100, 0.7294], [120, 0.6817], [140, 0.6546], [160, 0.6361], [180, 0.6213], [200, 0.6123],
    ];
    for (const [bw, c] of table) expect(wilks2020Coefficient("male", bw)).toBeCloseTo(c, 4);
  });

  it("Wilks-2020 coefficients match the official 4-decimal tables (women)", () => {
    const table: Array<[number, number]> = [
      [40, 1.8486], [50, 1.5091], [60, 1.319], [70, 1.2042], [80, 1.1318], [90, 1.0846],
      [100, 1.0525], [110, 1.0286], [120, 1.0089], [130, 0.9912], [140, 0.9753], [150, 0.9635],
    ];
    for (const [bw, c] of table) expect(wilks2020Coefficient("female", bw)).toBeCloseTo(c, 4);
  });

  it("cross-check: the npm `wilks@2.3.0` README examples (female, 56 kg, 612.5 kg total)", () => {
    // Independent of OpenPowerlifting: these numbers come from another library's docs.
    // DOTS is the one formula OpenPowerlifting's crate does not unit-test.
    expect(wilks("female", 56, 612.5)).toBeCloseTo(720.67, 2);
    expect(wilks2020("female", 56, 612.5)).toBeCloseTo(847.27, 2);
    expect(dots("female", 56, 612.5)).toBeCloseTo(709.96, 2);
    expect(goodlift("female", 56, 612.5, { equipment: "raw" })).toBeCloseTo(145.62, 2);
  });

  it("IPF GL: 2019 IPF Worlds, Inzarkin (92.04 kg, 1035 kg, equipped)", () => {
    expect(goodlift("male", 92.04, 1035, { equipment: "equipped", event: "sbd" })).toBeCloseTo(112.85, 2);
  });

  it("IPF GL: 2019 Classic Bench Worlds, Torronen (70.5 kg, 122.5 kg, raw bench)", () => {
    expect(goodlift("female", 70.5, 122.5, { equipment: "raw", event: "bench" })).toBeCloseTo(96.78, 2);
  });

  it("legacy IPF Points", () => {
    expect(ipfPoints("male", 93, 777.5, { equipment: "raw", event: "sbd" })).toBeCloseTo(741.32, 2);
    expect(ipfPoints("female", 73, 337.5, { equipment: "raw", event: "sbd" })).toBeCloseTo(546.67, 2);
  });
});

describe("edge cases", () => {
  it("non-positive bodyweight or total scores zero", () => {
    for (const fn of [wilks, wilks2020, dots]) {
      expect(fn("male", 0, 500)).toBe(0);
      expect(fn("male", -80, 500)).toBe(0);
      expect(fn("male", 80, 0)).toBe(0);
      expect(fn("female", 80, -1)).toBe(0);
    }
    expect(goodlift("male", 80, 0)).toBe(0);
    expect(ipfPoints("male", 0, 500)).toBe(0);
  });

  it("non-finite input throws instead of returning NaN", () => {
    expect(() => dots("male", Number.NaN, 500)).toThrow(TypeError);
    expect(() => wilks("male", 80, Number.POSITIVE_INFINITY)).toThrow(TypeError);
    expect(() => goodlift("female", 60, Number.NaN)).toThrow(TypeError);
  });

  it("clamps bodyweight to each formula's valid range", () => {
    expect(wilks2020("male", 20, 500)).toBeCloseTo(wilks2020("male", 40, 500), 10);
    expect(wilks2020("male", 400, 500)).toBeCloseTo(wilks2020("male", 200.95, 500), 10);
    expect(dots("female", 300, 500)).toBeCloseTo(dots("female", 150, 500), 10);
    expect(dots("male", 300, 500)).toBeCloseTo(dots("male", 210, 500), 10);
  });

  it("IPF GL is undefined under 35 kg and IPF Points under 40 kg", () => {
    expect(goodlift("female", 34.9, 200)).toBe(0);
    expect(ipfPoints("female", 39.9, 200)).toBe(0);
  });

  it("scores are linear in total", () => {
    expect(dots("male", 93, 800)).toBeCloseTo(2 * dots("male", 93, 400), 9);
    expect(wilks2020("female", 63, 600)).toBeCloseTo(2 * wilks2020("female", 63, 300), 9);
  });

  it("allScores returns every formula and honors options", () => {
    const s = allScores("male", 93, 800, { equipment: "equipped" });
    expect(s.dots).toBeCloseTo(dots("male", 93, 800), 10);
    expect(s.goodlift).toBeCloseTo(goodlift("male", 93, 800, { equipment: "equipped" }), 10);
    expect(s.goodlift).not.toBeCloseTo(goodlift("male", 93, 800, { equipment: "raw" }), 3);
  });
});
