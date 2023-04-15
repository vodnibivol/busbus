const config = {
  data() {
    return {
      input: '',
      selectedStop: {},
      stops: [],
      arrivals: [],
      loading: false,
      eta: true,

      // timer
      dataExpires: Infinity,
      autoRefresh: true,
      tick: 0,

      stopHistory: [],

      version: '0.2', // after updating .. clears history etc.
    };
  },
  computed: {
    dataExpired() {
      this.tick++; // for reactivity
      return new Date().valueOf() >= this.dataExpires;
    },

    filteredHistory() {
      const count = arrayCount(this.stopHistory);
      const arr = [];
      for (let id of this.stopHistory.slice(0, 10)) {
        if (count[id] < 2) continue;
        let s = this.stops.find((s) => s.ref_id === id);
        const alreadyInArr = arr.find((a) => a.name === s.name);
        if (s && !alreadyInArr) arr.push(s);
      }
      return arr;
    },

    filteredSearch() {
      // const reg = new RegExp(latin(this.input), 'i');
      return this.input.length < 3 ? [] : this.stops.filter((s) => simplify(s.name).includes(simplify(this.input)));
    },

    searchResults() {
      return deduplicate(this.filteredSearch.map((r) => r.name)).sort((a, b) => a.localeCompare(b));
    },

    stopOptions() {
      return this.filteredSearch
        .filter((s) => s.name === this.input)
        .map((val, ind, arr) => ({
          ...val,
          // text: val.center ? 'V CENTER' : 'IZ CENTRA',
          text: (function () {
            // check in filteredStops if there are >1 with same text output ("V CENTER" / "IZ CENTRA")
            const sameDirOptions = arr.filter((o) => o.center === val.center);
            const sym = String.fromCharCode(65 + sameDirOptions.findIndex((o) => o.ref_id === val.ref_id));
            const indexText = sameDirOptions.length > 1 ? ` (${sym})` : '';
            return (val.center ? 'V CENTER' : 'IZ CENTRA') + indexText;
          })(),
        }));
    },
  },

  methods: {
    checkTime() {
      this.tick++; // NOTE: for reactivity only

      const arrivalsDisplayed = !this.loading && this.arrivals.length;
      if (arrivalsDisplayed && this.dataExpired && this.autoRefresh) {
        this.getData();
      }
    },

    selectStop(stopId) {
      this.selectedStop = this.stopOptions.find((s) => s.ref_id === stopId);
      this.stopHistory = [this.selectedStop.ref_id, ...this.stopHistory];
      this.getData();
    },

    async getData() {
      this.loading = true;

      const res = await fetch('/api/getStopData/' + this.selectedStop.ref_id);
      const data = await res.json();

      this.arrivals = data.sort((route1, route2) => parseInt(route1[0].key) - parseInt(route2[0].key));
      this.loading = false;

      this.dataExpires = new Date().valueOf() + 20 * 1000; // 20 sec
    },

    onInput() {
      this.arrivals = [];
      this.selectedStop = {};
    },

    resetInput() {
      this.arrivals = [];
      this.selectedStop = {};
      this.input = '';
      $('#input input').select();
    },

    showMap(routeNo) {
      location.href = `/map?route=${routeNo}&stop=${this.selectedStop.ref_id}`;
    },
  },

  mounted() {
    // version
    if (localStorage.version !== this.version) {
      localStorage.removeItem('stopHistory');
      localStorage.setItem('version', this.version);
    }

    // init
    this.stops = stops;
    setInterval(this.checkTime.bind(this), 1000);
    $('input').select();

    $('#main').classList.remove('hidden');

    // localStorage: BIND HISTORY
    if (localStorage.stopHistory) {
      this.stopHistory = localStorage.stopHistory.split(',');
    }
  },

  watch: {
    // localStorage: BIND HISTORY
    stopHistory(newHistory) {
      localStorage.stopHistory = newHistory.join(',');
    },
  },
};

const app = Vue.createApp(config).mount('#main');

// --- helper functions

function arrayCount(arr) {
  return arr.reduce((acc, cur) => {
    acc[cur] = (acc[cur] || 0) + 1;
    return acc;
  }, {});
}

function deduplicate(arr) {
  return [...new Set(arr)];
}

function simplify(str) {
  const chars = { Č: 'č', č: 'c', Š: 'S', š: 's', Ž: 'Z', ž: 'z' };
  // prettier-ignore
  return [...str].map((char) => chars[char] || char).join('').toLowerCase();
}
