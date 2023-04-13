class Lines {
  constructor() {
    this.lines = routes.map((r) => new Line(r));
    console.log(this.lines);

    if (this.lines.length) this.lines[0].focus();
  }

  show(trip_id) {
    console.log(trip_id);
    const line = this.lines.find((t) => t.trip_id === trip_id);
    if (line) line.show();
    else console.warn('no line with id: ' + trip_id);
  }

  hide(trip_id) {
    console.log('hide');
    const line = this.lines.find((t) => t.trip_id === trip_id);
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
