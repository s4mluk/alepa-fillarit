# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Bolt-style web app showing Helsinki region city bikes ("Alepa-fillarit"): station locations, live bike counts, and walking routes to a station or a searched destination. UI text is in Finnish. It is an installable PWA.

## No build system

There is **no build step, no framework, no npm dependencies, no tests, no linter.** The entire application — HTML, CSS, and JS — lives in a single file: `index.html`. Leaflet is loaded from the unpkg CDN via `<script>`/`<link>` tags. Edit `index.html` directly.

## Running locally

Geolocation requires a *secure context*, so `file://` (double-clicking the file) will not work for GPS in Chrome. Always serve over localhost:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deployment

Push to the `main` branch of the GitHub repo (`s4mluk/alepa-fillarit`) → Vercel auto-deploys the static files to the live site. There is no deploy command; `git push` is the deploy.

## Architecture

**Single-page state machine driven by `sheet.innerHTML`.** Module-level state (`stations`, `userLoc`, `selected`, `destMarker`, `routeLine`) is mutated directly, and the bottom sheet is re-rendered by replacing its HTML. There are three "views", each a function that rewrites the sheet and wires up its own button handlers:

- `showHome()` — nearest-stations list (sorted by `dist()` when `userLoc` is known)
- `selectStation(s)` — one station's detail + walking route from the user
- `showDestination(place)` — a geocoded destination, route to it, and nearest station

`loadStations()` re-renders `showHome()` on each 30s refresh only when nothing is selected (guarded by `!selected && !destMarker`), so it doesn't clobber an open detail view.

**External APIs (all free, no keys):** constants at the top of the script.
- `API` — CityBikes (`api.citybik.es`, Helsinki network) for stations/bike counts
- `OSRM` — walking routes (`routing.openstreetmap.de/routed-foot`); note the path uses the `driving` profile slug but the `routed-foot` host makes it pedestrian
- `PHOTON` — address search / geocoding (`photon.komoot.io`)

Coordinate order gotcha: these APIs use `lng,lat` (GeoJSON), Leaflet uses `[lat, lng]`. The `walkRoute()` and geocode handlers flip between them.

**Layout coupling via `--sheet-h`.** The floating locate button and toast are positioned above the bottom sheet using the `--sheet-h` CSS variable. Any view that changes the sheet's height must call `setSheetHeightVar()` after writing `innerHTML`, or those elements will overlap the sheet.

**Geolocation fallback:** if GPS is denied/unavailable, tapping the map sets `userLoc` manually (`map.on("click", …)`).

## PWA / service worker

`manifest.webmanifest` + `sw.js` make the app installable and cache the app shell. **When you change `index.html` (or any shell asset), bump the `CACHE` version string in `sw.js`** (e.g. `alepa-fillarit-v1` → `-v2`), otherwise returning users get the stale cached shell. `sw.js` deliberately bypasses the cache for live-data hosts (citybikes, osrm, photon, carto tiles) — keep that skip list in sync if you add a new data source.

Icons (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) are generated from `icon.svg`.
