class Buses {
  constructor(routeNo) {
    this.routeNo = routeNo;
    this.buses = [];
  }

  async update() {
    await this.updateData();
    this.clean();
    this.draw();
  }

  async updateData() {
    // update buses data
    const r = await fetch(`/api/getBusData/${this.routeNo}`);
    const j = await r.json();

    for (let busData of j.data) {
      const id = busData.bus_unit_id;

      let bus = this.buses.find((b) => b.id === id);
      if (bus) bus.update(busData);
      else this.buses.push(new Bus(id, busData));
    }
  }

  clean() {
    // remove old buses
    const MAX_AGE = 120; // 2 minutes

    for (let i = this.buses.length - 1; i; --i) {
      if (this.buses[i].age > MAX_AGE) {
        map.removeLayer(this.buses[i].marker);
        this.buses.pop();
      }
    }
  }

  draw() {
    this.buses.forEach((b) => b.draw());
  }
}

class Bus {
  constructor(id, data) {
    this.id = id;
    this.data = null;
    this.marker = null;

    this.update(data);
  }

  get age() {
    // when was bus data last updated (seconds)
    return Math.round((new Date() - new Date(this.data.bus_timestamp)) / 1000);
  }

  get popupContent() {
    return [
      `- ${this.data.destination} (${this.data.route_number})`,
      `- pred ${this.age} sekundami`,
      `- [${this.data.bus_name}]`,
    ].join('<br>');
  }

  update(data) {
    // update (only data)
    this.data = data;
    console.log(this.data);
    this.latlon = [data.latitude, data.longitude];
  }

  draw() {
    if (this.marker) {
      this.marker.setLatLng(new L.LatLng(...this.latlon));
      this.marker.setRotationAngle(this.data.cardinal_direction - 90);
      this.marker.bindPopup(this.popupContent);
      return;
    }

    this.marker = L.marker(this.latlon, {
      icon: Icons.bus,
      rotationAngle: this.data.cardinal_direction - 90,
      rotationOrigin: 'center',
    });

    this.marker.bindPopup(this.popupContent);
    this.marker.addTo(map);
    this.marker.on('click', () => this.marker.bindPopup(this.popupContent));
  }

  removeMarker() {
    if (this.marker) map.removeLayer(this.marker);
  }
}

// global map
const map = L.map('map').setView([46.05, 14.52], 13);

const Main = (async function () {
  // init
  init();

  // f(x)
  function init() {
    initMap();
    L.control.locate().addTo(map);

    // get bus line
    const params = new URLSearchParams(location.search);
    const routeNo = params.get('line');

    const BUSES = new Buses(routeNo);
    BUSES.update();

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
      zoomOffset: -1,
      accessToken: 'pk.eyJ1Ijoidm9kbmliaXZvbCIsImEiOiJjbDBrb2ZhNTIwb2YxM2ltOXVmMG5qbW05In0.eH6IYRJquEFQgNTXGcyBmA',
      attribution: '<a href="/">Home</a>',
    };
    const tileLayer = 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}{r}?access_token={accessToken}';

    L.tileLayer(tileLayer, mapConfig).addTo(map);
  }
})();

const Icons = {
  bus: L.icon({
    iconUrl: '/public/img/bus_arrow.png',
    iconSize: [48, 48],
  }),
  station: L.icon({
    iconUrl: '/public/img/station.png',
    iconSize: [32, 32],
  }),
};
