const Main = {
  map: null,
  tileLayer: null,
  busDetails: null,
  busMarkers: {},
  dataAge: 0,

  station_code: null,
  trip_id: null,

  async init() {
    // --- EVENTS
    $('.bus-info-container #closeBtn').onclick = this.closeInfo;
    $('.back-button').onclick = () => (window.location = '/busbus/'); // () => history.back()

    // --- MAP
    this.map = L.map('map', {
      center: window.station_loc, // [46.05, 14.507] <= LJUBLJANA
      zoom: 14,
      zoomControl: false,
    });

    // draw shapes out of bounds
    this.map.on('drag', () => this.map.fitBounds(this.map.getBounds()));

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

    // Data
    const params = new URLSearchParams(window.location.search);
    this.station_code = params.get('station_code');
    this.trip_id = params.get('trip_id');

    // --- POSTAJA

    L.marker(window.station_loc, {
      icon: Icons.station,
      // zIndexOffset: -1000,
    })
      .addTo(this.map)
      .on('click', () => this.map.setView(window.station_loc, 15));

    // --- OBLIKA

    this.getRouteShape();

    // --- UPDATE BUSES

    this.updateBuses();
    setInterval(this.updateBuses.bind(this), 5000);

    // Data age
    setInterval(() => {
      $('#dataAge').innerText = ++this.dataAge;
    }, 1000);
  },

  async updateBuses() {
    // get buses
    const bus_res = await fetch('api/bus/buses-on-route?trip_id=' + this.trip_id);
    const bus_data = await bus_res.json();
    // console.log(bus_data);

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

  async getRouteShape() {
    // get shape
    const route_res = await fetch(`api/route-shape?trip_id=${this.trip_id}`); // TODO: samo trip_id
    const route_data = await route_res.json();
    // console.log(route_data);

    if (route_data.geojson_shape) {
      const geojsonLayer = L.geoJson(route_data.geojson_shape, {
        color: '#51504Dcc', // cornflowerblue, dodgerblue, royalblue, rgb(233, 106, 57)
        weight: 3,
        dashArray: '4 10',
      }).addTo(this.map);
    }
  },

  async openInfo(bus_data) {
    console.log(bus_data);

    $('#editData').classList.add('disabled');

    // populate data
    $('.bus-info-container .route .content').innerText = `${bus_data.route_number}) ${bus_data.route_name}`;
    $('.bus-info-container .direction .content').innerText = bus_data.destination;
    $('.bus-info-container .bus .registration .content').innerText = bus_data.bus_name;
    $('.bus-info-container .bus .description .content').innerText = 'nalaganje ...';
    $('.bus-info-container .driver .nickname .content').innerText = 'nalaganje ...';
    $('.bus-info-container .driver .rating .content').innerText = 'nalaganje ...';
    $('.bus-info-container .driver .description .content').innerText = 'nalaganje ...';

    $('.bus-info-container').classList.add('open');

    // load info from db
    const r = await fetch('api/bus/bus-details?bus_id=' + bus_data.bus_unit_id); // db in lpp data
    const bus_details = await r.json();
    console.log(bus_details);

    $('.bus-info-container .bus .description .content').innerText = bus_details.bus_description || 'ni podatkov.';
    $('.bus-info-container .driver .nickname .content').innerText = bus_details.driver_nickname || 'ni podatkov.';
    $('.bus-info-container .driver .rating .content').innerText = bus_details.driver_rating || 'ni podatkov.';
    $('.bus-info-container .driver .description .content').innerText = bus_details.driver_description || 'ni podatkov.';

    $('#editData').href = `objavi?bus_id=${bus_data.bus_unit_id}\
    &driver_id=${bus_details.driver_id}&from_url=${encodeURIComponent(location.href)}`;
    $('#editData').classList.remove('disabled');
  },

  closeInfo() {
    $('.bus-info-container').classList.remove('open');
  },
};

// --- ICONS

const Icons = {
  bus: L.icon({
    iconUrl: 'public/img/busek_arrow.png',
    iconSize: [48, 48],
  }),
  station: L.icon({
    iconUrl: 'public/img/postaja.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
};

Main.init();
