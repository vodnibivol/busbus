// NODE MODULE

export default class Store {
  constructor() {
    this.storageData = {};
  }

  set(key, data) {
    this.storageData[key] = { data, timestamp: new Date().valueOf() };
  }

  get(key, maxAge = Infinity) {
    const el = this.storageData[key];
    if (!el || new Date().valueOf() - el.timestamp > maxAge) return;
    return el?.data;
  }
}
