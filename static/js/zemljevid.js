const Main = {
  map: null,
  tileLayer: null,
  // busObject: {},
  busMarkers: {},

  async init() {
    // --- MAP
    this.map = L.map('map', {
      center: [46.05, 14.507],
      zoom: 13,
      zoomControl: false,
    });

    this.tileLayer = L.tileLayer(
      'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}' + (L.Browser.retina ? '@2x.png' : '.png'),
      { attribution: '', subdomains: 'abcd' }
    ).addTo(this.map);

    // --- OBLIKA

    this.params = new URLSearchParams(window.location.search);
    this.station_code = this.params.get('station_code');
    this.route_id = this.params.get('route_id');
    this.trip_id = this.params.get('trip_id');
    this.route_group_number = this.params.get('route_group_number');

    if (this.route_id) {
      // get shape
      const route_res = await fetch(`/api/route?route_id=${this.route_id}&trip_id=${this.trip_id}`); // TODO: samo trip_id
      const route_data = await route_res.json();
      console.log('route_data:');
      console.log(route_data);

      if (route_data.geojson_shape) {
        const geojsonLayer = L.geoJson(route_data.geojson_shape, {
          color: 'cornflowerblue', // cornflowerblue, dodgerblue, royalblue
          opacity: 0.7,
          lineCap: 'round',
          lineJoin: 'round',
          weight: 5,
        }).addTo(this.map);

        const s = route_data.geojson_shape.bbox;
        this.map.fitBounds([
          [s[1], s[0]],
          [s[3], s[2]],
        ]);
      }

      // --- update buses
      this.updateBuses();
      setTimeout(() => this.updateBuses(), 2000);
    }
  },

  async updateBuses() {
    // get buses
    const bus_res = await fetch('/api/bus?route_group_number=' + this.route_group_number + '&trip_id=' + this.trip_id);
    const bus_data = await bus_res.json();

    console.log(bus_data);

    for (let bus of bus_data) {
      const latLng = [bus.latitude, bus.longitude];

      if (this.busMarkers[bus.bus_name]) {
        // premakni
        this.busMarkers[bus.bus_name].setLatLng(latLng).bindTooltip(bus.bus_name);
        //   this.busMarkers[bus].setIcon(L.divIcon({
        //     className: 'icon-active',
        //     iconSize:     [25, 25],
        //     iconAnchor:   [13, 13],
        //     popupAnchor:  [0, 0],
        //     html: `<p class="icon">${busObject[i].line_number ? busObject[i].line_number : "⬤"}</p>
        //             <img class="icon-pointer" style="transform: rotate(${busObject[i].direction + 225}deg)" src="img/ico/rotIcoActive.svg"/>`
        // }));
      } else {
        this.busMarkers[bus.bus_name] = L.marker(latLng, {
          rotationOrigin: 'center center',
          title: bus.bus_name,
          riseOnHover: true,
          icon: Icons.bus,
        })
          .addTo(this.map)
          .on('click', () => this.openInfo(bus));
      }

      this.busMarkers[bus.bus_name].setRotationAngle(bus.cardinal_direction - 90);
    }
  },

  openInfo(data) {
    console.log('open bus');
    console.log(data);
  },

  // station_code
  // trip_id

  // --- POSTAJA

  // if (stopData.location) {
  //   const stopMarker = L.marker(stopData.location, {
  //     icon: Icons.station,
  //     zIndexOffset: -1000,
  //   });

  //   stopMarker.addTo(map);
  //   map.setView(stopData.location, 14);
  //   stopMarker.addEventListener('click', () => map.setView(stopData.location, 15));
  // }
};

Main.init();

// --- ICONS

const Icons = {
  bus: L.icon({
    iconUrl: 'static/img/busek_arrow.png',
    iconSize: [48, 48],
  }),
  station: L.icon({
    iconUrl: 'static/img/postaja.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
};
