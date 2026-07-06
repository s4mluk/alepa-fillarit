// Testit puhtaille apureille. Aja: node --test test/
// Ei riippuvuuksia — pelkkä Noden sisäänrakennettu test runner + assert.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { dist, fmtDist, fmtMin, esc } = require("../js/util.js");

test("dist: sama piste = 0", () => {
  const p = { lat: 60.1699, lng: 24.9384 };
  assert.equal(dist(p, p), 0);
});

test("dist: Rautatientori -> Kamppi ~ tunnettu etäisyys", () => {
  const rautatientori = { lat: 60.1710, lng: 24.9414 };
  const kamppi        = { lat: 60.1690, lng: 24.9310 };
  const m = dist(rautatientori, kamppi);
  // n. 620 m — sallitaan väljä haarukka jottei testi ole hauras
  assert.ok(m > 500 && m < 750, `odotettiin ~620 m, saatiin ${Math.round(m)} m`);
});

test("dist: symmetrinen", () => {
  const a = { lat: 60.20, lng: 24.90 }, b = { lat: 60.25, lng: 25.05 };
  assert.ok(Math.abs(dist(a, b) - dist(b, a)) < 1e-6);
});

test("fmtDist: alle kilometrin metreinä, pyöristettynä", () => {
  assert.equal(fmtDist(0), "0 m");
  assert.equal(fmtDist(342.7), "343 m");
  assert.equal(fmtDist(999), "999 m");
});

test("fmtDist: kilometrin ja yli kilometreinä yhdellä desimaalilla", () => {
  assert.equal(fmtDist(1000), "1.0 km");
  assert.equal(fmtDist(1540), "1.5 km");
});

test("fmtMin: sekunnit minuuteiksi, vähintään 1 min", () => {
  assert.equal(fmtMin(0), "1 min");
  assert.equal(fmtMin(30), "1 min");
  assert.equal(fmtMin(90), "2 min");
  assert.equal(fmtMin(600), "10 min");
});

test("esc: escapoi HTML-erikoismerkit (XSS-suojaus)", () => {
  assert.equal(esc(`<img src=x onerror="alert('&')">`),
    "&lt;img src=x onerror=&quot;alert(&#39;&amp;&#39;)&quot;&gt;");
  assert.equal(esc("tavallinen teksti"), "tavallinen teksti");
});
