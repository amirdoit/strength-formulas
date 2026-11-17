// Cross-check strength-formulas against two published npm packages.
//
//   mkdir /tmp/xcheck && cd /tmp/xcheck && npm init -y && npm i wilks@2.3.0 powerlifting-formulas@0.2.3
//   node /path/to/repo/scripts/cross-check-npm.mjs /tmp/xcheck
//
// Their outputs are rounded to 2 decimals, so agreement means |diff| <= 0.005 + tiny float slack.
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.resolve(process.argv[2] ?? ".");
const require = createRequire(path.join(dir, "noop.js"));
const here = path.dirname(fileURLToPath(import.meta.url));
const mine = await import(pathToFileURL(path.join(here, "../packages/core/dist/index.js")).href);
const W = require("wilks");
const P = require("powerlifting-formulas");

const bws = [45, 52, 56, 59.9, 66, 74.9, 83, 93, 105.3, 120, 140.5];
const totals = [300, 612.5, 850];
let compared = 0;
const bad = [];
for (const sex of ["male", "female"]) {
  for (const bw of bws) {
    for (const total of totals) {
      for (const [name, ours, wPkg, pPkg] of [
        ["dots", mine.dots, W.dots, P.dots],
        ["wilks", mine.wilks, W.wilks, P.wilks],
        ["wilks2020", mine.wilks2020, W.wilks2020, P.wilks2020],
      ]) {
        const m = ours(sex, bw, total);
        for (const [who, theirs] of [["wilks", wPkg({ total, bodyweight: bw, gender: sex, unit: "kg" })], ["powerlifting-formulas", pPkg(bw, total, sex)]]) {
          compared++;
          if (Math.abs(m - theirs) > 0.005 + 1e-9) bad.push({ name, who, sex, bw, total, mine: m, theirs });
        }
      }
    }
  }
}
console.log(`${compared} comparisons, ${bad.length} outside rounding tolerance`);
if (bad.length) { console.log(bad.slice(0, 10)); process.exit(1); }
