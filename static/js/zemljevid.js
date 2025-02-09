const Main = {
  map: null,
  tileLayer: null,
  busDetails: null,
  busMarkers: {},
  dataAge: 0,

  async init() {
    // --- EVENTS
    $('.bus-info-container #closeBtn').onclick = this.closeInfo;

    // --- MAP
    this.map = L.map('map', {
      center: [46.05, 14.507],
      zoom: 13,
      zoomControl: false,
    });

    this.map.on('drag', () => {
      this.map.fitBounds(this.map.getBounds());
    });

    this.tileLayer = L.tileLayer(
      'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}{r}?access_token={accessToken}',
      {
        maxZoom: 18,
        minZoom: 12,
        id: 'mapbox/streets-v8',
        tileSize: 512,
        zoomOffset: -1,
        // edgeBufferTiles: 1,
        accessToken: 'pk.eyJ1Ijoidm9kbmliaXZvbCIsImEiOiJjbDBrb2ZhNTIwb2YxM2ltOXVmMG5qbW05In0.eH6IYRJquEFQgNTXGcyBmA',
        attribution: '',
      }
    ).addTo(this.map);

    // Location marker
    L.control.locate({ position: 'bottomright', initialZoomLevel: 16 }).addTo(this.map);

    this.params = new URLSearchParams(window.location.search);
    this.station_code = this.params.get('station_code');
    this.trip_id = this.params.get('trip_id');

    // --- POSTAJA

    L.marker(station_locations[this.station_code], {
      icon: Icons.station,
      // zIndexOffset: -1000,
    })
      .addTo(this.map)
      .on('click', () => this.map.setView(station_locations[this.station_code], 15));
    this.map.setView(station_locations[this.station_code], 14);

    // --- OBLIKA

    this.getRouteShape();

    // --- UPDATE BUSES

    this.updateBuses();
    setInterval(() => this.updateBuses(), 5000);

    setInterval(() => {
      this.dataAge++;
      document.querySelector('#dataAge').innerText = this.dataAge + 's';
    }, 1000);
  },

  async getRouteShape() {
    // get shape
    const route_res = await fetch(`api/route-shape?trip_id=${this.trip_id}`); // TODO: samo trip_id
    const route_data = await route_res.json();
    // console.log(route_data);

    if (route_data.geojson_shape) {
      const geojsonLayer = L.geoJson(route_data.geojson_shape, {
        color: '#51504Dcc', // cornflowerblue, dodgerblue, royalblue
        // opacity: 0.7,
        // lineCap: 'round',
        // lineJoin: 'round',
        weight: 3,
        dashArray: '4 10',
      }).addTo(this.map);

      // const s = route_data.geojson_shape.bbox;
      // this.map.fitBounds([
      //   [s[1], s[0]],
      //   [s[3], s[2]],
      // ]);
    }
  },

  async updateBuses() {
    // get buses
    const bus_res = await fetch('api/bus/buses-on-route?trip_id=' + this.trip_id);
    const bus_data = await bus_res.json();
    console.log(bus_data);

    for (let bus of bus_data) {
      const latLng = [bus.latitude, bus.longitude];

      if (this.busMarkers[bus.bus_name]) {
        // premakni
        this.busMarkers[bus.bus_name].setLatLng(latLng);
        // this.busMarkers[bus].setIcon(
        //   L.divIcon({
        //     className: 'icon-active',
        //     iconSize: [25, 25],
        //     iconAnchor: [13, 13],
        //     popupAnchor: [0, 0],
        //     html: `<p class="icon">${busObject[i].line_number ? busObject[i].line_number : '⬤'}</p>
        //             <img class="icon-pointer" style="transform: rotate(${
        //               busObject[i].direction + 225
        //             }deg)" src="img/ico/rotIcoActive.svg"/>`,
        //   })
        // );
      } else {
        this.busMarkers[bus.bus_name] = L.marker(latLng, {
          rotationOrigin: 'center center',
          title: bus.bus_name,
          icon: Icons.bus,
        })
          .addTo(this.map)
          .on('click', () => this.openInfo(bus));
      }

      this.busMarkers[bus.bus_name].setRotationAngle(bus.cardinal_direction - 90);

      // set data age text
      this.dataAge = 0;
    }
  },

  async openInfo(data) {
    console.log(data);

    // populate data
    $('.bus-info-container .route .content').innerText = `${data.route_number}) ${data.route_name}`;
    $('.bus-info-container .direction .content').innerText = data.destination;
    $('.bus-info-container .bus .registration .content').innerText = data.bus_name;
    $('.bus-info-container .bus .description .content').innerText = '[...]';
    $('.bus-info-container .driver .niceness .content').innerText = '[...]';
    $('.bus-info-container .driver .nickname .content').innerText = '[...]';
    $('.bus-info-container .driver .description .content').innerText = '[...]';

    $('.bus-info-container').classList.add('open');

    // load info from db
    const r = await fetch('/api/bus/bus-details?bus_id=' + data.bus_unit_id);
    const d = await r.json();
    console.log(d);

    $('.bus-info-container .driver .nickname .content').innerText = d.driver_id;
  },

  closeInfo() {
    $('.bus-info-container').classList.remove('open');
  },
};

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

Main.init();
