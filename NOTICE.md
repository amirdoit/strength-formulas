# Third-party notices

## OpenPowerlifting

The scoring coefficients in `packages/core/src/scoring.ts` are the published formula definitions
(Wilks, Wilks-2020, DOTS, IPF GL, IPF Points). They were cross-checked against, and the test vectors in
`packages/core/test/vectors.json` are generated from, the `coefficients` crate of the OpenPowerlifting
project (https://github.com/sstangl/openpowerlifting), which is distributed under the following terms:

> Copyright (c) 2020 The OpenPowerlifting Project
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and/or
> associated documentation files (the "Materials"), to deal in the Materials without restriction, including
> without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Materials, and to permit persons to whom the Materials are furnished to do so, subject to
> the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial
> portions of the Materials.
>
> THE MATERIALS ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
> LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
> EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
> IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE MATERIALS OR
> THE USE OR OTHER DEALINGS IN THE MATERIALS.

The Wilks-2020 coefficient tables referenced in the tests are published by Powerlifting Australia.
The one-rep-max equations are published in the sports-science literature (Epley 1985, Brzycki 1993,
Lombardi 1989, O'Conner et al. 1989, Mayhew et al. 1992, Wathen 1994, Lander 1985).
