/**
 * load buses data
 *
 * for each bus in data:
 *
 * if bus exists:
 *    update data with its data
 * else:
 *    create new bus with data
 *
 * for each bus in buses:
 * if (bus.age > MAX_AGE) remove();
 * else bus.draw():
 *    if (marker)
 *      move (use data)
 *    else:
 *      new marker
 */

class Buses {
  constructor(routeNo) {
    this.routeNo = routeNo;
    this.buses = [];
  }

  async update() {
    // update buses data
    const r = await fetch(`/api/getBusData/${this.routeNo}`);
    const j = await r.json();

    this.buses.forEach((b) => b.removeMarker());
    this.buses = [];

    for (let busData of j.data) {
      const bus = new Bus(busData);
      this.buses.push(bus);
    }

    this.draw();
  }

  draw() {
    this.buses.forEach((b) => b.draw());
  }

  getBus(busName) {
    return this.buses.find((b) => b.data.bus_name === busName);
  }
}

class Bus {
  constructor(data) {
    this.data = null;
    this.marker = null;

    this.update(data);
  }

  get age() {
    return Math.round((new Date() - this.updatedAt) / 1000);
  }

  update(data) {
    this.data = data;

    this.updatedAt = new Date(data.bus_timestamp);
    this.fetchedAt = new Date();

    this.id = data.bus_name;
    this.latlon = [data.latitude, data.longitude];
  }

  updateTs() {
    const popupContent = `<b>[ ${this.data.route_number} ]</b> - ${this.data.destination}<br>${this.age}s ago`;
    this.marker.bindPopup(popupContent);
  }

  draw() {
    // draw
    this.marker = L.marker(this.latlon, {
      icon: Icons.bus,
      rotationAngle: this.data.cardinal_direction - 90,
      rotationOrigin: 'center',
    });
    const popupContent = `<b>[ ${this.data.route_number} ]</b> - ${this.data.destination}<br>${this.age}s ago`;
    this.marker.bindPopup(popupContent);
    this.marker.addTo(map);

    console.log(this.marker._icon.style.transform);

    this.marker.on('click', this.updateTs.bind(this));
  }

  removeMarker() {
    if (this.marker) map.removeLayer(this.marker);
  }
}

// global map
const map = L.map('map', {
  zoomControl: false,
  attributionControl: false,
}).setView([46.0558, 14.5412], 12); // .setView([46.0558, 14.5412], 14);

const Main = (async function () {
  // init
  init();
  getDeviceLoc();

  // f(x)
  function init() {
    initMap();

    // get bus line
    const params = new URLSearchParams(location.search);
    const routeNo = params.get('line');

    const BUSES = new Buses(routeNo);
    BUSES.update(); // update and draw

    setInterval(() => {
      BUSES.update();
    }, 5000);
  }

  function initMap() {
    const mapConfig = {
      maxZoom: 18,
      minZoom: 12,
      id: 'mapbox/streets-v11',
      tileSize: 512,
      // detectRetina: true, // makes text too small
      zoomOffset: -1,
      accessToken: 'pk.eyJ1Ijoidm9kbmliaXZvbCIsImEiOiJjbDBrb2ZhNTIwb2YxM2ltOXVmMG5qbW05In0.eH6IYRJquEFQgNTXGcyBmA',
    };
    const tileLayer = 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}{r}?access_token={accessToken}';

    L.tileLayer(tileLayer, mapConfig).addTo(map);
  }

  // get location

  function getDeviceLoc() {
    map.locate(); // { setView: true, maxZoom: 16 }
    map.on('locationfound', onLocationFound);
    map.on('locationerror', (e) => console.error(e));
  }

  async function onLocationFound(e) {
    // draw location circle
    const DEVICE_LOCATION = [e.latitude, e.longitude];
    map.setView(DEVICE_LOCATION, 15);

    L.circle(DEVICE_LOCATION, { radius: e.accuracy }).addTo(map);
    L.circle(DEVICE_LOCATION, { radius: 500, color: 'lightblue' }).addTo(map);

    // draw nearby stations
    const r = await fetch(`/api/getNearbyStations?lat=${e.latitude}&lon=${e.longitude}&d=500`);
    const stations = await r.json();

    for (let station of stations) {
      let stationMarker = L.marker(station.latlon, { icon: Icons.station }).addTo(map);
      stationMarker.bindPopup(`<b>${station.name}</b><br>id: ${station.id}`);
    }
  }
})();

const Icons = {
  bus: L.icon({
    iconUrl: '/public/img/bus2.png',
    iconSize: [48, 48],
  }),
  station: L.icon({
    iconUrl: '/public/img/stop2.png',
    iconSize: [32, 32],
  }),
};

// --- utils

function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const deltaLon = lon2 - lon1;
  const deltaLambda = (deltaLon * Math.PI) / 180;
  const d = Math.acos(Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(deltaLambda)) * R;
  return d;
}
