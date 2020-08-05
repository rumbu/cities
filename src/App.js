import React from 'react';
import { TextField } from '@rmwc/textfield';
import { Icon } from '@rmwc/icon';
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
import '@rmwc/icon/icon.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <div class="App-form">
            <TextField icon="filter_alt" placeholder="Type to filter by city name or country"
              style={{width: '100%'}}
            />
        </div>

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

export default App;
