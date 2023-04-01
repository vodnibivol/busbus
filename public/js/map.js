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
  }),
};

const Main = (async function () {
  // init
  init();

  // f(x)
  function init() {
    map = L.map('map').setView([46.05, 14.52], 13);

    initMap();
    L.control.locate().addTo(map);

    // get bus line
    const params = new URLSearchParams(location.search);
    const r = params.get('route') || '';
    const routes = r.split(',').map((i) => i.trim());

    buses = new Buses(routes);
    buses.update();

    setInterval(() => {
      buses.update();
    }, 1000);

    // lines
    lines = new Lines(routes);

    // zoom on location
    const stopId = params.get('stop');
    if (stopId) {
      const stop = stops.find((s) => s.id == stopId);
      const stopMarker = L.marker(stop.latlon, {
        icon: Icons.station,
      });

      // stopMarker.bindPopup(stop.name);
      stopMarker.addTo(map);

      stopMarker.addEventListener('click', () => {
        map.setView(stop.latlon, 15);
      });
    }
  }

  function initMap() {
    const mapConfig = {
      maxZoom: 18,
      minZoom: 12,
      id: 'mapbox/streets-v11',
      tileSize: 512,
      zoomOffset: -1,
      accessToken: 'pk.eyJ1Ijoidm9kbmliaXZvbCIsImEiOiJjbDBrb2ZhNTIwb2YxM2ltOXVmMG5qbW05In0.eH6IYRJquEFQgNTXGcyBmA',
      attribution: 'vodnibivol | <a href="/">Home</a>',
    };
    const tileLayer = 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}{r}?access_token={accessToken}';

    L.tileLayer(tileLayer, mapConfig).addTo(map);

    // attribution
    document.querySelector('.leaflet-control-attribution').innerHTML = mapConfig.attribution;
  }
})();
