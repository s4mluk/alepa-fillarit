// Puhtaat apurit: ei DOM- eikä Leaflet-riippuvuuksia, joten nämä ovat testattavissa
// Nodessa (node --test) ja käytettävissä selaimessa globaaleina (util.js ladataan ennen app.js:ää).
(function (global) {
  const R = 6371000; // maapallon säde metreinä

  // Haversine-etäisyys kahden {lat, lng} -pisteen välillä, metreinä.
  function dist(a, b) {
    const dLat = (b.lat - a.lat) * Math.PI/180, dLng = (b.lng - a.lng) * Math.PI/180;
    const la1 = a.lat*Math.PI/180, la2 = b.lat*Math.PI/180;
    const x = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(x));
  }

  const fmtDist = m => m < 1000 ? Math.round(m) + " m" : (m/1000).toFixed(1) + " km";
  const fmtMin  = s => Math.max(1, Math.round(s/60)) + " min";
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  const api = { dist, fmtDist, fmtMin, esc };
  if (typeof module !== "undefined" && module.exports) module.exports = api;   // Node (testit)
  else Object.assign(global, api);                                             // selain (globaalit)
})(typeof self !== "undefined" ? self : this);
