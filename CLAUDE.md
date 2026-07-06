# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Bolt-style web app showing Helsinki region city bikes ("Alepa-fillarit"): station locations, live bike counts, and walking routes to a station or a searched destination. UI text is in Finnish. It is an installable PWA.

## Layout

```
index.html    static shell only: head/meta, PWA tags, CDN links, DOM skeleton — no inline CSS/JS
css/app.css   all styles (search bar, bottom sheet, map pins, toast)
js/app.js     all application logic (state, views, APIs, geolocation, search)
sw.js         service worker (app-shell cache; bypasses live-data hosts)
scripts/      bump-sw.sh (cache version bump), check-sw-bump.sh (edit hook)
.claude/      settings.json (permissions + hooks), skills/deploy
```

## No build system

There is **no build step, no framework, no npm dependencies, no linter.** Plain HTML/CSS/JS served as static files; Leaflet comes from the unpkg CDN. Edit the files directly.

## Running locally

Geolocation requires a *secure context*, so `file://` (double-clicking the file) will not work for GPS in Chrome. Always serve over localhost:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Verifying changes

Close the loop yourself before declaring a change done:

1. `node --check js/app.js` — syntax check (there are no tests; this is the only static gate).
2. Serve locally and open the app: the station list must render in the bottom sheet,
   tapping a station must show its detail view, and the search must return results.
   Check the browser console for errors.
3. If you changed any shell asset (`index.html`, `css/`, `js/`, `manifest.webmanifest`,
   icons): run `scripts/bump-sw.sh` to bump the service-worker cache version.
   A PostToolUse hook (`scripts/check-sw-bump.sh`) reminds you if you forget.

## Deployment

Push to the `main` branch of the GitHub repo (`s4mluk/alepa-fillarit`) → Vercel auto-deploys the static files to the live site. There is no deploy command; `git push` is the deploy — so **never push to `main` without the user's confirmation**. The `/deploy` skill walks the whole flow (verify → bump → commit → push).

## Architecture

**Single-page state machine driven by `sheetBody.innerHTML`** (all in `js/app.js`). Module-level state (`stations`, `userLoc`, `selected`, `destMarker`, `routeLine`) is mutated directly, and the bottom sheet is re-rendered by replacing its HTML. There are three "views", each a function that rewrites the sheet and wires up its own button handlers:

- `showHome()` — nearest-stations list (sorted by `dist()` when `userLoc` is known)
- `selectStation(s)` — one station's detail + walking route from the user
- `showDestination(place)` — a geocoded destination, route to it, and nearest station

`loadStations()` re-renders `showHome()` on each 30s refresh only when nothing is selected (guarded by `!selected && !destMarker`), so it doesn't clobber an open detail view.

**External APIs (all free, no keys):** constants at the top of `js/app.js`.
- `API` — CityBikes (`api.citybik.es`, Helsinki network) for stations/bike counts
- `OSRM` — walking routes (`routing.openstreetmap.de/routed-foot`); note the path uses the `driving` profile slug but the `routed-foot` host makes it pedestrian
- `PHOTON` — address search / geocoding (`photon.komoot.io`)

Coordinate order gotcha: these APIs use `lng,lat` (GeoJSON), Leaflet uses `[lat, lng]`. The `walkRoute()` and geocode handlers flip between them.

**Layout coupling via `--sheet-h`.** The floating locate button, toast, and Leaflet's bottom controls are positioned above the bottom sheet using the `--sheet-h` CSS variable, which `setSheetH()` keeps in sync with the sheet's height. Always change the sheet height through `setSheetH()`, never by writing `sheet.style.height` directly, or those elements will overlap the sheet.

**Geolocation fallback:** if GPS is denied/unavailable, tapping the map sets `userLoc` manually (`map.on("click", …)`).

## PWA / service worker

`manifest.webmanifest` + `sw.js` make the app installable and cache the app shell. **When you change any shell asset, bump the `CACHE` version string in `sw.js`** — run `scripts/bump-sw.sh` — otherwise returning users get the stale cached shell. If you add a new shell file, also add it to the `SHELL` list in `sw.js`. `sw.js` deliberately bypasses the cache for live-data hosts (citybikes, osrm, photon, carto tiles) — keep that skip list in sync if you add a new data source.

Icons (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) are generated from `icon.svg`.

## Do not

- Do **not** add npm, a bundler, a framework, or any build tooling — static files are the point.
- Do **not** add API keys or paid services; every data source is keyless and free.
- Do **not** reintroduce inline `<style>`/`<script>` blocks into `index.html` — styles go to `css/app.css`, logic to `js/app.js`.
- Do **not** push to `main` without explicit user confirmation (push = production deploy).
- UI text stays in Finnish; code identifiers and comments follow the existing style.
