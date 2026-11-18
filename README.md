# Alepa-fillarit

A Bolt-style web app showing Helsinki region city bikes ("Alepa-fillarit"): where the stations are, how many bikes each has, and the shortest **walking route** to a station or to a destination you search for. Installable on a phone as a PWA. The UI is in Finnish.

**Live demo:** TODO — add the GitHub Pages link here after enabling Pages (see below).

## Features
- Your location (GPS) and nearest stations sorted by distance
- Stations on a map, colour-coded, with the bike count in the marker
- Real walking route with duration and distance to the selected station
- Destination search, with a route there and the nearest station at the destination
- Installable to the home screen (PWA, offline app shell)
- Live data, refreshed every 30 s

## Data sources (free, no API keys)
- **City bikes:** CityBikes API (source: Digitransit / HSL, CC BY 4.0)
- **Walking routes:** OSRM (openstreetmap.de)
- **Address search:** Photon (komoot / OpenStreetMap)
- **Map:** CARTO + OpenStreetMap, rendered with Leaflet

## Run locally
Geolocation needs a secure context, so serve over localhost instead of opening the file directly:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

No build step or dependencies.

## Structure
- `index.html`: static app shell (markup, PWA tags, CDN links)
- `css/app.css`: styles
- `js/app.js`, `js/util.js`: application logic (state, views, API calls, geolocation, search) and helpers
- `manifest.webmanifest`, `sw.js`: PWA (installability + offline shell)
- `icon-*.png`, `apple-touch-icon.png`, `icon.svg`: app icons
- `test/util.test.js`: unit tests for helpers
- `scripts/`: service-worker cache bump and JS syntax checks

## Enable GitHub Pages
1. Repo **Settings** > **Pages**
2. Source: **Deploy from a branch**, branch `main`, folder `/ (root)`, then Save
3. After about a minute the site is at `https://s4mluk.github.io/alepa-fillarit/`; paste that link into **Live demo** above

The app uses only relative paths, so it works from a sub-path. Geolocation works because Pages is served over HTTPS.

## License
Data © the providers above. Code is free to use for your own purposes.
