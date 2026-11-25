import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import './index.css';
import './styles/tokens.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/dashboard.css';
import './styles/operations.css';
import './styles/intelligence.css';
import './styles/control-center.css';
import { PreferencesProvider } from './context/PreferencesContext';
import NotificationProvider from './components/common/NotificationStack';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PreferencesProvider>
        <NotificationProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </NotificationProvider>
      </PreferencesProvider>
    </Provider>
  </React.StrictMode>
);
