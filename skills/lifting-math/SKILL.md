---
name: lifting-math
description: Exact strength-sport math for powerlifting and weightlifting questions. Use when asked to compute or compare Wilks, Wilks-2020, DOTS, IPF GL or IPF Points scores, estimate a one-rep max (e1RM) from a set, find the weight for a rep target, or work out which plates to load. Do not estimate these numbers by hand.
license: MIT
compatibility: Works best with the strength-formulas MCP server. Falls back to the built strength-formulas library from its GitHub repo (Node 18+).
metadata:
  author: amirdoit
  version: "0.1.0"
  source: https://github.com/amirdoit/strength-formulas
---

# Lifting math

Strength scores and 1RM estimates are polynomial and exponential formulas with long coefficient lists. Language models get these wrong when they compute them from memory. Compute them with a tool.

## How to compute

1. **If the `strength-formulas` MCP server is connected**, call its tools: `strength_scores`, `estimate_one_rep_max`, `weight_for_reps`, `plate_loading`, `convert_weight`.
2. **Otherwise**, if you can run Node 18+, clone and build the library, then call it:

   ```bash
   git clone https://github.com/amirdoit/strength-formulas && cd strength-formulas
   npm ci && npm run build
   node --input-type=module -e 'import {dots} from "./packages/core/dist/index.js"; console.log(dots("male", 93, 800))'
   ```

3. **If you can run neither**, say the numbers are not computed and give the formula name only. Do not invent coefficients.

## Rules that prevent wrong answers

- **Units.** Scores take **kilograms**. Convert pounds with `convert_weight` (1 lb = 0.45359237 kg) before scoring.
- **Total.** Use the competition total (best squat + best bench + best deadlift). For bench-only IPF GL, pass the bench result and `event: "bench"`.
- **Scales differ.** Wilks is on a 500-point scale, Wilks-2020 on a 600-point scale, IPF GL on a ~100-point scale. Never compare a Wilks number to a Wilks-2020 or GL number. State which formula you used.
- **Equipment and event** only change IPF GL and legacy IPF Points. Wilks, Wilks-2020 and DOTS ignore them.
- **A set of one rep** returns the weight lifted as the 1RM. A successful single is the max.
- **e1RM reliability.** Estimates are regressions on small samples. Above about 10 reps they are rough. When the user gives no formula, report the range across formulas, not one number as fact.
- **RPE.** The RPE option adds `10 - RPE` reps in reserve before estimating. It is a coaching shortcut, not a validated model. Say so if the user relies on it.
- **Plates** assume an unlimited supply of each plate size. The result is the closest load at or below the target. If `exact` is false, tell the user how far short it is.

## Interpreting results

Report the formula name next to every number. For comparisons across lifters, use one formula for everyone. For the formulas and where the coefficients come from, read [references/formulas.md](references/formulas.md).
