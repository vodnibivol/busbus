const Main = {
  map: null,
  tileLayer: null,

  routeBusData: {},

  station_code: null,
  trip_id: null,

  async init() {
    // --- EVENTS
    $('.bus-info-container #closeBtn').onclick = this.closeInfo;
    $('.back-button').onclick = () => {
      document.body.classList.add('loading');
      window.location = '/busbus/'; // () => history.back()
    };
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
    L.control
      .locate({
        position: 'bottomright',
        initialZoomLevel: 16,
        showCompass: false,
        locateOptions: {
          enableHighAccuracy: true,
        },
      })
      .addTo(this.map);

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

    this.drawRouteShape();

    // --- UPDATE BUSES

    this.updateBuses();
    setInterval(this.updateBuses.bind(this), 3000);
  },

  async updateBuses() {
    // get buses
    const bus_res = await fetch('api/bus/buses-on-route?trip_id=' + this.trip_id);
    const bus_data = await bus_res.json();
    // console.log(bus_data);

    // iterate through NEW buses
    for (let bus of bus_data) {
      this.routeBusData[bus.bus_unit_id] = {...this.routeBusData[bus.bus_unit_id], ...bus};

      // CREATE MARKER
      if (!this.routeBusData[bus.bus_unit_id].marker) {
        this.routeBusData[bus.bus_unit_id].marker = L.marker([bus.latitude, bus.longitude], {
          rotationOrigin: 'center center',
          title: bus.bus_name,
          icon: this.determineBusIcon(bus),
        })
          .addTo(this.map)
          .on('click', () => this.openInfo(bus.bus_unit_id));
      }

      this.routeBusData[bus.bus_unit_id].marker.setRotationAngle(bus.cardinal_direction - 90);
      this.routeBusData[bus.bus_unit_id].marker.setLatLng([bus.latitude, bus.longitude]);
      this.routeBusData[bus.bus_unit_id].marker.setIcon(this.determineBusIcon(bus));
      this.routeBusData[bus.bus_unit_id].marker.setOpacity(bus.bus_data_age > 60 ? 0.5 : 1);

      // set data age text
      this.dataAge = 0;
    }

    // iterate through OLD buses

    // if bus-info open, update data
    if ($('.bus-info-container.open')) {
      const bus_id = $('#textBox .bus > span.title').dataset.busId;
      const bus_data = this.routeBusData[bus_id];
      updateBusInfo(bus_data);
    }
  },

  async drawRouteShape() {
    // get shape
    const route_res = await fetch(`api/route-shape?trip_id=${this.trip_id}`);
    const route_data = await route_res.json();
    // console.log(route_data);

    if (route_data.geojson_shape) {
      L.geoJson(route_data.geojson_shape, {
        color: '#51504Dcc', // cornflowerblue, dodgerblue, royalblue, rgb(233, 106, 57)
        weight: 3,
        dashArray: '4 10',
      }).addTo(this.map);
    }
  },

  openInfo(bus_id) {
    const bus_data = this.routeBusData[bus_id];
    updateBusInfo(bus_data);

    console.log(bus_data);

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
