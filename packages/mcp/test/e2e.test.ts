import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const entry = fileURLToPath(new URL("../dist/index.js", import.meta.url));

let client: Client;

async function call(name: string, args: Record<string, unknown>) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as Array<{ type: string; text: string }>)[0]!.text;
  return { isError: Boolean(res.isError), text, json: res.isError ? undefined : JSON.parse(text) };
}

beforeAll(async () => {
  if (!existsSync(entry)) throw new Error("Run `npm run build` before the MCP end-to-end tests.");
  client = new Client({ name: "e2e-test", version: "0.0.0" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [entry] }));
});

afterAll(async () => {
  await client?.close();
});

describe("strength-formulas MCP server (stdio, end to end)", () => {
  it("lists five read-only tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["convert_weight", "estimate_one_rep_max", "plate_loading", "strength_scores", "weight_for_reps"]);
    for (const t of tools) {
      expect(t.annotations?.readOnlyHint).toBe(true);
      expect(t.description && t.description.length > 20).toBe(true);
    }
  });

  it("strength_scores reproduces the cross-checked reference values", async () => {
    const r = await call("strength_scores", { sex: "female", bodyweight_kg: 56, total_kg: 612.5 });
    expect(r.json.scores).toEqual({ wilks: 720.67, wilks_2020: 847.27, dots: 709.96, ipf_gl: 145.62, ipf_points_legacy: expect.any(Number) });
  });

  it("estimate_one_rep_max returns all formulas by default and one when asked", async () => {
    const all = await call("estimate_one_rep_max", { weight: 100, reps: 5 });
    expect(Object.keys(all.json.estimates)).toHaveLength(7);
    expect(all.json.estimates.epley).toBeCloseTo(116.67, 2);
    expect(all.json.estimates.brzycki).toBeCloseTo(112.5, 2);
    const one = await call("estimate_one_rep_max", { weight: 100, reps: 5, formula: "epley", rpe: 8 });
    expect(one.json.estimated_one_rep_max).toBeCloseTo(123.33, 2); // 7 effective reps
    expect(one.json.effective_reps).toBe(7);
  });

  it("weight_for_reps inverts estimate_one_rep_max", async () => {
    const r = await call("weight_for_reps", { one_rep_max: 150, reps: 5 });
    expect(r.json.weight).toBeCloseTo(150 / (1 + 5 / 30), 2);
  });

  it("plate_loading returns per-side plates and flags inexact loads", async () => {
    const exact = await call("plate_loading", { target: 142.5 });
    expect(exact.json).toMatchObject({ per_side: [25, 25, 10, 1.25], achieved: 142.5, exact: true });
    const lb = await call("plate_loading", { target: 225, unit: "lb" });
    expect(lb.json.per_side).toEqual([45, 45]);
    const inexact = await call("plate_loading", { target: 100.1 });
    expect(inexact.json.exact).toBe(false);
    expect(inexact.json.achieved).toBe(100);
  });

  it("convert_weight uses the exact pound", async () => {
    const r = await call("convert_weight", { value: 225, from: "lb" });
    expect(r.json.kg).toBeCloseTo(102.0583, 4);
  });

  it("reports bad input as a tool error instead of crashing the server", async () => {
    const lightBar = await call("plate_loading", { target: 15 });
    expect(lightBar.isError).toBe(true);
    expect(lightBar.text).toMatch(/lighter than the bar/);
    const badReps = await call("estimate_one_rep_max", { weight: 100, reps: 99 });
    expect(badReps.isError).toBe(true);
    // server still alive afterwards
    const ok = await call("convert_weight", { value: 1, from: "kg" });
    expect(ok.isError).toBe(false);
  });
});
