const Map = (function () {
  //
})();

const Main = (async function () {
  // vars
  const BUS_DATA = {}; // MARKERS >> routeIds >> busIds
  const map = L.map('map').setView([46.0558, 14.5412], 11); // .setView([46.0558, 14.5412], 14);

  let DEVICE_LOCATION;
  let nearbyStations;
  let nearbyRoutes = [];

  // init
  initMap();
  getDeviceLoc();

  // f(x)
  function initMap() {
    const mapConfig = {
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
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

  // draw location and move view

  function onLocationFound(e) {
    DEVICE_LOCATION = [e.latitude, e.longitude];
    console.log(DEVICE_LOCATION);

    let yourLocation = L.circle(DEVICE_LOCATION, { radius: e.accuracy }).addTo(map);
    yourLocation.bindPopup(`your location:<br><b>${DEVICE_LOCATION.join()}</b>`); // .openPopup();
    map.setView(DEVICE_LOCATION, 15);

    L.circle(DEVICE_LOCATION, { radius: 500, color: 'lightblue' }).addTo(map);
    // proceed
    drawNearbyStations();
  }

  // get nearby stations (r=500) and draw them on map

  async function getNearbyStations([lat, lon], distance) {
    let url = `/api/getNearbyStations?lat=${lat}&lon=${lon}`;
    if (distance) url += `&d=${distance}`;

    let r = await fetch(url);
    let j = await r.json();
    return j;
  }

  async function drawNearbyStations() {
    nearbyStations = await getNearbyStations(DEVICE_LOCATION, 500);

    for (let station of nearbyStations) {
      // console.log(station);
      let stationMarker = L.marker(station.latlon, { icon: Icons.station }).addTo(map);
      stationMarker.bindPopup(`<b>${station.name}</b><br>id: ${station.id}`);
    }

    // proceed
    getNearbyStationRoutes();
  }

  // get routes of nearby stations (lpp.si) and and remove duplicates

  async function getNearbyStationRoutes() {
    for (let station of nearbyStations) {
      let url = `/api/getStationData/${station.id}`;
      let r = await fetch(url);
      let j = await r.json();

      // console.log(j);

      // get route no. from json
      for (let route of j) {
        // console.log(route);
        for (let arrival of route) {
          // console.log(arrival);
          let lineNo = arrival.key.toString();
          if (!nearbyRoutes.includes(lineNo)) nearbyRoutes.push(lineNo);
        }
      }

      // console.log('nearby routes found:');
      console.log(nearbyRoutes);
    }

    // proceed
    drawBusLocations();
  }

  // get buses of nearby routes and draw them on the map
  // get only nearby buses (1500m)

  async function getBusLocations(lineNo) {
    let r = await fetch(`/api/getBusData/${lineNo}`);
    let j = await r.json();

    if (!j.success) return null;

    // filter buses to only close ones
    let buses = j.data;

    const MAX_DISTANCE = 1500; // m
    let nearbyBuses = buses.filter((bus) => {
      let { latitude, longitude } = bus;
      return haversineDistance([latitude, longitude], DEVICE_LOCATION) < MAX_DISTANCE;
    });
    // console.log(buses);
    // console.log(nearbyBuses);

    return nearbyBuses;
  }

  async function drawBusLocations() {
    for (let routeNo of nearbyRoutes) {
      let busLocations = await getBusLocations(routeNo);
      // console.log(busLocations);

      if (!busLocations || !busLocations.length) continue;

      for (let bus of busLocations) {
        let routeId = bus.route_id; // "trip_id"?
        let busId = bus.bus_unit_id;
        let busUpdateTimestamp = bus.bus_timestamp;

        let timeDiff = Math.floor((new Date() - new Date(busUpdateTimestamp)) / 1000);
        // let popupContent = `LINIJA ${bus.route_number}<br>${bus.route_name}<br>${timeDiff}s ago`;
        let popupContent = `<b>[ ${bus.route_number} ]</b> - ${bus.destination}<br>${timeDiff}s ago`;

        // create route object for storing data and markers
        if (!BUS_DATA[routeId]) BUS_DATA[routeId] = {};

        let busMarker;
        let busExists = !!BUS_DATA[routeId][busId];

        if (busExists) {
          busMarker = moveMarker(BUS_DATA[routeId][busId].marker, [bus.latitude, bus.longitude]);
          busMarker.setPopupContent(popupContent);
        } else {
          busMarker = L.marker([bus.latitude, bus.longitude], { icon: Icons.bus });
          busMarker.bindPopup(popupContent);
          busMarker.addTo(map);
        }

        BUS_DATA[routeId][busId] = { marker: busMarker, data: bus };
      }
    }

    // proceed
    if (!updateInterval) {
      updateMarkersInterval();
    }
  }

  let updateInterval;

  // updateBusMarkers() - 2s && updateLocation()

  function updateMarkersInterval() {
    console.log('interval');
    updateInterval = setInterval(drawBusLocations, 10000);
  }

  // ^^^ data updates asynchronously (stored in variables), function update is called periodically on vars

  function moveMarker(marker, latlon) {
    let newLoc = new L.LatLng(...latlon);
    marker.setLatLng(newLoc);
    return marker;
  }

  function haversineDistance([lat1, lon1], [lat2, lon2]) {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const deltaLon = lon2 - lon1;
    const deltaLambda = (deltaLon * Math.PI) / 180;
    const d = Math.acos(Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(deltaLambda)) * R;
    return d;
  }
})();

const Icons = {
  bus: L.icon({
    iconUrl: '/public/img/bus.png',
    iconSize: [32, 32],
  }),
  station: L.icon({
    iconUrl: '/public/img/bus_station.png',
    iconSize: [32, 32],
  }),
};

// map.distance
