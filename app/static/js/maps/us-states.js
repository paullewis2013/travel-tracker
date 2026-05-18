registerMap({
  id: 'us',
  kind: 'state',
  label: '🇺🇸 US States',
  visitedColor: '#fb923c',
  unvisitedColor: '#21262d',
  _map: null,
  _layer: null,
  _initialised: false,

  async init() {
    this._map = L.map('us-map-leaflet', {
      center: [38, -96], zoom: 4,
      zoomControl: true, attributionControl: false
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd'
    }).addTo(this._map);

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

    const resolve = props =>
      props.abbreviation || props.postal || props.STUSPS || STATE_CODES[props.name] || props.name;

    try {
      const res = await fetch('/static/geo/us-states.json');
      const geojson = await res.json();
      this._layer = L.geoJSON(geojson, {
        style: feature => this.style(resolve(feature.properties)),
        onEachFeature: (feature, layer) => {
          const rawCode = resolve(feature.properties);
          const name = feature.properties.name;
          feature.properties._rawCode = rawCode;
          layer.bindTooltip(name, { sticky: true, className: 'map-tooltip' });
          layer.on('click', () => toggle(rawCode, name, this.kind));
        }
      }).addTo(this._map);
    } catch(e) { console.error('Failed to load US GeoJSON', e); }
  },

  style(rawCode) {
    const v = isVisited(this.kind, rawCode);
    return { fillColor: v ? this.visitedColor : this.unvisitedColor, fillOpacity: v ? 0.85 : 0.7, color: '#0d1117', weight: 1 };
  },

  refresh() {
    if (!this._layer) return;
    this._layer.eachLayer(layer => layer.setStyle(this.style(layer.feature.properties._rawCode)));
  }
});
