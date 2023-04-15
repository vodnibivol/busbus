// global
let map;
let buses;
let lines;

const Icons = {
  bus: L.icon({
    iconUrl: '/static/img/bus_arrow.png',
    iconSize: [48, 48],
  }),
  station: L.icon({
    iconUrl: '/static/img/station.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
};

const Main = (async function () {
  // init
  init();

  // f(x)
  function init() {
    map = L.map('map').setView([46.05, 14.52], 13);

    initMap();

    // --- TRIPS

    let trips = tripsData;
    if (stopData.location) trips = trips.filter((t) => t.stops.some((s) => s.ref_id == stopData.ref_id));
    trips = trips.filter((t) => !!t.coordinates);

    // --- LINES

    lines = new Lines(trips);

    // zoom on location
    if (stopData.location) {
      const stopMarker = L.marker(stopData.location, {
        icon: Icons.station,
        zIndexOffset: -1000,
      });

      stopMarker.addTo(map);
      map.setView(stopData.location, 14);
      stopMarker.addEventListener('click', () => map.setView(stopData.location, 15));

      if (lines.lines.length) {
        lines.lines[0].show();
      }
    }

    // --- BUSES

    buses = new Buses(trips);
    buses.update();
    setInterval(() => buses.update(), 1000);
  }

  function initMap() {
    const mapConfig = {
      maxZoom: 18,
      minZoom: 12,
      id: 'mapbox/streets-v11',
      tileSize: 512,
      zoomOffset: -1,
      accessToken: 'pk.eyJ1Ijoidm9kbmliaXZvbCIsImEiOiJjbDBrb2ZhNTIwb2YxM2ltOXVmMG5qbW05In0.eH6IYRJquEFQgNTXGcyBmA',
      // attribution: 'vodnibivol | <a href="/">Home</a>',
      attribution: '',
    };
    const tileLayer = 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}{r}?access_token={accessToken}';

    L.tileLayer(tileLayer, mapConfig).addTo(map);

    // attribution
    document.querySelector('.leaflet-control-attribution').innerHTML = mapConfig.attribution;
  }
})();
