registerMap({
  id: 'world',
  kind: 'country',
  label: '🌍 World',
  visitedColor: '#4ecdc4',
  unvisitedColor: '#21262d',
  _map: null,
  _layer: null,
  _initialised: false,

  async init() {
    this._map = L.map('world-map-leaflet', {
      center: [20, 10], zoom: 2,
      zoomControl: true, attributionControl: false, minZoom: 2
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd'
    }).addTo(this._map);

    const resolve = props => {
      const a2    = props['ISO_A2'];
      const a2_eh = props['ISO_A2_EH'];
      const a3    = props['ISO_A3'];
      const a3_eh = props['ISO_A3_EH'];
      if (a2    && a2    !== '-99') return a2;
      if (a2_eh && a2_eh !== '-99') return a2_eh;
      if (a3    && a3    !== '-99') return a3;
      if (a3_eh && a3_eh !== '-99') return a3_eh;
      return null;
    };

    try {
      const res = await fetch('/static/geo/countries.geojson');
      const geojson = await res.json();
      this._layer = L.geoJSON(geojson, {
        style: feature => this.style(resolve(feature.properties)),
        onEachFeature: (feature, layer) => {
          const rawCode = resolve(feature.properties);
          const name = feature.properties.NAME || feature.properties.ADMIN;
          feature.properties._rawCode = rawCode;
          layer.bindTooltip(name, { sticky: true, className: 'map-tooltip' });
          layer.on('click', () => toggle(rawCode, name, this.kind));
        }
      }).addTo(this._map);
    } catch(e) { console.error('Failed to load world GeoJSON', e); }
  },

  style(rawCode) {
    const v = isVisited(this.kind, rawCode);
    return { fillColor: v ? this.visitedColor : this.unvisitedColor, fillOpacity: v ? 0.85 : 0.7, color: '#0d1117', weight: 0.5 };
  },

  refresh() {
    if (!this._layer) return;
    this._layer.eachLayer(layer => layer.setStyle(this.style(layer.feature.properties._rawCode)));
  }
});
