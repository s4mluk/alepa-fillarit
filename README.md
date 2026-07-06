# Alepa-fillarit 🚲

Bolt-tyylinen web-appi, joka näyttää Helsingin seudun kaupunkipyörät ("Alepa-fillarit"):
missä asemat ovat, montako pyörää missäkin on, ja lyhimmän **kävelyreitin** asemalle tai
hakemaasi määränpäähän. Toimii puhelimessa asennettavana sovelluksena (PWA).

## Ominaisuudet
- 📍 Oma sijainti (GPS) ja lähimmät asemat etäisyyden mukaan
- 🟢 Asemat kartalla värikoodattuna, pyörien määrä pallossa
- 🚶 Oikea kävelyreitti + kesto & matka valitulle asemalle
- 🔎 Määränpään haku ja reitti sinne + lähin asema perillä
- 📲 Asennettava kotivalikkoon (PWA, offline-kuori)
- 🔄 Live-data, päivittyy 30 s välein

## Datalähteet (ilmaisia, ei API-avaimia)
- **Kaupunkipyörät:** CityBikes API (lähde: Digitransit / HSL, CC BY 4.0)
- **Kävelyreitit:** OSRM (openstreetmap.de)
- **Osoitehaku:** Photon (komoot / OpenStreetMap)
- **Kartta:** CARTO + OpenStreetMap

## Ajaminen paikallisesti
Paikannus vaatii "turvallisen" osoitteen, joten aja paikallisen palvelimen kautta:

```bash
python3 -m http.server 8000
# avaa http://localhost:8000
```

## Rakenne
- `index.html` – koko sovellus (yksi tiedosto: HTML + CSS + JS)
- `manifest.webmanifest`, `sw.js` – PWA (asennettavuus + offline)
- `icon-*.png`, `apple-touch-icon.png` – sovelluksen ikonit

## Lisenssi
Data © palveluntarjoajat yllä. Koodi vapaasti käytettävissä omiin tarkoituksiin.
