// NODE MODULE

export default class Store {
  constructor() {
    this.SECOND = 1000; // 1 second in ms
    this.MINUTE = this.SECOND * 60;
    this.HOUR = this.MINUTE * 60;
    this.DAY = this.HOUR * 24;
    this.YEAR = this.DAY * 356;

    this.storageData = [];
  }

  set(key, data, expires) {
    // expires: time in ms
    const element = { key, data, expires: new Date().valueOf() + expires };

    // if key exists, set as index, else push
    let index = this.storageData.findIndex((el) => el.key === key);
    if (index === -1) index = this.storageData.length; // apend to back
    this.storageData[index] = element;
  }

  get(foo) {
    // foo: function (default) or string
    this._cleanup();

    if (typeof foo === 'string') {
      const key = foo;
      foo = (el) => el.key === key;
    }

    let entry = this.storageData.find(foo);
    if (entry) return entry.data;
  }

  getAll(foo) {
    if (!foo) {
      foo = () => true;
    }

    return this.storageData.filter(foo);
  }

  _cleanup() {
    const now = new Date().valueOf();
    this.storageData = this.storageData.filter((el) => el.expires > now);
  }
}
