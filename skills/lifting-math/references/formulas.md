# Formulas and sources

Coefficients are the published formula definitions, cross-checked against the MIT-licensed
OpenPowerlifting `coefficients` crate (https://github.com/sstangl/openpowerlifting, `crates/coefficients`).
The test suite in this repo checks 1,440 generated vectors against that source.

| Formula | Shape | Scale | Bodyweight handling |
|---|---|---|---|
| Wilks (1994) | `500 / poly5(bw) * total` | 500 | clamped to 40-201.9 kg (men), 26.51-154.53 kg (women) |
| Wilks-2020 | `600 / poly5(bw) * total` | 600 | clamped to 40-200.95 kg (men), 40-150.95 kg (women) |
| DOTS | `500 / poly4(bw) * total` | 500 | clamped to 40-210 kg (men), 40-150 kg (women) |
| IPF GL | `total * 100 / (A - B * exp(-C * bw))` | ~100 | 0 below 35 kg. Separate raw/equipped, SBD/bench |
| IPF Points (legacy) | `500 + 100 * (total - mean) / dev`, mean and dev linear in `ln(bw)` | ~500 | 0 below 40 kg |

Wilks-2020 uses an intentionally different scale from original Wilks and is a different formula, not an update.

## One-rep-max estimators

Each is `weight * factor(reps)`:

| Name | factor(reps) |
|---|---|
| Epley | `1 + reps / 30` |
| Brzycki | `36 / (37 - reps)` (undefined at 37+ reps) |
| Lombardi | `reps ^ 0.10` |
| O'Conner | `1 + reps / 40` |
| Mayhew | `100 / (52.2 + 41.9 * e^(-0.055 * reps))` |
| Wathen | `100 / (48.8 + 53.8 * e^(-0.075 * reps))` |
| Lander | `100 / (101.3 - 2.67123 * reps)` |

The library accepts 1 to 36 reps. At 1 rep it returns the weight lifted unchanged.
