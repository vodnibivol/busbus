const Input = () => ({
  input: '',
  selectedStop: {},
  stops: [],
  routes: [],
  loading: false,
  eta: true,

  dataAge: 0, // seconds
  ageTimer: null,

  stopHistory: Alpine.$persist([]),

  async init() {
    this.stops = [...stations.to.map((s) => ({ ...s, center: 1 })), ...stations.from.map((s) => ({ ...s, center: 0 }))];

    $('input').select();
  },

  get filteredHistory() {
    const count = arrayCount(this.stopHistory);
    const arr = [];
    for (let id of this.stopHistory) {
      if (count[id] < 3) continue;
      let s = this.stops.find((s) => s.ref_id === id);
      const alreadyInArr = arr.find((a) => a.name === s.name);
      if (s && !alreadyInArr) arr.push(s);
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
    this.stopHistory.unshift(this.selectedStop.ref_id);

    const res = await fetch('/api/getStopData/' + stopId);
    const data = await res.json();

    this.routes = data.sort((route1, route2) => parseInt(route1[0].key) - parseInt(route2[0].key));
    this.loading = false;

    // clear and restart timer
    clearInterval(this.ageTimer);
    this.dataAge = 0;
    this.ageTimer = setInterval(() => ++this.dataAge, 1000);
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
    location.href = `/map?stop=${this.selectedStop.ref_id}&route=${routeNo}&center=${this.selectedStop.center}`;
  },
});

// helper functions

function arrayCount(arr) {
  return arr.reduce((acc, cur) => {
    acc[cur] = (acc[cur] || 0) + 1;
    return acc;
  }, {});
}
