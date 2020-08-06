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

    return fetch(`${this.config.baseUrl}${endpoint}?${this.genQuery(params)}`, {signal: this.#controller.signal})
      .then(res => res.json())
      .then(json => {
        if (json.error) {
          return Promise.reject(json.message);
        } else {
          pager.next(json.total);
          return json;
        }
      })
      .finally(() => this.#controller = null);
  }

  getList(filter = '') {
    this._abort();
    filter = filter.trim();
    const pager = this.getPager(Pager.mode.list);
    if (this.#filter !== filter) {
      pager.reset();
      this.#filter = filter;
    }
    return this._getPaged(this.config.listEndpoint, pager, {filter});
  }

  getPrefs() {
    this._abort();
    const pager = this.getPager(Pager.mode.pref);
    return this._getPaged(this.config.prefsEndpoint, pager);
  }

  updatePref(id, enabled) {
    return fetch(`${this.config.baseUrl}${this.config.prefsEndpoint}`, {
      method: 'PATCH',
      body: JSON.stringify({[id]: enabled})
    })
  }
}

export default Api;
