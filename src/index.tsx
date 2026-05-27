import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './tailwind.css';
import './index.scss';
import reportWebVitals from './reportWebVitals';

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  ) : (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
);

reportWebVitals();
