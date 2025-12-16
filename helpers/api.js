// /api.js
import Constants from 'expo-constants';

let AsyncStorage;
try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
    AsyncStorage = null;
}

const API_BASE =
    (Constants?.manifest?.extra?.REACT_APP_API_URL) ||
    (Constants?.expoConfig?.extra?.REACT_APP_API_URL) ||
    process.env.REACT_APP_API_URL ||
    'https://comf-trip-backend.vercel.app/api';

const TOKEN_KEY = 'token';
const USER_ID_KEY = 'userId';

/**
 * Auth storage utilities (token + userId)
 */
export const authStorage = {
    /* ================= TOKEN ================= */
    getToken: async () => {
        try {
            if (AsyncStorage) return await AsyncStorage.getItem(TOKEN_KEY);
            if (typeof localStorage !== 'undefined') return localStorage.getItem(TOKEN_KEY);
        } catch {}
        return null;
    },

    setToken: async (token) => {
        try {
            if (AsyncStorage) await AsyncStorage.setItem(TOKEN_KEY, token);
            else if (typeof localStorage !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
        } catch {}
    },

    removeToken: async () => {
        try {
            if (AsyncStorage) await AsyncStorage.removeItem(TOKEN_KEY);
            else if (typeof localStorage !== 'undefined') localStorage.removeItem(TOKEN_KEY);
        } catch {}
    },

    /* ================= USER ID ================= */
    getUserId: async () => {
        try {
            if (AsyncStorage) return await AsyncStorage.getItem(USER_ID_KEY);
            if (typeof localStorage !== 'undefined') return localStorage.getItem(USER_ID_KEY);
        } catch {}
        return null;
    },

    setUserId: async (userId) => {
        if (!userId) return;
        try {
            const value = String(userId);
            if (AsyncStorage) await AsyncStorage.setItem(USER_ID_KEY, value);
            else if (typeof localStorage !== 'undefined') localStorage.setItem(USER_ID_KEY, value);
        } catch {}
    },

    removeUserId: async () => {
        try {
            if (AsyncStorage) await AsyncStorage.removeItem(USER_ID_KEY);
            else if (typeof localStorage !== 'undefined') localStorage.removeItem(USER_ID_KEY);
        } catch {}
    },

    /* ================= HELPERS ================= */
    clear: async () => {
        await authStorage.removeToken();
        await authStorage.removeUserId();
    },

    AsyncStorageAvailable: !!AsyncStorage
};

/* ================= REQUEST ================= */

async function request(path, options = {}) {
    const token = await authStorage.getToken();
    const headers = { ...(options.headers || {}) };

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
    } catch {
        data = text;
    }

    if (!res.ok) {
        if (typeof data === 'object' && data !== null) {
            data.status = res.status;
        } else {
            data = { message: data, status: res.status };
        }
        throw data;
    }

    return {
        data,
        // helpers for login
        setToken: (t) => authStorage.setToken(t),
        setUserId: (id) => authStorage.setUserId(id)
    };
}

export const apiPost = (path, body) => request(path, { method: 'POST', body });
export const apiGet = (path) => request(path, { method: 'GET' });
export const apiPut = (path, body) => request(path, { method: 'PUT', body });
export const apiDelete = (path) => request(path, { method: 'DELETE' });

export default { apiPost, apiGet, apiPut, apiDelete };
