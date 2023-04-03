const Input = () => ({
  input: '',
  selectedStop: {},
  stops: [],
  routes: [],
  loading: false,
  eta: true,

  stopHistory: Alpine.$persist([]),

  async init() {
    this.stops = [...stations.to.map((s) => ({ ...s, center: 1 })), ...stations.from.map((s) => ({ ...s, center: 0 }))];

    $('input').select();
  },

  get filteredHistory() {
    const arr = [];
    for (let id of this.stopHistory) {
      let s = this.stops.find((s) => s.ref_id === id);
      if (s && !arr.find((a) => a.name === s.name)) arr.push(s);
    }
    return arr;
  },

  get stopSearch() {
    if (this.input.length < 3) {
      return [];
    } else {
      // seznam IMEN postaj (brez C/N), dedupliciran
      const arr = [];
      for (let stop of this.stops) {
        if (new RegExp(this.input, 'i').test(stop.name) && !arr.includes(stop.name)) arr.push(stop.name); // TODO
      }
      return arr.sort((a, b) => a.localeCompare(b));
    }
  },

  get filteredStopOptions() {
    return this.stops
      .filter((s) => s.name === this.input)
      .map((val, ind, arr) => ({
        ...val,
        // text: `${ind+1}) ` + (val.center ? 'V CENTER' : 'IZ CENTRA'),
        text: (function () {
          // check in filteredStops if there are >1 with same text output ("V CENTER" / "IZ CENTRA")
          const sameDirOptions = arr.filter((o) => o.center === val.center);
          const sym = String.fromCharCode(65 + sameDirOptions.findIndex((o) => o.ref_id === val.ref_id));
          const indexText = sameDirOptions.length > 1 ? ` (${sym})` : '';
          return val.center ? 'V CENTER' + indexText : 'IZ CENTRA' + indexText;
        })(),
      }));
  },

  removeStop(stopId) {
    this.stopHistory = this.stopHistory.filter((s) => s.ref_id !== stopId);
  },

  async select(stopId) {
    this.loading = true;

    this.selectedStop = this.filteredStopOptions.find((s) => s.ref_id === stopId);

    setTimeout(() => {
      this.input = this.selectedStop.name; // FIXME: zakaj mora bit ta delay?
      this.stopHistory.unshift(this.selectedStop.ref_id);
    }, 10);

    const res = await fetch('/api/getStopData/' + stopId);
    const data = await res.json();

    this.routes = data.sort((route1, route2) => parseInt(route1[0].key) - parseInt(route2[0].key));
    this.loading = false;
  },

  onInput() {
    this.routes = [];
    this.selectedStop = {};
  },

  resetInput() {
    this.routes = [];
    this.selectedStop = {};
    this.input = '';
    $('#input input').select();
  },

  showMap(routeNo) {
    location.href = `/map?stop=${this.selectedStop.ref_id}&route=${routeNo}`;
  },
});
