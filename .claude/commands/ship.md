---
description: Julkaise appi — nosta service workerin cache-versio, commitoi ja pushaa (Vercel deployaa)
argument-hint: [commit-viesti]
allowed-tools: Read, Edit, Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git status:*), Bash(git diff:*)
---

Julkaise Alepa-fillarit-appi. Tee järjestyksessä:

1. Lue `sw.js` ja etsi rivi `const CACHE = "alepa-fillarit-vN";`. **Nosta versionumero yhdellä** (esim. `-v1` → `-v2`) Edit-työkalulla. Tämä on pakollinen: ilman sitä käyttäjät saavat vanhan välimuistiversion appista.
2. Aja `git add -A` ja näytä `git status` -yhteenveto muuttuneista tiedostoista.
3. Commitoi. Käytä viestinä argumenttia `$ARGUMENTS`, tai jos se on tyhjä, keksi lyhyt kuvaava viesti muutosten perusteella.
4. Aja `git push`.
5. Kerro lopuksi että Vercel julkaisee muutokset automaattisesti ~20 sekunnissa samaan osoitteeseen.

Jos työpuussa ei ole muutoksia, kerro se äläkä commitoi tyhjää.
