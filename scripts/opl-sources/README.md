# Vendored OpenPowerlifting sources

Verbatim copies of `crates/coefficients/src/{dots,wilks,wilks2020,goodlift,ipf}.rs` from
https://github.com/sstangl/openpowerlifting (MIT, Copyright (c) 2020 The OpenPowerlifting Project;
the license header is preserved in each file and reproduced in `NOTICE.md`).

They are the reference `scripts/gen-vectors.py` parses to produce `packages/core/test/vectors.json`.
Vendoring keeps test generation offline and deterministic. The weekly `upstream` workflow
re-downloads them and fails if upstream changed, so drift gets noticed.

Refresh with: `python3 scripts/gen-vectors.py --update`
