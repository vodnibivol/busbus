const Input = () => ({
  input: '',
  station: {},
  stations: [],
  routes: [],
  loading: false,
  eta: true,

  stopHistory: Alpine.$persist([]),

  async init() {
    document.querySelector('input').select();

    this.stations = [
      ...stations.to.map((s) => ({ ...s, center: 1 })),
      ...stations.from.map((s) => ({ ...s, center: 0 })),
    ];
  },

  stopColor(stopId) {
    const perc = this.stations.findIndex((s) => s.ref_id === stopId) / this.stations.length;
    const hue = perc * 360;
    return `hsl(${hue}, 80%, 90%)`;
  },

  get stopSearch() {
    if (this.input.length < 3) return [];
    return this.stations
      .filter((s) => new RegExp(this.input, 'i').test(s.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  removeStop(stopId) {
    this.stopHistory = this.stopHistory.filter((s) => s.ref_id !== stopId);
  },

  async select(stopId) {
    this.loading = true;

    this.station = this.stations.find((s) => s.ref_id === stopId);

    setTimeout(() => {
      this.input = this.station.name; // FIXME: zakaj mora bit ta delay?

      // ADD TO HISTORY
      this.stopHistory = this.stopHistory.filter(({ name }) => name !== this.station.name);
      this.stopHistory.unshift(this.station);
      this.stopHistory = this.stopHistory.slice(0, 4);
    }, 10);

    const res = await fetch('/api/getStopData/' + stopId);
    const data = await res.json();

    this.routes = data.sort((route1, route2) => parseInt(route1[0].key) - parseInt(route2[0].key));
    this.loading = false;
  },

  onInput() {
    this.routes = [];
    this.station = {};
  },

  resetInput() {
    this.routes = [];
    this.station = {};
    this.input = '';
    $('#input input').select();
  },

  showMap(routeNo) {
    location.href = `/map?stop=${this.station.ref_id}&route=${routeNo}`;
  },
});
