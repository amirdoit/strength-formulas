# strength-formulas

Zero-dependency strength-sport math: Wilks, Wilks-2020, DOTS, IPF GL, legacy IPF Points, seven one-rep-max estimators, and plate loading. Cross-checked against OpenPowerlifting's coefficients.

```bash
npm install strength-formulas
```

```ts
import { dots, goodlift, wilks2020, estimateOneRepMax, weightForReps, platesPerSide } from "strength-formulas";

dots("male", 93, 800);                                                  // 509.00
goodlift("female", 70.5, 122.5, { equipment: "raw", event: "bench" });  // 96.78
wilks2020("female", 56, 612.5);                                         // 847.27
estimateOneRepMax(100, 5, "epley");                                     // 116.67
weightForReps(150, 5);                                                  // 128.57
platesPerSide(142.5);                                                   // { perSide: [25, 25, 10, 1.25], exact: true, ... }
```

Scoring functions take kilograms. Non-finite input throws, non-positive bodyweight or total scores 0, and out-of-range bodyweights are clamped like OpenPowerlifting.

How the numbers are verified, the full list of conventions, the MCP server and the agent skill are in the
[main repository](https://github.com/amirdoit/strength-formulas#readme). MIT licensed.
