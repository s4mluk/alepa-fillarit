---
name: fillari-data
description: Alepa-fillarit-projektin ulkoisten rajapintojen (CityBikes, OSRM, Photon) kentät, vastausmuodot ja kikat. Lue tämä ennen kuin lisäät ominaisuuksia jotka koskettavat pyörädataa, reititystä tai osoitehakua.
---

# Alepa-fillarit — rajapinnat

Kaikki ilmaisia, ei API-avaimia. Vakiot ovat `index.html`:n scriptin alussa (`API`, `OSRM`, `PHOTON`).

## Yleinen sudenkuoppa: koordinaattien järjestys
Rajapinnat käyttävät **`lng, lat`** (GeoJSON-järjestys). Leaflet käyttää **`[lat, lng]`**. Käännä aina rajapinnan ja kartan välillä.

## 1. Kaupunkipyörät — CityBikes
`GET https://api.citybik.es/v2/networks/citybikes-helsinki`

Vastaus: `network.stations[]`, jokaisessa asemassa:
- `id` (string) · `name` (string)
- `latitude`, `longitude` (number)
- `free_bikes` (number) — pyöriä nyt
- `empty_slots` (number) — vapaita telakoita
- `timestamp` (ISO-string)

Rajoite: ~300 pyyntöä/tunti per IP. Appi hakee 30 s välein (~120/h). Data on lähtöisin Digitransit/HSL:stä (CC BY 4.0) — attribuutio kartan alalaidassa on pakollinen.

## 2. Kävelyreitit — OSRM
`GET https://routing.openstreetmap.de/routed-foot/route/v1/driving/{lng},{lat};{lng},{lat}?overview=full&geometries=geojson`

- **Huom:** polussa lukee `driving`, mutta `routed-foot`-host tekee siitä jalankulkureitin. Älä vaihda hostia.
- Vastaus: `code === "Ok"` ja `routes[0]` sisältää:
  - `distance` (metriä) · `duration` (sekuntia)
  - `geometry.coordinates[]` muodossa `[lng, lat]` → käännä `[lat, lng]` polylineä varten
- Tarkista aina `code === "Ok"` ja `routes.length` ennen käyttöä.

## 3. Osoitehaku / geokoodaus — Photon
`GET https://photon.komoot.io/api/?q={haku}&limit=6&lang=fi&lat={lat}&lon={lng}`

- `lat`/`lon` painottaa tuloksia käyttäjän lähelle.
- Vastaus: `features[]`, käytä vain `geometry.type === "Point"`.
  - `geometry.coordinates` = `[lng, lat]`
  - `properties`: `name`, `street`, `housenumber`, `city`, `state`, `postcode`
- Nimi kannattaa koota: `name || street`, ja alaotsikko osoitteen paloista.

## Turvallisuus
Kaikki rajapintadata renderöidään sheetiin `innerHTML`:llä → aja käyttäjän/rajapinnan tekstit `esc()`-funktion läpi (löytyy `index.html`:stä) XSS:n estämiseksi.
