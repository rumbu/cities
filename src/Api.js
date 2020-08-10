class Pager {
  #offset = 0;
  #limit;

  static mode = {
    list: 1,
    pref: 2
  };
  isLastPage = false;
  mode;

  constructor(mode, limit) {
    this.mode = mode;
    this.#limit = limit;
  }
  reset() {
    this.#offset = 0;
    this.isLastPage = false;
  }
  next(total) {
    this.#offset += this.#limit;
    this.isLastPage = total - 1 <= this.#offset;
  }
  getQuery() {
    return {
      offset: this.#offset,
      limit: this.#limit
    };
  }
}

class Api {
  #filter = '';
  #controller;
  config = {
    baseUrl: 'http://localhost:3030',
    listEndpoint: '/cities',
    singleEndpoint: '/city/:id',
    prefsEndpoint: '/preferences/cities',
    limit: 20
  };

  constructor(config) {
    this.config = {...this.config, ...config};
  }

  get isLastPage() {
    return this.pager ? this.pager.isLastPage : false;
  }

  get isLoading() {
    return Boolean(this.#controller);
  }

  sendRequest(url, opts) {
    return fetch(url, opts)
      .then(res => 204 === res.status ? 'OK' : res.json())
      .then(json => {
        if (json.error) {
          return Promise.reject(json.message);
        }
        return json;
      });    
  }

  genQuery(params) {
    return Object.keys(params)
      .map(k => `${k}=${encodeURIComponent(params[k])}`)
      .join('&');
  }

  getPager(mode) {
    if (!this.pager || this.pager.mode !== mode) {
      this.pager = new Pager(mode, this.config.limit);
    }
    return this.pager;
  }

  _abort() {
    if (this.isLoading) {
      this.#controller.abort();
    }
  }

  _getPaged(endpoint, pager, params) {
    params = {...pager.getQuery(), ...params};
    this.#controller = new AbortController();

    return this.sendRequest(`${this.config.baseUrl}${endpoint}?${this.genQuery(params)}`, {signal: this.#controller.signal})
      .then(json => {
        pager.next(json.total);
        return json;
      })
      .finally(() => this.#controller = null);
  }

  getList(filter = '') {
    this._abort();
    filter = filter.trim();
    const pager = this.getPager(Pager.mode.list);
    let hasBeenReset = false;
    if (this.#filter !== filter) {
      pager.reset();
      this.#filter = filter;
      hasBeenReset = true;
    }
    if (this.isLastPage) {
        return false;
    }
    return {
        promise: this._getPaged(this.config.listEndpoint, pager, {filter}),
        hasBeenReset
    };
  }

  getPrefs() {
    this._abort();
    const pager = this.getPager(Pager.mode.pref);
    return this._getPaged(this.config.prefsEndpoint, pager);
  }

  updatePref(id, enabled) {
    return this.sendRequest(`${this.config.baseUrl}${this.config.prefsEndpoint}`, {
        method: 'PATCH',
        body: JSON.stringify({[id]: enabled}),
        headers: {
          'Content-Type': 'application/json'
        }
      });
  }

  getSingle(id) {
    return this.sendRequest(`${this.confg.baseUrl}${this.config.singleEndpoint.replace(':id', id)}`);
  }
}

export default Api;
