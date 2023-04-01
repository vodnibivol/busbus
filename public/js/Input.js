const Input = {
  input: 'dram',
  station: {},
  stations: [],
  routes: [],
  loading: false,
  eta: true,

  async init() {
    document.querySelector('input').select();

    this.stations = [
      ...stations.to.map((s) => ({ ...s, center: 1 })),
      ...stations.from.map((s) => ({ ...s, center: 0 })),
    ];
  },

  get filteredPostaje() {
    if (this.input.length < 3) return [];
    return this.stations.filter((s) => new RegExp(this.input, 'i').test(s.name));
  },

  async select(stopId) {
    this.loading = true;
    
    this.station = this.stations.find((s) => s.ref_id === stopId);
    this.input = this.station.name;
    
    const res = await fetch('/api/getStopData/' + stopId);
    const data = await res.json();
    console.log("fetch");
    
    this.routes = data;
    this.loading = false;
  },

  onInput() {
    this.routes = [];
    this.station = {};
  },

  showMap(routeNo) {
    location.href = `/map?stop=${this.station.ref_id}&route=${routeNo}`;
  }
};
