class Buses {
  constructor(trips) {
    // trips = tripsData, ampak filterano .. točno ti tripi, ki jih hočeš pokazat.
    this.routeNumbers = [...trips.map((t) => t.number)];
    this.trips = trips;

    this.buses = [];
    this.tripIds = this.trips.map((t) => t.trip_id);

    this.counter = 0;
    this.routeNo = null;
  }

  async update() {
    this.routeNo = this.routeNumbers[this.counter++ % this.routeNumbers.length];

    await this.updateData();
    this.updateTrips();
    this.draw();
  }

  async updateData() {
    // update buses data
    let r, j;

    try {
      r = await fetch(`/api/getBusData/${this.routeNo}`);
      j = await r.json();
      // console.log(j.data);
    } catch (error) {
      console.error(error);
      j = { data: [] };
    }

    for (let busData of j.data) {
      // if tripData not in tripsData: continue
      // if (!this.trips.find((t) => t.trip_id === busData.trip_id)) continue;
      // console.log(busData);

      const bus = this.buses.find((b) => b.bus_unit_id === busData.bus_unit_id);
      if (bus) bus.update(busData);
      else this.buses.push(new Bus(busData));
    }

    // show message if no data
    if (!this.buses.length) {
      $('#msg').classList.remove('hidden');
    } else {
      $('#msg').classList.add('hidden');
    }
  }

  updateTrips() {
    const tripIds = [...new Set(this.buses.map((b) => b.trip_id))]; //.sort();
    this.buses.forEach((b) => (b.destination_code = tripIds.indexOf(b.trip_id)));
  }

  draw() {
    this.buses.forEach((b) => b.draw());
  }
}

// --- class BUS

class Bus {
  constructor(data) {
    this.bus_unit_id = data.bus_unit_id;
    this.marker = null;

    this.update(data);
  }

  get age() {
    // when was bus data last updated (seconds)
    return Math.round((new Date() - new Date(this.bus_timestamp)) / 1000);
  }

  get popupContent() {
    let age = this.age;
    let ageMsg;
    if (age > 3600) ageMsg = `pred ${Math.round(age / 3600)} urami`;
    else if (age > 60) ageMsg = `pred ${Math.round(age / 60)} minutami`;
    else ageMsg = `pred ${age} sekundami`;

    return `\
    - ${this.destination} (${this.route_number})
    - ${ageMsg}
    - [${this.bus_name}]`.replaceAll('\n', '<br>');
  }

  update(data) {
    // update (only data)
    for (let prop in data) {
      this[prop] = data[prop];
    }
    this.latlon = [data.latitude, data.longitude];
  }

  draw() {
    if (!this.marker) {
      // first time
      this.marker = L.marker(this.latlon, {
        icon: Icons.bus,
        rotationOrigin: 'center',
      });

      this.marker.addTo(map);

      // --- events
      this.marker.on('click', () => this.marker.bindPopup(this.popupContent));

      if (!stopData.location) {
        this.marker.on('popupopen', () => lines.show(this.trip_id));
        this.marker.on('popupclose', () => lines.hide(this.trip_id));
      }
    }

    this.marker.setLatLng(new L.LatLng(...this.latlon));
    this.marker.setRotationAngle(this.cardinal_direction - 90);
    this.marker.bindPopup(this.popupContent);

    this.marker._icon.style.opacity = this.age > 60 ? '0.5' : '1';
    this.marker._icon.style.filter = 'hue-rotate(' + this.destination_code * 280 + 'deg)';
  }

  removeMarker() {
    if (this.marker) map.removeLayer(this.marker);
  }
}
