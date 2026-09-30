# Lab notebook design tokens

## Color
- Paper `#F4F1EA`; ink `#1A1A1A`; muted ink `#68675F`; rule `#C9C5BA`; grid `#E5E1D7`.
- Signal (active and focus) `#176B4D`; compare `#E69F00`; swap `#D55E00`; sorted `#009E73`; pivot `#0072B2` (Okabe–Ito semantic colors).
- Graphite `#121412`; dark surface `#1B1E1B`; dark rule `#363A35`; phosphor `#9DD28A`.

## Type
- Display: Newsreader, Georgia fallback. UI: IBM Plex Sans, system sans fallback. Instrument/data: IBM Plex Mono, monospace fallback.
- Scale: 11 / 12 / 13 / 15 / 18 / 24 / 32 px; algorithm title 32 px, section title 18 px.
- Metrics use tabular numerals; code and axis labels use monospace.

## Spacing and shape
- 4 px base spacing; scale 4 / 8 / 12 / 16 / 24 / 32 / 48 px.
- Hairline 1 px rules; radius 2 px (controls), 0 px (panels); no shadows.

## Motion
- Instrument response 160 ms ease-out; panel transitions 200 ms ease-out.
- Disable nonessential transitions under `prefers-reduced-motion`.
