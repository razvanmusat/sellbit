// src/shared/api/client.js

// Folosim calea relativă. Vite Proxy va redirecționa asta către http://localhost:8080/api
const BASE_URL = '/api';

// Funcție helper pentru a citi un cookie după nume. Necesară pentru protecția CSRF.
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
};

// MODIFICARE 1: Extragem 'params' din argumente
export const client = async (endpoint, { body, params, ...customConfig } = {}) => {
  const headers = { 'Content-Type': 'application/json' };

  // 1. Adăugăm Token-ul de autorizare (Bearer) dacă există.
  const token = localStorage.getItem('token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // 2. Adăugăm token-ul CSRF.
  const csrfToken = getCookie('XSRF-TOKEN');
  if (csrfToken) {
    headers['X-XSRF-TOKEN'] = csrfToken;
  }

  const config = {
    method: customConfig.method || (body ? 'POST' : 'GET'), 
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
    credentials: 'include',
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  // --- MODIFICARE 2: LOGICA PENTRU QUERY PARAMS ---
  // Construim URL-ul final. Dacă avem params, îi transformăm în string (ex: ?parentId=1)
  let url = `${BASE_URL}/${endpoint}`;
  
  if (params) {
      // Filtrăm valorile null/undefined ca să nu trimitem "undefined" la server
      const validParams = Object.entries(params)
          .filter(([_, v]) => v != null)
          .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
          
      const queryString = new URLSearchParams(validParams).toString();
      if (queryString) {
          url += `?${queryString}`;
      }
  }
  // ------------------------------------------------

  try {
    // MODIFICARE 3: Folosim variabila 'url' calculată mai sus, nu string-ul simplu
    const response = await fetch(url, config);
    const text = await response.text();

    if (response.ok) {
      return text ? JSON.parse(text) : {};
    }

    // --- INTERCEPTARE SESIUNE EXPIRATĂ (401 / 403) ---
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user'); 

        if (!window.location.pathname.includes('/login')) {
            window.location.assign('/login');
        }
        
        throw new Error('Sesiune expirată.');
    }
    // ------------------------------------------------------------------

    // --- LOGICA DE PROCESARE ERORI (MODIFICATĂ) ---
    let errorMessage;
    let errorParams = null; // Variabilă nouă pentru a stoca lista de produse

    try {
      // Încercăm să parsăm JSON-ul de eroare de la server
      const errorData = JSON.parse(text);
      
      errorMessage = errorData.message || `HTTP Error: ${response.status}`;
      
      // CRUCIAL: Dacă serverul a trimis 'params' (lista de produse), îi salvăm!
      if (errorData.params) {
          errorParams = errorData.params;
      }

    } catch (e) {
      // Fallback dacă nu e JSON valid
      const match = text.match(/ERROR\.[A-Z_]+/);
      if (match) {
        errorMessage = match[0];
      } else {
        errorMessage = `Server Error: ${response.status} ${response.statusText}`;
      }
    }

    // Creăm obiectul de eroare
    const finalError = new Error(errorMessage);
    
    // Dacă am găsit params (nume produse), îi atașăm la obiectul de eroare
    if (errorParams) {
        finalError.params = errorParams;
    }

    throw finalError;
    // ------------------------------------------------

  } catch (err) {
    // Returnăm Promise.reject pentru ca Redux să știe că a eșuat
    return Promise.reject(err);
  }
};