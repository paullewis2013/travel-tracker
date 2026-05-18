registerMap({
  id: 'parks',
  kind: 'park',
  label: '🏕️ National Parks',
  visitedColor: '#4ade80',
  unvisitedColor: '#21262d',
  _map: null,
  _layer: null,
  _initialised: false,

  async init() {
const el = document.getElementById('parks-map-leaflet');
  console.log('map div dimensions:', el.offsetWidth, el.offsetHeight);
    this._map = L.map('parks-map-leaflet', {
      center: [39, -98], zoom: 4,
      zoomControl: true, attributionControl: false
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd'
    }).addTo(this._map);

    try {
      const res = await fetch('/static/geo/national-parks.geojson');
      const geojson = await res.json();

      console.log('parks geojson loaded, features:', geojson.features.length);

      this._layer = L.geoJSON(geojson, {
        pointToLayer: (feature, latlng) => {
          return L.circleMarker(latlng, this.markerStyle(feature.properties.UNIT_CODE));
        },
        onEachFeature: (feature, layer) => {
          const rawCode = feature.properties.UNIT_CODE;
          const name = feature.properties.UNIT_NAME;
          feature.properties._rawCode = rawCode;
          layer.bindTooltip(name, { sticky: true, className: 'map-tooltip' });
          layer.on('click', () => toggle(rawCode, name, this.kind));
        }
      }).addTo(this._map);
      this._map.fitBounds(this._layer.getBounds(), { padding: [20, 20] });

      setTimeout(() => this._map.invalidateSize(), 1000);
    } catch(e) { console.error('Failed to load national parks GeoJSON', e); }
  },

  markerStyle(rawCode) {
    const v = isVisited(this.kind, rawCode);
    return {
      radius: 7,
      fillColor: v ? this.visitedColor : this.unvisitedColor,
      fillOpacity: v ? 0.9 : 0.6,
      color: '#0d1117',
      weight: 1
    };
  },

  refresh() {
    if (!this._layer) return;
    this._layer.eachLayer(layer => {
      layer.setStyle(this.markerStyle(layer.feature.properties._rawCode));
    });
  }
});