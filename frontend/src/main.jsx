import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// 1. Redux (Memoria)
import { Provider } from 'react-redux';
import { store } from './shared/store';

// 2. Theme (Hainele)
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './shared/theme/theme';

// 3. Aplicația (Corpul)
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Providerul Redux ține minte datele */}
    <Provider store={store}>
      {/* Routerul permite navigarea între pagini */}
      <BrowserRouter>
        {/* ThemeProvider aplică culorile și stilurile POS */}
        <ThemeProvider theme={theme}>
          {/* CssBaseline aplică regulile globale (scrollbar, selecție text) */}
          <CssBaseline />
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);