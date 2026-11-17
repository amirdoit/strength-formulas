#!/usr/bin/env python3
"""Generate golden test vectors for strength-formulas from OpenPowerlifting's Rust source.

This is deliberately a SECOND, independent implementation: it reads the vendored
copy (scripts/opl-sources) of the MIT-licensed `coefficients` crate, regex-parses the constants out of the Rust
files (no hand-typed numbers), evaluates the formulas in Python, and writes
packages/core/test/vectors.json. The TypeScript library is then tested against
that file, so a typo in a TS constant fails CI.

Usage:  python3 scripts/gen-vectors.py [--update]
        --update re-downloads the vendored sources from upstream before generating.
"""
import json, math, re, sys, urllib.request, pathlib

UPSTREAM = "https://raw.githubusercontent.com/sstangl/openpowerlifting/master/crates/coefficients/src/"
HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "opl-sources"
OUT = HERE.parent / "packages/core/test/vectors.json"

def fetch(name):
    """Read the vendored copy. With --update, refresh the vendored copy from upstream first."""
    local = SRC / name
    if "--update" in sys.argv:
        with urllib.request.urlopen(UPSTREAM + name, timeout=30) as r:
            local.write_text(r.read().decode())
    return local.read_text()

def fn_body(src, fn_name):
    m = re.search(r"fn %s\(.*?\n}\n" % re.escape(fn_name), src, re.S)
    if not m: raise SystemExit("function not found: " + fn_name)
    return m.group(0)

def consts(body):
    # const A: f64 = -216.0475144;   (also 7.01863E-06 style)
    return [float(v) for _, v in re.findall(r"const ([A-F]): f64 = (-?[0-9.]+(?:[eE]-?[0-9]+)?);", body)]

def clamp_of(body):
    m = re.search(r"clamp\(([0-9.]+), ([0-9.]+)\)", body)
    return float(m.group(1)), float(m.group(2))

def poly(coeffs_low_first, x):
    return sum(c * x**i for i, c in enumerate(coeffs_low_first))

def coefficient_table(src, men_fn, women_fn, scale, degree):
    out = {}
    for sex, fn in (("male", men_fn), ("female", women_fn)):
        body = fn_body(src, fn)
        cs = consts(body)           # A..E (deg4) or A..F (deg5) in source order
        lo, hi = clamp_of(body)
        out[sex] = (cs, lo, hi)
    return out

def score_fn(table, scale, degree, highest_first):
    def f(sex, bw, total):
        cs, lo, hi = table[sex]
        x = min(max(bw, lo), hi)
        # dots: poly4(A,B,C,D,E,x) -> A is x^4 (highest first)
        # wilks / wilks2020: poly5(F,E,D,C,B,A,x) -> source consts A..F are LOWEST first
        low_first = list(reversed(cs)) if highest_first else cs
        return scale / poly(low_first, x) * total
    return f

dots_src = fetch("dots.rs"); wilks_src = fetch("wilks.rs"); w20_src = fetch("wilks2020.rs")
gl_src = fetch("goodlift.rs"); ipf_src = fetch("ipf.rs")

dots_t = coefficient_table(dots_src, "dots_coefficient_men", "dots_coefficient_women", 500, 4)
wilks_t = coefficient_table(wilks_src, "wilks_coefficient_men", "wilks_coefficient_women", 500, 5)
w20_t = coefficient_table(w20_src, "wilks2020_coefficient_men", "wilks2020_coefficient_women", 600, 5)
dots = score_fn(dots_t, 500, 4, True)      # A is the highest-degree term
wilks = score_fn(wilks_t, 500, 5, False)   # A is the constant term
wilks2020 = score_fn(w20_t, 600, 5, False)

def params(src, arity):
    rx = r"\((\w+), Sex::(\w), Equipment::(\w+)\) => \(" + ", ".join([r"([0-9.]+)"] * arity) + r"\)"
    table = {}
    for m in re.finditer(rx, src):
        ev, sx, eq = m.group(1), m.group(2), m.group(3)
        table[(ev, "male" if sx == "M" else "female", "raw" if eq == "Raw" else "equipped")] = [float(m.group(i)) for i in range(4, 4 + arity)]
    return table

gl_p = params(gl_src, 3); ipf_p = params(ipf_src, 4)
EVENT = {"SBD": "sbd", "S": "squat", "B": "bench", "D": "deadlift"}

def goodlift(sex, bw, total, eq, ev):
    a, b, c = gl_p[({"sbd": "SBD", "bench": "B"}[ev], sex, eq)]
    if bw < 35: return 0.0
    return total * max(0.0, 100.0 / (a - b * math.exp(-c * bw)))

def ipf(sex, bw, total, eq, ev):
    m1, m2, d1, d2 = ipf_p[({"sbd": "SBD", "squat": "S", "bench": "B", "deadlift": "D"}[ev], sex, eq)]
    if bw < 40: return 0.0
    l = math.log(bw); mean = m1 * l - m2; dev = d1 * l - d2
    return max(0.0, 500.0 + 100.0 * (total - mean) / dev)

BWS = [30, 40, 47.3, 52, 59.9, 66, 74.9, 83, 93, 105.3, 120, 140.5, 150.95, 165, 201, 230]
TOTALS = [250, 500, 912.5]
rows = []
for sex in ("male", "female"):
    for bw in BWS:
        for total in TOTALS:
            rows.append({"fn": "wilks", "sex": sex, "bw": bw, "total": total, "expected": wilks(sex, bw, total)})
            rows.append({"fn": "wilks2020", "sex": sex, "bw": bw, "total": total, "expected": wilks2020(sex, bw, total)})
            rows.append({"fn": "dots", "sex": sex, "bw": bw, "total": total, "expected": dots(sex, bw, total)})
            for eq in ("raw", "equipped"):
                for ev in ("sbd", "bench"):
                    rows.append({"fn": "goodlift", "sex": sex, "bw": bw, "total": total, "equipment": eq, "event": ev, "expected": goodlift(sex, bw, total, eq, ev)})
                for ev in ("sbd", "squat", "bench", "deadlift"):
                    rows.append({"fn": "ipfPoints", "sex": sex, "bw": bw, "total": total, "equipment": eq, "event": ev, "expected": ipf(sex, bw, total, eq, ev)})

OUT.write_text(json.dumps({
    "source": "OpenPowerlifting crates/coefficients (MIT), parsed by scripts/gen-vectors.py",
    "count": len(rows),
    "rows": rows,
}, indent=1))
print(f"wrote {len(rows)} vectors -> {OUT}")
# Sanity: the crate's own published test values must hold in this reference too.
assert abs(wilks("male", 100, 1000) - 608.58907) < 1e-4
assert abs(wilks("female", 60, 500) - 557.4434) < 1e-3
assert abs(goodlift("male", 92.04, 1035.0, "equipped", "sbd") - 112.85) < 0.01
assert abs(goodlift("female", 70.5, 122.5, "raw", "bench") - 96.78) < 0.01
assert abs(ipf("male", 93.0, 777.5, "raw", "sbd") - 741.32) < 0.01
assert abs(ipf("female", 73.0, 337.5, "raw", "sbd") - 546.67) < 0.01
print("reference implementation reproduces OpenPowerlifting's published test values")
