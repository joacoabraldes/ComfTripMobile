// /api.js
import Constants from 'expo-constants';

let AsyncStorage;
try {
  // only available on RN when package is installed
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = null;
}

// You can override this with env/config if you set it up in expo.manifest.extra
const API_BASE =
  (Constants?.manifest?.extra?.REACT_APP_API_URL) ||
  (Constants?.expoConfig?.extra?.REACT_APP_API_URL) ||
  process.env.REACT_APP_API_URL ||
  'https://comf-trip-backend.vercel.app/api';

// Generic request
async function request(path, options = {}) {
  const token = await tokenStorage.getToken();
  const headers = { ...(options.headers || {}) };

  // if body is not FormData, assume JSON
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, {
    ...options,
    headers,
    body:
      headers['Content-Type'] === 'application/json' && options.body
        ? JSON.stringify(options.body)
        : options.body
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = text;
  }

  if (!res.ok) {
    throw data;
  }

  return {
    data,
    // helper so login can optionally persist token from here
    setToken: (t) => tokenStorage.setToken(t)
  };
}

export const apiPost = (path, body) => request(path, { method: 'POST', body });
export const apiGet = (path) => request(path, { method: 'GET' });
export const apiPut = (path, body) => request(path, { method: 'PUT', body });
export const apiDelete = (path) => request(path, { method: 'DELETE' });

// optional export to directly set/get token
export const tokenStorage = {
  getToken: async () => {
    if (AsyncStorage) {
      try {
        return await AsyncStorage.getItem('token');
      } catch (e) {
        return null;
      }
    } else if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  },
  setToken: async (token) => {
    if (AsyncStorage) {
      try {
        await AsyncStorage.setItem('token', token);
        return;
      } catch (e) {}
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', token);
    }
  },
  removeToken: async () => {
    if (AsyncStorage) {
      try {
        await AsyncStorage.removeItem('token');
        return;
      } catch (e) {}
    } else if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
    }
  },
  AsyncStorageAvailable: !!AsyncStorage
};
export default { apiPost, apiGet, apiPut, apiDelete };
