import React from 'react';
import { TextField } from '@rmwc/textfield';
import { List, ListItem, ListItemText, ListItemGraphic, ListItemMeta, ListItemPrimaryText, ListItemSecondaryText } from '@rmwc/list';
import { SnackbarQueue, createSnackbarQueue } from '@rmwc/snackbar';
import { Chip, ChipSet } from '@rmwc/chip';
import { CircularProgress } from '@rmwc/circular-progress';
import { Button } from '@rmwc/button';
import debounce from 'lodash/debounce';
import Api from './Api.js';
import './App.css';
import '@material/button/dist/mdc.button.css';
import '@material/chips/dist/mdc.chips.css';
import '@material/floating-label/dist/mdc.floating-label.css';
import '@material/line-ripple/dist/mdc.line-ripple.css';
import '@material/list/dist/mdc.list.css';
import '@material/notched-outline/dist/mdc.notched-outline.css';
import '@material/ripple/dist/mdc.ripple.css';
import '@material/snackbar/dist/mdc.snackbar.css';
import '@material/textfield/dist/mdc.textfield.css';
import '@rmwc/circular-progress/circular-progress.css';
import '@rmwc/icon/icon.css';

const RawHTML = children => <span dangerouslySetInnerHTML={{ __html: children}} />

function Highlight(props) {
  const content = props.keyword && props.keyword.length > 0 ?
    RawHTML(props.text.replace(new RegExp(`(${props.keyword})`, 'gi'), '<b>$1</b>'))
    : props.text;

  return (
    <React.Fragment>
      {content}
    </React.Fragment>
  );
}

function CityList(props) {
  return (
    <List twoLine ref={props.scrollRef} className="App-list" onScroll={props.onScroll}>
    {props.list.map((city) => {
      const selected = props.selected.includes(city.geonameid);
      return (
        <ListItem key={`${props.filter}-${city.geonameid}`} activated={selected} onClick={e => props.onToggle(city.geonameid, city.name)}>
          <ListItemGraphic icon={selected ? 'check_box' : 'check_box_outline_blank'} />
          <ListItemText>
            <ListItemPrimaryText>
              <Highlight text={city.name} keyword={props.filter}/>
            </ListItemPrimaryText>
            <ListItemSecondaryText>
              <Highlight text={city.subcountry} keyword={props.filter}/>
              &nbsp;•&nbsp;
              <Highlight text={city.country} keyword={props.filter}/>
            </ListItemSecondaryText>
          </ListItemText>
          {props.updating.includes(city.geonameid) &&
            <ListItemMeta icon={<CircularProgress />} />
          }
        </ListItem>
      );
    })}
    {! props.isLoading && 0 === props.list.length && 
      <div>No results found for <b>&quot;{props.filter}&quot;</b>.</div>
    }
    {props.isLoading &&
      <CircularProgress className="App-loader" />
    }
    {!props.isLoading && !props.isLastPage &&
      <p className="u-center"><Button onClick={props.onMore}>Load more</Button></p>
    }
    </List>
  );
};

class MyChip extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      city: {},
      loading: true
    }
  }

  componentDidMount() {
    this.props.onFetch(this.props.id)
    .then(r => this.setState({
      city: r,
      loading: false
    }));
  }

  onClick = () => {
    this.props.onClick(this.props.id, this.state.label);
  }

  render() {
    return (
      <Chip
        icon={this.state.loading && <CircularProgress />}
        label={this.state.city.name}
        onInteraction={this.onClick}
        title={`${this.state.city.subcountry} • ${this.state.city.country}`}
      />
    );
  }
}

const queue = createSnackbarQueue();
function showError(message) {
  if (message.code && message.ABORT_ERR === message.code) {
    return;
  }

  queue.notify({
    open: true,
    title: String(message),
    dismissesOnAction: true,
    actions: [{title: 'Dismiss'}]
  });
}

class App extends React.Component {
  #nameCache = {};
  api;

  constructor() {
    super();

    this.state = {
      error: null,
      filter: '',
      offset: 0,
      isLastPage: false,
      isLoading: false,
      list: [],
      selected: [],
      updating: []
    };

    this.api = new Api();
    this.fetchCitiesDebounced = debounce(this.fetchCities, 400);
    this.onScroll = debounce(this._onScroll, 50);
    this.scrollRef = React.createRef();
  }

  filterChange = (e) => {
    this.fetchCitiesDebounced(e.target.value);
  }

  fetchCitiesMore = () => {
    this.fetchCities();
  }

  fetchCities = (userFilter = '') => {
    const { list, filter } = this.state;
    const deferred = this.api.getList(userFilter || filter);
    if (deferred) {
      deferred.promise.then(result => this.setState(state => ({
          isLoading: false,
          isLastPage: this.api.isLastPage,
          list: state.list.concat(result.data)
        })),
        error => {
          this.setState({isLoading: false})
          showError(error);
        }
      );

      this.setState(state => ({
        isLoading: true,
        error: null,
        filter: userFilter || filter,
        list: deferred.hasBeenReset ? [] : list
      }));
    }
  }

  fetchSingle = (id, attempt = 0) => {
    return this.#nameCache[id] ?
      Promise.resolve(this.#nameCache[id]) :
      this.api.getSingle(id)
        .then(r => {
          this.#nameCache[id] = r;
          return r;
        }, error => {
          if (attempt <= 5) {
            return this.fetchSingle(id, attempt + 1);
          }
          showError(error);
        });
  }

  componentDidMount() {
    this.fetchCities();
    this.api.getPrefs().then(r => this.setState({
      selected: r.data
    }));
  }

  _onScroll = () => {
    if (this.state.isLoading) return;

    const { current } = this.scrollRef;
    if (current.scrollTop > current.scrollHeight - current.clientHeight - 200) {
      this.fetchCitiesMore();
    }
  };

  onToggle = (id, label) => {
    const { selected } = this.state;
    const enabled = selected.indexOf(id) > -1;
    this.setState(state => ({updating: state.updating.concat([id])}));
    const updateStop = function(list) {
        const idx = list.indexOf(id);
        if (idx > -1) list.splice(idx, 1);
        return list;
    }

    this.api.updatePref(id, enabled)
      .then(() => this.setState(state => {
          const selected = [...state.selected];
          const index = selected.indexOf(id);

          if (!enabled && -1 === index) {
            selected.push(id);
          } else if (enabled && index > -1) {
            selected.splice(index, 1);
          }

          return {
            selected,
            updating: updateStop(state.updating)
          };
        }),
        error => {
          this.setState(state => ({updating: updateStop(state.updating)}));
          showError(`${label} - ${error}`);
        }
      );
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <div className="App-form">
            {this.state.selected && 
            <ChipSet>
              {this.state.selected.map(id => 
              <MyChip key={id} id={id} onClick={this.onToggle} onFetch={this.fetchSingle} />
              )}
            </ChipSet>}
            <p className="u-center">
              <label htmlFor="city">Select your favorite cities</label>
            </p>
            <TextField icon="filter_alt" placeholder="Type to filter by city name or country"
              style={{width: '100%'}}
              id="city"
              onChange={this.filterChange}
            />

            <CityList list={this.state.list} selected={this.state.selected} isLoading={this.state.isLoading}
              updating={this.state.updating} filter={this.state.filter} onScroll={this.onScroll} scrollRef={this.scrollRef}
              onToggle={this.onToggle} isLastPage={this.state.isLastPage} onMore={this.fetchCitiesMore}
            />

          </div>

          <SnackbarQueue messages={queue.messages} />

          <a
            className="App-link"
            href="https://lisin.ru"
            target="_blank"
            rel="noopener noreferrer"
          >
            &copy; 2020, Roman Lisin
          </a>
        </header>
      </div>
    );
  }
}

export default App;
