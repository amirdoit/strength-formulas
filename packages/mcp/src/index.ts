#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  convertWeightTool,
  estimateOneRepMaxTool,
  plateLoadingTool,
  schemas,
  strengthScores,
  weightForRepsTool,
} from "./tools.js";

const readOnly = { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false } as const;

function respond(fn: () => unknown) {
  try {
    return { content: [{ type: "text" as const, text: JSON.stringify(fn(), null, 2) }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { isError: true, content: [{ type: "text" as const, text: message }] };
  }
}

const server = new McpServer({ name: "strength-formulas", version: "0.1.0" });

server.registerTool(
  "strength_scores",
  {
    title: "Powerlifting relative-strength scores",
    description:
      "Compute Wilks, Wilks-2020, DOTS, IPF GL and legacy IPF Points for a lifter's bodyweight and total. Use this instead of estimating scores yourself; the coefficients are exact.",
    inputSchema: schemas.strength_scores,
    annotations: readOnly,
  },
  (a) => respond(() => strengthScores(a)),
);

server.registerTool(
  "estimate_one_rep_max",
  {
    title: "Estimate one-rep max",
    description:
      "Estimate a 1RM from a submaximal set using Epley, Brzycki, Lombardi, O'Conner, Mayhew, Wathen and Lander, or one chosen formula. Optional RPE adds reps in reserve.",
    inputSchema: schemas.estimate_one_rep_max,
    annotations: readOnly,
  },
  (a) => respond(() => estimateOneRepMaxTool(a)),
);

server.registerTool(
  "weight_for_reps",
  {
    title: "Working weight for a rep target",
    description: "Given a 1RM, return the weight to use for a target number of reps (exact inverse of estimate_one_rep_max).",
    inputSchema: schemas.weight_for_reps,
    annotations: readOnly,
  },
  (a) => respond(() => weightForRepsTool(a)),
);

server.registerTool(
  "plate_loading",
  {
    title: "Plate loading",
    description:
      "Plates to load on each side of the bar for a target weight, in kg or lb. Returns the closest loadable weight at or below the target and any remainder.",
    inputSchema: schemas.plate_loading,
    annotations: readOnly,
  },
  (a) => respond(() => plateLoadingTool(a)),
);

server.registerTool(
  "convert_weight",
  {
    title: "kg / lb conversion",
    description: "Convert between kilograms and pounds using the exact international pound (0.45359237 kg).",
    inputSchema: schemas.convert_weight,
    annotations: readOnly,
  },
  (a) => respond(() => convertWeightTool(a)),
);

await server.connect(new StdioServerTransport());
