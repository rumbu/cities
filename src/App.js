import React from 'react';
import { TextField } from '@rmwc/textfield';
import { List, ListItem, ListItemText, ListItemGraphic, ListItemMeta, ListItemPrimaryText, ListItemSecondaryText } from '@rmwc/list';
import { SnackbarQueue, createSnackbarQueue } from '@rmwc/snackbar';
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

function CityList(props) {
  return (
    <List twoLine className="App-list">
    {props.list.map((city) => {
      const selected = props.selected.includes(city.geonameid);
      return (
        <ListItem key={city.geonameid} activated={selected} onClick={e => props.onToggle(city.geonameid, city.name)}>
          <ListItemGraphic icon={selected ? 'check_box' : 'check_box_outline_blank'} />
          <ListItemText>
            <ListItemPrimaryText>{city.name}</ListItemPrimaryText>
            <ListItemSecondaryText>{city.subcountry} - {city.country}</ListItemSecondaryText>
          </ListItemText>
          {props.updating.includes(city.geonameid) &&
            <ListItemMeta icon={<CircularProgress />} />
          }
        </ListItem>
      );
    })}
    {props.isLoading &&
      <CircularProgress className="App-loader" />
    }
    {!props.isLoading && !props.isLastPage &&
      <p className="u-center"><Button onClick={props.onMore}>Load more</Button></p>
    }
    </List>
  );
};

const queue = createSnackbarQueue();
function showError(message) {
  queue.notify({
    open: true,
    title: message,
    dismissesOnAction: true,
    actions: [{title: 'Dismiss'}]
  });
}

class App extends React.Component {
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
    this.fetchCitiesDebounced = debounce(this.fetchCities, 200);
  }

  filterChange = (e) => {
    this.setState({filter: e.target.value});
    this.fetchCitiesDebounced();
  }

  fetchCities = () => {
    const { list, filter } = this.state;
    const deferred = this.api.getList(filter);
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
        list: deferred.hasBeenReset ? [] : list
      }));
    }
  }

  componentDidMount() {
    this.fetchCities();
  }

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
            <p className="u-center">
              <label htmlFor="city">Select your favorite cities</label>
            </p>
            <TextField icon="filter_alt" placeholder="Type to filter by city name or country"
              style={{width: '100%'}}
              id="city"
              onChange={this.filterChange}
            />

            <CityList list={this.state.list} selected={this.state.selected} isLoading={this.state.isLoading}
              updating={this.state.updating}
              onToggle={this.onToggle} isLastPage={this.state.isLastPage} onMore={this.fetchCities}
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
