[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/natakakakara-droid/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/natakakakara-droid/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Cover Studio

A GTA 6-style cover art maker: load up to 3 photos (or the bundled samples),
arrange them in multi-panel layouts, write a caption, pick a Vice sunset /
neon theme, and export a PNG at 1080×1080, 1080×1350 or 1920×1080.

- **App:** `app/` — plain static files, no build step, works fully offline.
  Serve with `node serve.ts` and open http://localhost:8080.
- **Photos never leave the machine:** they are read with FileReader and drawn
  on canvas client-side. Zero network requests.
- **Art:** the sunset backdrop (gradient sky, striped sun, skyline with lit
  windows, palm silhouettes, grain, vignette) is drawn in code in
  `app/src/cover.js`. No Rockstar logo, artwork or font anywhere.
- **Typeface:** Anton (SIL Open Font License), bundled at
  `app/fonts/Anton-Regular.ttf` — see `app/fonts/OFL.txt`.
- **Deterministic shots:** `?shot=cover&photo=pier&caption=Sunset%20Heist`
  (and `shot=editor`) paint a fixed scene and raise `window.__shotReady`.
- **Hand-in:** `main.ts` copies `app/` and `screenshots/` to the output
  directory and writes `dossier.json` with the vendored make.fun library:
  `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

MIT licensed — see `LICENSE`.
