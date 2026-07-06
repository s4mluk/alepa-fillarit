---
description: Käynnistä paikallinen palvelin ja avaa appi selaimessa testattavaksi
allowed-tools: Bash
---

Käynnistä appi paikallista testausta varten (paikannus toimii vain localhostissa, ei file://):

1. Tarkista onko portti 8000 jo käytössä (`lsof -ti:8000`). Jos on, ilmoita että palvelin on jo käynnissä äläkä käynnistä uutta.
2. Muuten käynnistä taustalla: `python3 -m http.server 8000` (projektin juuressa).
3. Avaa selain: `open http://localhost:8000`.
4. Muistuta käyttäjää sallimaan paikannus selaimessa, jotta GPS ja kävelyreitit toimivat.
