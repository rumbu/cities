import React from 'react';
import { TextField } from '@rmwc/textfield';
import { List, ListItem, ListItemText, ListItemGraphic, ListItemMeta, ListItemPrimaryText, ListItemSecondaryText } from '@rmwc/list';
import { SnackbarAction, SnackbarQueue, createSnackbarQueue } from '@rmwc/snackbar';
import { CircularProgress } from '@rmwc/circular-progress';
import { Button } from '@rmwc/button';
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
          {props.updatingId === city.geonameid &&
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
      updatingId: 0
    };

    this.api = new Api();
  }

  fetchCities = () => {
    if (this.state.isLoading || this.state.isLastPage) {
      return;
    }

    const { list } = this.state;
    this.setState({isLoading: true, error: null});
    this.api.getList(this.state.filter)
      .then(result => this.setState({
          isLoading: false,
          isLastPage: this.api.isLastPage,
          list: list.concat(result.data)
        }),
        error => {
          this.setState({
            isLoading: false
          })
          showError(error);
        }
      );
  }

  componentDidMount() {
    this.fetchCities();
  }

  onToggle = (id, label) => {
    const selected = [...this.state.selected];
    const index = selected.indexOf(id);
    const enabled = selected.indexOf(id) > -1;
    this.setState({updatingId: id});

    this.api.updatePref(id, enabled)
      .then(() => {
          if (!enabled && -1 === index) {
            selected.push(id);
          } else if (enabled && index > -1) {
            selected.splice(index, 1);
          }

          this.setState({ selected, updatingId: 0 });
        },
        error => {
          this.setState({updatingId: 0});
          showError(`Could not save ${label}`);
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
            />

            <CityList list={this.state.list} selected={this.state.selected} isLoading={this.state.isLoading}
              updatingId={this.state.updatingId}
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
