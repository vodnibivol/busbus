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
    };
  },
  computed: {
    dataExpired() {
      this.tick++; // for reactivity
      return new Date().valueOf() >= this.dataExpires;
    },

    filteredHistory() {
      // trenutno: zadnjih 10: po pogostosti
      // const shortHistory = this.stopHistory.slice(0, 30);
      const counted = arrayCount(this.stopHistory);
      const sortedHistory = deduplicate(this.stopHistory.sort((id1, id2) => counted[id2] - counted[id1])); // najpogostejša iskanja

      const arr = [];
      for (let id of sortedHistory) {
        // if (counted[id] < 2) continue;
        const s = this.stops.find((s) => s.ref_id === id);
        const alreadyInArr = arr.find((a) => a.name === s.name);
        if (s && !alreadyInArr) arr.push(s);
      }
      return arr.slice(0, 4); // return 5 stops
    },

    filteredSearch() {
      // used in a) searchResults (displayed results); and b) stopOptions
      if (this.input.length < 3) return [];
      return this.stops.filter((s) => simplify(s.name).includes(simplify(this.input)));
    },

    searchResults() {
      // displayed results
      const counted = arrayCount(this.stopHistory.slice(0, 30));

      const exactMatch = this.filteredSearch.find((r) => r.name === this.input);
      if (exactMatch) return [exactMatch.name];

      /**
       * // TODO - prioriteta:
       * 1. natančno ujemanje ("Log"):            vrni samo to besedo
       * 2. je v filtered history:                 +20
       * 3. začne se na ta način ("kol.."):       +10
       * 4. ujemanje cele besede (".. pri .."):   +5
       * 5. delno ujemanje ("..avarski")          +1
       */
      return deduplicate(
        this.filteredSearch.sort((a, b) => (counted[b.ref_id] || 0) - (counted[a.ref_id] || 0)).map((r) => r.name)
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
        this.getData(false);
      }
    },

    selectStop(stopId) {
      this.selectedStop = this.stopOptions.find((s) => s.ref_id === stopId);
      this.stopHistory = [this.selectedStop.ref_id, ...this.stopHistory];
      this.getData(true);
    },

    async getData(log = false) {
      this.loading = true;
      this.error = false;

      try {
        const res = await fetch('api/arrival?station_code=' + this.selectedStop.ref_id + (log ? '&log=1' : ''));
        const data = await res.json();
        console.log(data);
        this.arrivals = data.sort((route1, route2) => {
          const no1 = ('' + route1[0].key).match(/\d+/)[0];
          const no2 = ('' + route2[0].key).match(/\d+/)[0];
          return parseInt(no1) - parseInt(no2);
        });

        // error
        if (!res.ok) throw new Error(res);
      } catch (error) {
        this.error = true;
      }

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

    showMap(data) {
      document.body.classList.add('loading');
      window.location.href = `zemljevid?station_code=${this.selectedStop.ref_id}&trip_id=${data.trip_id}`;
    },

    openBusSearch() {
      document.body.classList.add('loading');
      window.location.href = 'bus';
    },
  },

  mounted() {
    // init
    this.stops = stops;
    setInterval(this.checkTime.bind(this), 1000);
    $('input').select();

    $('#main').classList.remove('hidden');

    // cookieStorage: BIND HISTORY
    if (cookieStorage.getItem('BUSBUS_STOP_HISTORY')) {
      this.stopHistory = cookieStorage.getItem('BUSBUS_STOP_HISTORY').split(',');
    }

    // save screen dimensions
    cookieStorage.setItem('SCREEN_RESOLUTION', `${window.screen.width}x${window.screen.height}`);
    window.fp.generate().then((fingerprint) => cookieStorage.setItem('DEVICE_FINGERPRINT', fingerprint));
  },

  watch: {
    // cookieStorage: BIND HISTORY
    stopHistory(newHistory) {
      cookieStorage.setItem('BUSBUS_STOP_HISTORY', newHistory.join(','), { expires: { years: 1 } });
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
