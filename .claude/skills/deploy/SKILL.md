---
name: deploy
description: Deploy the app to production — verify, bump the service-worker cache version, commit, and push to main (Vercel auto-deploys). Use when the user asks to deploy, ship, release, or publish.
---

# Deploy

`git push` to `main` IS the deploy (Vercel auto-deploys the static files). Steps:

1. Syntax-check the app code: `node --check js/app.js`.
2. If any shell asset changed (`index.html`, `css/`, `js/`, `manifest.webmanifest`, icons),
   run `scripts/bump-sw.sh` — otherwise returning users keep the stale cached shell.
3. Smoke-test locally: `python3 -m http.server 8000`, then check that
   `http://localhost:8000/`, `/css/app.css`, `/js/app.js` and `/sw.js` all return 200.
4. Commit with a message describing what changed and why.
5. Ask the user to confirm before `git push origin main` — the push goes straight to production.
6. After pushing, remind the user the Vercel deploy takes ~1 min.
