# R02 product promise and coverage verification

Date: 2026-09-01

The local production build was checked at the R00 scanner widths. The page and
body had no horizontal overflow at each viewport, and the hero rendered the
bounded heading `Investigate observable activity across supported EVM networks`.

| Viewport | Heading height | Page/body width | Horizontal overflow |
| --- | ---: | ---: | --- |
| 320×800 | 120px | 309 / 309px client width | None |
| 360×800 | 90px | 349 / 349px client width | None |
| 390×844 | 90px | 379 / 379px client width | None |
| 767×900 | 80px | 756 / 756px client width | None |
| 768×900 | 144px | 757 / 757px client width | None |
| 1280×900 | 96px | 1269 / 1269px client width | None |
| 1440×900 | 96px | 1429 / 1429px client width | None |

The 11px difference from the requested viewport widths is the headed browser's
vertical scrollbar; document and body widths matched the available client width
at every viewport.

Screenshots:

- `hero-1440.png`
- `hero-390.png`
