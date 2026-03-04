import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { Provider } from 'react-redux';
import { store } from './shared/store';

import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './shared/theme/theme';

import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  //<React.StrictMode>    
    <Provider store={store}>      
      <BrowserRouter>        
        <ThemeProvider theme={theme}>          
          <CssBaseline />
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  //</React.StrictMode>
);