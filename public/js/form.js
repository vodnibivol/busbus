const config = {
  data() {
    return {
      input: '',
      selectedStop: {},
      stops: [], //
      arrivals: [],
      loading: false,
      eta: true,
      error: false,

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
      // trenutno: zadnjih 10: po pogostosti
      const shortHistory = this.stopHistory.slice(0, 30);
      const counted = arrayCount(shortHistory);
      // console.log(counted);
      const sortedHistory = deduplicate(shortHistory.sort((id1, id2) => counted[id2] - counted[id1]));
      // console.log(sortedHistory);

      const arr = [];
      for (let id of sortedHistory) {
        // if (counted[id] < 2) continue;
        const s = this.stops.find((s) => s.ref_id === id);
        const alreadyInArr = arr.find((a) => a.name === s.name);
        if (s && !alreadyInArr) arr.push(s);
      }
      return arr;
    },

    filteredSearch() {
      // used in a) searchResults (displayed results); and b) stopOptions
      if (this.input.length < 3) return [];

      return this.stops.filter((s) => simplify(s.name).includes(simplify(this.input)));
    },

    searchResults() {
      // displayed results
      const count = arrayCount(this.stopHistory.slice(0, 30));

      const exactMatch = this.filteredSearch.find((r) => r.name === this.input);
      if (exactMatch) return [exactMatch.name];

      return deduplicate(
        this.filteredSearch.sort((a, b) => count[b.ref_id] || 0 - count[a.ref_id] || 0).map((r) => r.name)
      );
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
      this.updateUserData(); // TODO: only if userId in cookie storage
      this.getData();
    },

    updateUserData() {
      postData('/api/updateUserData', { stopHistory: this.stopHistory });
      // console.log('updateUserData JS');
    },

    async getData() {
      this.loading = true;

      const res = await fetch('/api/getStopData/' + this.selectedStop.ref_id);
      const data = await res.json();
      this.arrivals = data.sort((route1, route2) => {
        const no1 = ('' + route1[0].key).match(/\d+/)[0];
        const no2 = ('' + route2[0].key).match(/\d+/)[0];
        return parseInt(no1) - parseInt(no2);
      });

      // error
      if (!res.ok) this.error = true;
      else this.error = false;

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
    if (localStorage.version && localStorage.version !== this.version) {
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
  // return [...new Set(arr)];
  const newArr = [];
  for (let i of arr) {
    if (!newArr.includes(i)) newArr.push(i);
  }
  return newArr;
}

function simplify(str) {
  const chars = { č: 'c', š: 's', ž: 'z' };
  // prettier-ignore
  return [...str.toLowerCase()].map((char) => chars[char] || char).join('');
}

// MDN POST method implementation:
async function postData(url = '', data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json',
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow', // manual, *follow, error
    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  });
  return response; // parses JSON response into native JavaScript objects
}
