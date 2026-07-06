const API = "https://api.citybik.es/v2/networks/citybikes-helsinki";
const OSRM = "https://routing.openstreetmap.de/routed-foot/route/v1/driving/";
const PHOTON = "https://photon.komoot.io/api/";

const map = L.map("map", {
  zoomControl: false,
  rotate: true,           // salli kartan kääntäminen (kompassisuunta)
  touchRotate: true,      // kahdella sormella kääntö puhelimessa
  shiftKeyRotate: true,   // Shift + veto koneella
  bearing: 0,
  // kompassinappi (näkyy vain kun karttaa on käännetty → nollaa pohjoiseen)
  rotateControl: { closeOnZeroBearing: true, position: "bottomleft" },
}).setView([60.1699, 24.9384], 13);
L.control.zoom({ position: "bottomleft" }).addTo(map);
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; OpenStreetMap, CARTO · Data: Digitransit/HSL (CC BY 4.0)', maxZoom: 20,
}).addTo(map);
map.attributionControl.setPosition("bottomleft"); // samaan nurkkaan zoomin kanssa, sheetin yläpuolelle

let stations = [];
let userLoc = null;             // {lat, lng}
let userMarker = null;
let destMarker = null;
let routeLine = null;
let selected = null;            // valittu asema
const markerLayer = L.layerGroup().addTo(map);
const markers = new Map();       // asema-id -> { marker, bikes } — pidetään elossa refreshien yli

// ---------- apurit ----------
// dist, fmtDist, fmtMin, esc tulevat js/util.js:stä (ladataan ennen tätä tiedostoa).
const colorFor = b => b >= 5 ? getComputedStyle(document.documentElement).getPropertyValue('--good')
                    : b >= 1 ? getComputedStyle(document.documentElement).getPropertyValue('--mid')
                    : getComputedStyle(document.documentElement).getPropertyValue('--none');

let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}
// ---------- alapaneelin korkeus (vedettävä, 3 pysähdyskohtaa) ----------
const sheet = document.getElementById("sheet");
const sheetBody = document.getElementById("sheetBody");
const gripZone = document.getElementById("gripZone");
let sheetH = 132;
function snapPoints() {
  const h = window.innerHeight;
  return { peek: 132, half: Math.round(h * 0.46), full: Math.round(h * 0.86) };
}
function setSheetH(h, animate = true) {
  const s = snapPoints();
  sheetH = Math.max(s.peek, Math.min(s.full, Math.round(h)));
  sheet.style.transition = animate ? "height .25s ease" : "none";
  sheet.style.height = sheetH + "px";
  document.documentElement.style.setProperty("--sheet-h", sheetH + "px");
}
function snapNearest() {
  const s = snapPoints();
  const best = [s.peek, s.half, s.full].reduce((a, b) =>
    Math.abs(b - sheetH) < Math.abs(a - sheetH) ? b : a);
  setSheetH(best, true);
}
function expandForDetail() { if (sheetH < snapPoints().half) setSheetH(snapPoints().half, true); }

// vedä paneelia kahvasta (ja napautus vaihtaa peek/half)
let dragY = null, dragH = 0, dragMoved = 0;
gripZone.addEventListener("pointerdown", e => {
  dragY = e.clientY; dragH = sheetH; dragMoved = 0;
  gripZone.setPointerCapture(e.pointerId); sheet.style.transition = "none";
});
gripZone.addEventListener("pointermove", e => {
  if (dragY == null) return;
  const dy = dragY - e.clientY;
  dragMoved = Math.max(dragMoved, Math.abs(dy));
  setSheetH(dragH + dy, false);
});
function endDrag() {
  if (dragY == null) return;
  dragY = null;
  if (dragMoved < 6) { const s = snapPoints(); setSheetH(sheetH > (s.peek + s.half) / 2 ? s.peek : s.half, true); }
  else snapNearest();
}
gripZone.addEventListener("pointerup", endDrag);
gripZone.addEventListener("pointercancel", endDrag);
window.addEventListener("resize", () => setSheetH(sheetH, false));

// ---------- asemat kartalle ----------
function pinIcon(bikes) {
  const size = 30;
  return L.divIcon({
    className: "", iconSize: [size, size], iconAnchor: [size/2, size/2],
    html: `<div class="pin" style="width:${size}px;height:${size}px;background:${colorFor(bikes)}">${bikes}</div>`
  });
}

// Inkrementaalinen: päivitä vain muuttuneet pinnit, älä pura koko DOM:ia joka refreshillä.
// (456 asemaa — clearLayers() + uudelleenluonti aiheutti nykäyksen joka 30s.)
function drawStations() {
  const seen = new Set();
  for (const s of stations) {
    seen.add(s.id);
    const bikes = s.free_bikes ?? 0;
    const entry = markers.get(s.id);
    if (!entry) {
      const m = L.marker([s.latitude, s.longitude], { icon: pinIcon(bikes) })
        .bindTooltip(`${esc(s.name)} · ${bikes} pyörää`, { direction: "top" })
        // hae tuore asema klikkaushetkellä, ettei detail näytä vanhaa lukua
        .on("click", () => { const cur = stations.find(x => x.id === s.id); if (cur) selectStation(cur); });
      m.addTo(markerLayer);
      markers.set(s.id, { marker: m, bikes });
    } else if (entry.bikes !== bikes) {
      entry.marker.setIcon(pinIcon(bikes));
      entry.marker.setTooltipContent(`${esc(s.name)} · ${bikes} pyörää`);
      entry.bikes = bikes;
    }
  }
  for (const [id, entry] of markers) {
    if (!seen.has(id)) { markerLayer.removeLayer(entry.marker); markers.delete(id); }
  }
}

// ---------- data ----------
async function loadStations() {
  try {
    const r = await fetch(API, { cache: "no-store" });
    stations = (await r.json()).network.stations || [];
    drawStations();
    if (!selected && !destMarker) showHome();
  } catch (e) { toast("Datan haku epäonnistui"); }
}

// ---------- reititys ----------
async function walkRoute(from, to) {
  const url = `${OSRM}${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const r = await fetch(url);
  const j = await r.json();
  if (j.code !== "Ok" || !j.routes.length) throw new Error("no route");
  const route = j.routes[0];
  const latlngs = route.geometry.coordinates.map(c => [c[1], c[0]]);
  if (routeLine) map.removeLayer(routeLine);
  routeLine = L.polyline(latlngs, { color: "#10141a", weight: 5, opacity: .85, lineCap: "round" }).addTo(map);
  return { distance: route.distance, duration: route.duration, latlngs };
}
function clearRoute() { if (routeLine) { map.removeLayer(routeLine); routeLine = null; } }

// ---------- näkymät (sheet) ----------
function showHome() {
  selected = null;
  const total = stations.reduce((a, s) => a + (s.free_bikes ?? 0), 0);
  let list = [...stations];
  if (userLoc) list.sort((a, b) =>
    dist(userLoc, {lat:a.latitude,lng:a.longitude}) - dist(userLoc, {lat:b.latitude,lng:b.longitude}));
  list = list.slice(0, 12);

  sheetBody.innerHTML = `
    <h1>Alepa-fillarit</h1>
    <p class="sub">${total} pyörää · ${stations.length} asemaa · ${userLoc ? "lähimmät sinusta" : "paina 📍 nähdäksesi lähimmät"}</p>
    <ul class="stationList">
      ${list.map(s => {
        const b = s.free_bikes ?? 0;
        const d = userLoc ? fmtDist(dist(userLoc, {lat:s.latitude,lng:s.longitude})) : "";
        return `<li data-id="${s.id}">
          <div class="badge" style="background:${colorFor(b)}">${b}</div>
          <div><div class="st-name">${esc(s.name)}</div><div class="st-meta">${b} pyörää · ${s.empty_slots ?? 0} telakkaa</div></div>
          <div class="st-dist">${d}</div>
        </li>`;
      }).join("")}
    </ul>`;
  sheetBody.querySelectorAll("li[data-id]").forEach(li =>
    li.addEventListener("click", () => selectStation(stations.find(s => s.id === li.dataset.id))));
}

async function selectStation(s) {
  if (!s) return;
  selected = s;
  const b = s.free_bikes ?? 0;
  map.setView([s.latitude, s.longitude], Math.max(map.getZoom(), 15), { animate: true });

  sheetBody.innerHTML = `
    <button class="back" id="back">‹ Takaisin</button>
    <div class="detail">
      <div class="top">
        <div class="badge" style="width:52px;height:52px;border-radius:14px;font-size:22px;background:${colorFor(b)}">${b}</div>
        <div><h1 style="margin:0">${esc(s.name)}</h1><p class="sub" style="margin:0" id="eta">Lasketaan kävelyreittiä…</p></div>
      </div>
      <div class="kpis">
        <div class="kpi"><b>${b}</b><span>Pyörää nyt</span></div>
        <div class="kpi"><b>${s.empty_slots ?? 0}</b><span>Vapaata telakkaa</span></div>
      </div>
      <button class="btn" id="go">Näytä kävelyreitti</button>
    </div>`;
  document.getElementById("back").onclick = () => { clearRoute(); showHome(); };
  const go = () => routeToStation(s);
  document.getElementById("go").onclick = go;
  expandForDetail();

  if (userLoc) routeToStation(s); // piirrä heti jos sijainti tiedossa
  else document.getElementById("eta").textContent = "Paina 📍 niin näet reitin";
}

async function routeToStation(s) {
  if (!userLoc) { toast("Paikanna itsesi ensin (📍)"); return; }
  const eta = document.getElementById("eta");
  try {
    const to = { lat: s.latitude, lng: s.longitude };
    const rt = await walkRoute(userLoc, to);
    if (eta) eta.textContent = `🚶 ${fmtMin(rt.duration)} kävelyä · ${fmtDist(rt.distance)}`;
    const grp = L.latLngBounds([ [userLoc.lat, userLoc.lng], [s.latitude, s.longitude] ]);
    map.fitBounds(grp, { paddingTopLeft: [40, 90], paddingBottomRight: [40, sheetH + 30] });
  } catch (e) { if (eta) eta.textContent = "Reittiä ei löytynyt"; }
}

async function showDestination(place) {
  selected = null; clearRoute();
  const to = { lat: place.lat, lng: place.lng };
  if (destMarker) map.removeLayer(destMarker);
  destMarker = L.marker([to.lat, to.lng], {
    icon: L.divIcon({ className: "", html: '<div class="destpin">📍</div>', iconSize: [26, 26], iconAnchor: [13, 26] })
  }).addTo(map);

  // lähin asema määränpäähän
  let near = null, best = Infinity;
  for (const s of stations) {
    const d = dist(to, { lat: s.latitude, lng: s.longitude });
    if (d < best) { best = d; near = s; }
  }

  sheetBody.innerHTML = `
    <button class="back" id="back">‹ Takaisin</button>
    <div class="detail">
      <h1>${esc(place.name)}</h1>
      <p class="sub" id="eta">${userLoc ? "Lasketaan kävelyreittiä…" : "Paina 📍 niin näet reitin tänne"}</p>
      ${near ? `<div class="kpi" style="margin-bottom:14px"><b>${near.free_bikes ?? 0} pyörää</b><span>Lähin asema: ${esc(near.name)} (${fmtDist(best)})</span></div>` : ""}
      <div class="btn-row">
        <button class="btn" id="goDest">Reitti tänne</button>
        ${near ? `<button class="btn ghost" id="goStation">Lähin asema</button>` : ""}
      </div>
    </div>`;
  document.getElementById("back").onclick = () => {
    clearRoute(); if (destMarker) { map.removeLayer(destMarker); destMarker = null; } showHome();
  };
  document.getElementById("goDest").onclick = async () => {
    if (!userLoc) return toast("Paikanna itsesi ensin (📍)");
    const eta = document.getElementById("eta");
    try {
      const rt = await walkRoute(userLoc, to);
      eta.textContent = `🚶 ${fmtMin(rt.duration)} · ${fmtDist(rt.distance)} määränpäähän`;
      map.fitBounds(L.latLngBounds([[userLoc.lat,userLoc.lng],[to.lat,to.lng]]),
        { paddingTopLeft:[40,90], paddingBottomRight:[40, sheetH+30] });
    } catch { eta.textContent = "Reittiä ei löytynyt"; }
  };
  if (near) document.getElementById("goStation").onclick = () => selectStation(near);
  expandForDetail();
  map.setView([to.lat, to.lng], 15, { animate: true });
  if (userLoc) document.getElementById("goDest").click();
}

// ---------- paikannus ----------
function setUser(lat, lng, recenter) {
  userLoc = { lat, lng };
  if (userMarker) userMarker.setLatLng([lat, lng]);
  else userMarker = L.marker([lat, lng], {
    icon: L.divIcon({ className: "", html: '<div class="userdot"></div>', iconSize: [18,18], iconAnchor: [9,9] }),
    zIndexOffset: 1000, interactive: false,
  }).addTo(map);
  if (recenter) map.setView([lat, lng], 16, { animate: true }); // zoomaa lähelle sijaintiasi
}
document.getElementById("locate").onclick = () => {
  if (!navigator.geolocation) return toast("Selain ei tue paikannusta");
  toast("Paikannetaan…");
  navigator.geolocation.getCurrentPosition(
    p => { setUser(p.coords.latitude, p.coords.longitude, true);
           if (selected) routeToStation(selected); else showHome(); },
    () => toast("Paikannus ei onnistunut — napauta karttaa asettaaksesi sijainnin"),
    { enableHighAccuracy: true, timeout: 8000 });
};
// vararatkaisu: aseta sijainti napauttamalla karttaa
map.on("click", e => { if (!userLoc) { setUser(e.latlng.lat, e.latlng.lng, false); toast("Sijainti asetettu"); showHome(); } });

// ---------- haku (Photon) ----------
const searchEl = document.getElementById("search");
const resultsEl = document.getElementById("results");
const clrEl = document.getElementById("clr");
let searchTimer;
searchEl.addEventListener("input", () => {
  clrEl.style.display = searchEl.value ? "block" : "none";
  clearTimeout(searchTimer);
  const q = searchEl.value.trim();
  if (q.length < 3) { resultsEl.style.display = "none"; return; }
  searchTimer = setTimeout(() => geocode(q), 280);
});
clrEl.onclick = () => { searchEl.value = ""; clrEl.style.display = "none"; resultsEl.style.display = "none"; };

async function geocode(q) {
  try {
    const c = userLoc || { lat: 60.17, lng: 24.94 };
    const r = await fetch(`${PHOTON}?q=${encodeURIComponent(q)}&limit=6&lang=fi&lat=${c.lat}&lon=${c.lng}`);
    const j = await r.json();
    const feats = (j.features || []).filter(f => f.geometry?.type === "Point");
    if (!feats.length) { resultsEl.style.display = "none"; return; }
    resultsEl.innerHTML = feats.map((f, i) => {
      const p = f.properties;
      const title = p.name || p.street || "Sijainti";
      const bits = [p.street && p.housenumber ? p.street+" "+p.housenumber : p.street, p.city, p.state].filter(Boolean);
      return `<div class="item" data-i="${i}"><div class="t">${esc(title)}</div><div class="s">${esc(bits.join(", "))}</div></div>`;
    }).join("");
    resultsEl.style.display = "block";
    resultsEl.querySelectorAll(".item").forEach(el => el.onclick = () => {
      const f = feats[+el.dataset.i], p = f.properties;
      resultsEl.style.display = "none";
      searchEl.value = p.name || p.street || "";
      searchEl.blur();
      showDestination({ lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], name: searchEl.value });
    });
  } catch (e) { resultsEl.style.display = "none"; }
}

// ---------- käynnistys ----------
loadStations();
setInterval(loadStations, 30000);
setTimeout(() => document.getElementById("locate").click(), 600); // kysy sijaintia heti
setSheetH(snapPoints().peek, false); // alkuun pieni peek → kartta iso

// rekisteröi service worker (offline-tuki + asennettavuus)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
