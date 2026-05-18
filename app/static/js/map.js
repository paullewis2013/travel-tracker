// visited Map keyed by "kind:code" e.g. "state:CA", "country:FR"
// Namespacing prevents collisions e.g. CA = California AND Canada
let visited = new Map();
const serverData = window.INITIAL_DATA;
serverData.forEach(item => {
  const rawCode = item.code.includes(':') ? item.code.split(':').slice(1).join(':') : item.code;
  const key = `${item.kind}:${rawCode}`;
  visited.set(key, { ...item, rawCode });
});

let usMap, usGeoLayer;
let worldMap, worldGeoLayer;

const STATE_CODES = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA",
  "Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD",
  "Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS",
  "Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH",
  "New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC",
  "North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA",
  "Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD","Tennessee":"TN",
  "Texas":"TX","Utah":"UT","Vermont":"VT","Virginia":"VA","Washington":"WA",
  "West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY","District of Columbia":"DC"
};

function resolveStateCode(props) {
  return props.abbreviation || props.postal || props.STUSPS || STATE_CODES[props.name] || props.name;
}

function resolveCountryCode(props) {
  const a2    = props['ISO_A2'];
  const a2_eh = props['ISO_A2_EH'];
  const a3    = props['ISO_A3'];
  const a3_eh = props['ISO_A3_EH'];
  if (a2    && a2    !== '-99') return a2;
  if (a2_eh && a2_eh !== '-99') return a2_eh;
  if (a3    && a3    !== '-99') return a3;
  if (a3_eh && a3_eh !== '-99') return a3_eh;
  return null;
}

function isStateVisited(rawCode)   { return visited.has(`state:${rawCode}`); }
function isCountryVisited(rawCode) { return visited.has(`country:${rawCode}`); }

// ── US Map ────────────────────────────────────────────────────────
async function initUSMap() {
  usMap = L.map('us-map-leaflet', {
    center: [38, -96], zoom: 4,
    zoomControl: true, attributionControl: false
  });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd'
  }).addTo(usMap);

  try {
    const res = await fetch('/static/geo/us-states.json');
    const geojson = await res.json();
    usGeoLayer = L.geoJSON(geojson, {
      style: feature => stateStyle(resolveStateCode(feature.properties)),
      onEachFeature: (feature, layer) => {
        const rawCode = resolveStateCode(feature.properties);
        const name = feature.properties.name;
        feature.properties._rawCode = rawCode;
        layer.bindTooltip(name, { sticky: true, className: 'map-tooltip' });
        layer.on('click', () => toggle(rawCode, name, 'state'));
      }
    }).addTo(usMap);
  } catch(e) { console.error('Failed to load US GeoJSON', e); }
}

function stateStyle(rawCode) {
  return {
    fillColor: isStateVisited(rawCode) ? '#fb923c' : '#21262d',
    fillOpacity: isStateVisited(rawCode) ? 0.85 : 0.7,
    color: '#0d1117', weight: 1
  };
}

function refreshUSMap() {
  if (!usGeoLayer) return;
  usGeoLayer.eachLayer(layer => {
    layer.setStyle(stateStyle(layer.feature.properties._rawCode));
  });
}

// ── World Map ─────────────────────────────────────────────────────
async function initWorldMap() {
  worldMap = L.map('world-map-leaflet', {
    center: [20, 10], zoom: 2,
    zoomControl: true, attributionControl: false, minZoom: 2
  });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd'
  }).addTo(worldMap);

  try {
    const res = await fetch('/static/geo/countries.geojson');
    const geojson = await res.json();
    worldGeoLayer = L.geoJSON(geojson, {
      style: feature => countryStyle(resolveCountryCode(feature.properties)),
      onEachFeature: (feature, layer) => {
        const rawCode = resolveCountryCode(feature.properties);
        const name = feature.properties.NAME || feature.properties.ADMIN;
        feature.properties._rawCode = rawCode;
        layer.bindTooltip(name, { sticky: true, className: 'map-tooltip' });
        layer.on('click', () => toggle(rawCode, name, 'country'));
      }
    }).addTo(worldMap);
  } catch(e) { console.error('Failed to load world GeoJSON', e); }
}

function countryStyle(rawCode) {
  return {
    fillColor: isCountryVisited(rawCode) ? '#4ecdc4' : '#21262d',
    fillOpacity: isCountryVisited(rawCode) ? 0.85 : 0.7,
    color: '#0d1117', weight: 0.5
  };
}

function refreshWorldMap() {
  if (!worldGeoLayer) return;
  worldGeoLayer.eachLayer(layer => {
    layer.setStyle(countryStyle(layer.feature.properties._rawCode));
  });
}

// ── Shared ────────────────────────────────────────────────────────
async function toggle(rawCode, name, kind) {
  if (!rawCode) return;
  const key = `${kind}:${rawCode}`;
  if (visited.has(key)) {
    await fetch(`/api/visited/${kind}/${rawCode}`, { method: 'DELETE' });
    visited.delete(key);
    showToast(`Removed: ${name}`, 'remove');
  } else {
    await fetch('/api/visited', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: rawCode, name, kind })
    });
    visited.set(key, { rawCode, name, kind });
    showToast(`Added: ${name}`);
  }
  refreshUSMap();
  refreshWorldMap();
  updateStats();
  updateList();
}

async function toggleFromList(key) {
  const item = visited.get(key);
  if (item) await toggle(item.rawCode, item.name, item.kind);
}

function showToast(msg, type='add') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type === 'remove' ? ' remove' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = 'toast', 2400);
}

function updateStats() {
  const states = [...visited.values()].filter(v => v.kind === 'state').length;
  const countries = [...visited.values()].filter(v => v.kind === 'country').length;
  document.getElementById('state-count').textContent = states;
  document.getElementById('country-count').textContent = countries;
  document.getElementById('list-state-count').textContent = `(${states})`;
  document.getElementById('list-country-count').textContent = `(${countries})`;
}

function updateList() {
  const states = [...visited.values()].filter(v => v.kind === 'state').sort((a,b) => a.name.localeCompare(b.name));
  const countries = [...visited.values()].filter(v => v.kind === 'country').sort((a,b) => a.name.localeCompare(b.name));
  document.getElementById('state-list').innerHTML = states.length
    ? states.map(s => chip(s, `state:${s.rawCode}`)).join('')
    : '<p class="empty-msg">No states visited yet</p>';
  document.getElementById('country-list').innerHTML = countries.length
    ? countries.map(c => chip(c, `country:${c.rawCode}`)).join('')
    : '<p class="empty-msg">No countries visited yet</p>';
}

function chip(item, key) {
  return `<span class="place-chip" onclick="toggleFromList('${key}')">
    <span class="dot ${item.kind}"></span>${item.name}
    <span class="remove">✕</span>
  </span>`;
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    const names = ['us', 'world', 'list'];
    t.classList.toggle('active', names[i] === name);
    if (names[i] === 'world') t.classList.toggle('world', names[i] === name);
  });
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.toggle('active', p.id === `panel-${name}`);
  });
  if (name === 'us' && usMap) setTimeout(() => usMap.invalidateSize(), 50);
  if (name === 'world') {
    if (!worldMap) setTimeout(() => initWorldMap(), 50);
    else setTimeout(() => worldMap.invalidateSize(), 50);
  }
}

updateStats();
updateList();
initUSMap();
