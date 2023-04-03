class Lines {
  constructor() {
    this.trips = routes.map((r) => new Line(r));
    console.log(this.trips);

    if (this.trips.length) this.trips[0].focus();
  }

  show(trip_id) {
    console.log(trip_id);
    const line = this.trips.find(t => t.trip_id === trip_id)
    if (line) line.show();
  }

  hide(trip_id) {
    console.log('hide');
    const line = this.trips.find(t => t.trip_id === trip_id)
    if (line) line.hide();
  }
}

class Line {
  constructor({ trip_id, coordinates }) {
    this.trip_id = trip_id;
    this.coordinates = coordinates;

    this.polyline = L.polyline(coordinates, {
      color: 'royalblue', // cornflowerblue, dodgerblue, royalblue
      opacity: 0.5,
      lineCap: 'round',
      lineJoin: 'round',
    });
  }

  show() {
    this.polyline.addTo(map);
  }

  hide() {
    map.removeLayer(this.polyline);
  }

  focus() {
    map.fitBounds(this.polyline.getBounds());
  }
}
