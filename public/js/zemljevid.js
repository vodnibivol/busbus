const Main = {
  map: null,
  tileLayer: null,

  routeBusData: {},
  routeBusMarkers: {},

  dataAge: 0,

  station_code: null,
  trip_id: null,

  async init() {
    // --- EVENTS
    $('.bus-info-container #closeBtn').onclick = this.closeInfo;
    $('.back-button').onclick = () => (window.location = '/busbus/'); // () => history.back()
    $('#editData').onclick = () => document.body.classList.add('loading');
    $('spacer').onclick = this.closeInfo;

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

    for (let bus of bus_data) {
      this.routeBusData[bus.bus_unit_id] = bus;

      const latLng = [bus.latitude, bus.longitude];

      if (this.routeBusMarkers[bus.bus_unit_id]) {
        // ON CHANGE
        this.routeBusMarkers[bus.bus_unit_id].setLatLng(latLng).setIcon(this.determineBusIcon(bus));
      } else {
        // ON CREATE
        this.routeBusMarkers[bus.bus_unit_id] = L.marker(latLng, {
          rotationOrigin: 'center center',
          title: bus.bus_name,
          icon: this.determineBusIcon(bus),
        })
          .addTo(this.map)
          .on('click', () => this.openInfo(bus.bus_unit_id));
      }

      this.routeBusMarkers[bus.bus_unit_id].setRotationAngle(bus.cardinal_direction - 90);

      // set data age text
      this.dataAge = 0;
    }
  },

  async getRouteShape() {
    // get shape
    const route_res = await fetch(`api/route-shape?trip_id=${this.trip_id}`);
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

  async openInfo(bus_id) {
    console.log(bus_id);
    const bus_data = this.routeBusData[bus_id];
    console.log(bus_data);
    console.log(bus_data);

    const ratings = {
      1: 'Grozen! (1)',
      2: 'Neprijazen! (2)',
      3: 'Meh ... (3)',
      4: 'Vredu. (4)',
      5: 'Super! (5)',
    };

    // populate data
    $('.bus-info-container .route .content').innerText = `${bus_data.route_number}) ${bus_data.route_name}`;
    $('.bus-info-container .direction .content').innerText = bus_data.destination;
    $('.bus-info-container .bus .registration .content').innerText = bus_data.bus_name;

    $('.bus-info-container .bus .description .content').innerText = bus_data.bus_description || 'Ni podatkov.';
    $('.bus-info-container .driver .nickname .content').innerText = bus_data.driver_nickname || 'Ni podatkov.';
    $('.bus-info-container .driver .rating .content').innerText = ratings[bus_data.driver_rating] || 'Ni podatkov.';
    $('.bus-info-container .driver .description .content').innerText = bus_data.driver_description || 'Ni podatkov.';

    // prettier-ignore
    $('#editData').href = `objavi?bus_id=${bus_data.bus_unit_id}&driver_id=${bus_data.driver_id}&from_url=${encodeURIComponent(location.href)}`;

    $('.bus-info-container').classList.add('open');
  },

  closeInfo() {
    $('.bus-info-container').classList.remove('open');
  },

  determineBusIcon(bus_data) {
    if (!bus_data.user_edited) return Icons.bus;

    if (bus_data.driver_rating && parseInt(bus_data.driver_rating) < 3) return Icons.bus_bad_rating;
    return Icons.bus_user_edited;
  },
};

// --- ICONS

const Icons = {
  bus: L.icon({
    iconUrl: 'public/img/busek_arrow.png',
    iconSize: [48, 48],
  }),
  bus_user_edited: L.icon({
    iconUrl: 'public/img/busek_arrow_user-edited.png',
    iconSize: [48, 48],
  }),
  bus_bad_rating: L.icon({
    iconUrl: 'public/img/busek_arrow_bad-rating.png',
    iconSize: [48, 48],
  }),
  station: L.icon({
    iconUrl: 'public/img/postaja.png',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  }),
};

Main.init();
