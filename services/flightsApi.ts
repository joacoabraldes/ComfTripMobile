// services/flightsApi.ts
// OurAirports CSV for airports + AeroDataBox (RapidAPI) for flights

import Constants from 'expo-constants';

const AERODATABOX_BASE = 'https://aerodatabox.p.rapidapi.com';
const AERODATABOX_KEY = 
  (Constants?.manifest?.extra?.REACT_APP_AERODATABOX_KEY) ||
  (Constants?.expoConfig?.extra?.REACT_APP_AERODATABOX_KEY) ||
  process.env.REACT_APP_AERODATABOX_KEY ||
  '1541aaadf9msh6c5432cdbe45d17p183a95jsn94566509c5fd'; // Fallback - debería moverse a variables de entorno
const AERODATABOX_HOST = 'aerodatabox.p.rapidapi.com';

const OURAIRPORTS_PRIMARY = 'https://ourairports.com/airports.csv';
const OURAIRPORTS_FALLBACK = 'https://davidmegginson.github.io/ourairports-data/airports.csv';

// Cache for OurAirports data
let _ourAirportsList: any[] = [];
let _ourAirportsIndex: {
  byIata: Map<string, any>;
  byCity: Map<string, any[]>;
  byName: any[];
} = { byIata: new Map(), byCity: new Map(), byName: [] };
let _ourAirportsLoaded = false;

interface Airport {
  id: string;
  iata: string;
  name: string;
  cityName?: string;
  countryName?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Load OurAirports CSV data
 */
async function loadOurAirportsCsv(force = false): Promise<any[]> {
  if (_ourAirportsLoaded && !force) {
    return _ourAirportsList;
  }

  // Try primary source first, then fallback
  const sources = [OURAIRPORTS_PRIMARY, OURAIRPORTS_FALLBACK];
  
  for (const sourceUrl of sources) {
    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch from ${sourceUrl}: ${response.status}`);
      }
      const text = await response.text();
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) {
        throw new Error('Invalid CSV - not enough lines');
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
      const parsed = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h] = cols[i] !== undefined ? cols[i] : '';
        });
        return obj;
      });

      const filtered = parsed.filter((row) => {
        const iataCandidates = (row.iata_code || row.iata || '').trim();
        return !!iataCandidates && /^[A-Za-z0-9]{1,3}$/.test(iataCandidates);
      });

      _ourAirportsList = filtered;
      _ourAirportsIndex = { byIata: new Map(), byCity: new Map(), byName: [] };

      filtered.forEach((a) => {
        const iata = (a.iata || a.iata_code || '').toUpperCase();
        const city = (a.municipality || a.city || '').toLowerCase();
        if (iata) _ourAirportsIndex.byIata.set(iata, a);
        if (city) {
          const arr = _ourAirportsIndex.byCity.get(city) || [];
          arr.push(a);
          _ourAirportsIndex.byCity.set(city, arr);
        }
        _ourAirportsIndex.byName.push(a);
      });

      _ourAirportsLoaded = true;
      console.log(`[flightsApi] Successfully loaded ${filtered.length} airports from ${sourceUrl}`);
      return _ourAirportsList;
    } catch (err) {
      console.warn(`[flightsApi] Error loading OurAirports CSV from ${sourceUrl}:`, err);
      // Continue to next source
      continue;
    }
  }

  // If all sources failed
  console.error('[flightsApi] Failed to load OurAirports CSV from all sources');
  _ourAirportsList = [];
  _ourAirportsLoaded = false;
  return [];
}

function mapOurAirportRowToResp(row: any): Airport {
  const lat = parseFloat(row.latitude_deg || row.latitude || '') || undefined;
  const lon = parseFloat(row.longitude_deg || row.longitude || '') || undefined;
  const iata = (row.iata || row.iata_code || '').trim();
  const municipality = row.municipality || row.city || '';
  const country = row.iso_country || row.country || '';

  return {
    id: row.id || row.ident || `${iata || (row.name || '')}`.trim(),
    iata,
    name: row.name || '',
    cityName: municipality,
    countryName: country,
    latitude: lat,
    longitude: lon,
  };
}

/**
 * Get airport row by IATA code
 */
export async function getAirportRowByIata(iata: string): Promise<any | null> {
  await loadOurAirportsCsv();
  const upper = String(iata || '').toUpperCase().trim();
  return _ourAirportsIndex.byIata.get(upper) || null;
}

/**
 * Search airports by city/keyword
 */
export async function searchAirportsByCity(
  keywordOrObj: string | any,
  limit = 20,
  countryCode?: string
): Promise<Airport[]> {
  await loadOurAirportsCsv();

  const q = typeof keywordOrObj === 'string' ? keywordOrObj.toLowerCase() : (keywordOrObj?.city || keywordOrObj?.name || '').toLowerCase();

  const results: Airport[] = [];
  const max = Math.max(5, Math.min(limit || 20, 200));

  for (const row of _ourAirportsIndex.byName) {
    if (results.length >= max) break;
    const iata = ((row.iata || row.iata_code || '') + '').toLowerCase();
    const name = (row.name || '').toLowerCase();
    const city = (row.municipality || row.city || '').toLowerCase();
    const ident = (row.ident || row.local_code || '').toLowerCase();
    const country = (row.iso_country || row.country || '').toLowerCase();

    if (countryCode && String(countryCode || '').trim().length > 0) {
      const cc = String(countryCode).toLowerCase();
      if (!(country === cc || (row.country && String(row.country).toLowerCase().includes(cc)))) {
        continue;
      }
    }

    if (iata.includes(q) || name.includes(q) || city.includes(q) || ident.includes(q) || (row.keywords || '').toLowerCase().includes(q)) {
      results.push(mapOurAirportRowToResp(row));
    }
  }

  return results.slice(0, limit);
}

/**
 * Get airports by country and optional city
 */
export async function getAirportsByCountry(
  countryCode: string,
  cityName = '',
  limit = 50
): Promise<Airport[]> {
  await loadOurAirportsCsv();

  const cc = String(countryCode || '').toLowerCase();
  const cityLower = String(cityName || '').toLowerCase();
  const out: Airport[] = [];

  for (const row of _ourAirportsIndex.byName) {
    if (out.length >= limit) break;
    const country = (row.iso_country || row.country || '').toLowerCase();
    if (country !== cc && !country.includes(cc)) continue;

    if (cityLower) {
      const city = (row.municipality || row.city || '').toLowerCase();
      if (!city.includes(cityLower)) continue;
    }

    out.push(mapOurAirportRowToResp(row));
  }

  return out;
}

/**
 * Get airport options for select component
 */
export async function getAirportOptionsForSelect(
  keyword: string,
  limit = 20,
  countryCode?: string,
  cityName?: string
): Promise<Array<{ value: string; label: string; meta: Airport }>> {
  let items: Airport[] = [];

  if (countryCode) {
    try {
      items = await getAirportsByCountry(countryCode, cityName || keyword || '', limit);
    } catch (err) {
      console.warn('getAirportOptionsForSelect: getAirportsByCountry failed, falling back to search', err);
    }
  }

  if (items.length === 0) {
    items = await searchAirportsByCity(keyword || cityName || '', limit, countryCode);
  }

  return items.map((a) => ({
    value: a.iata || a.id,
    label: `${a.iata ? a.iata + ' — ' : ''}${a.name || ''}${a.cityName ? ` (${a.cityName}${a.countryName ? ', ' + a.countryName : ''})` : ''}`,
    meta: a,
  }));
}

/**
 * Format date to YYYY-MM-DD
 */
function fmtDate(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  if (d instanceof Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const s = String(d);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : undefined;
}

/**
 * Call AeroDataBox API
 */
async function callAeroDataBox(path: string, query: Record<string, any> = {}): Promise<any> {
  if (!AERODATABOX_KEY) {
    throw new Error('Falta AERODATABOX_KEY para usar AeroDataBox (RapidAPI).');
  }

  const url = new URL(AERODATABOX_BASE + path);
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    url.searchParams.set(k, String(v));
  });

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-RapidAPI-Key': AERODATABOX_KEY,
        'X-RapidAPI-Host': AERODATABOX_HOST,
      },
    });

    if (!response.ok) {
      let errorMessage = `AeroDataBox API error: ${response.status}`;
      let errorBody: any = null;
      
      try {
        errorBody = await response.json();
        if (errorBody?.message) {
          errorMessage = errorBody.message;
        }
      } catch (e) {
        // Si no se puede parsear el JSON, usar el mensaje por defecto
      }

      if (response.status === 429) {
        errorMessage = 'AeroDataBox API error: 429 (Too Many Requests - límite de solicitudes excedido)';
      }

      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.isRateLimit = response.status === 429;
      error.body = errorBody;
      throw error;
    }

    return await response.json();
  } catch (err: any) {
    // Si es un error de red, re-lanzar con más contexto
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const networkError: any = new Error('Error de red al conectar con AeroDataBox API');
      networkError.isNetworkError = true;
      networkError.originalError = err;
      throw networkError;
    }
    // Re-lanzar otros errores tal cual
    throw err;
  }
}

/**
 * Fetch departures in a time window (max 12 hours)
 */
async function fetchDeparturesWindow(originIcao: string, fromIso: string, toIso: string): Promise<any[]> {
  const json = await callAeroDataBox(
    `/flights/airports/icao/${encodeURIComponent(originIcao)}/${fromIso}/${toIso}`,
    {
      direction: 'Departure',
      withLocation: 'false',
      withAircraftImage: 'false',
    }
  );

  return Array.isArray(json?.departures) ? json.departures : [];
}

/**
 * Search flights by route
 */
export async function searchFlights({
  originLocationCode,
  destinationLocationCode,
  departureDate,
}: {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: Date | string;
}): Promise<{ data: any[] }> {
  if (!originLocationCode || !destinationLocationCode || !departureDate) {
    throw new Error('originLocationCode, destinationLocationCode y departureDate son requeridos');
  }

  const originRow = await getAirportRowByIata(originLocationCode);
  if (!originRow) {
    console.warn('[searchFlights] No pude resolver ICAO para origen', originLocationCode);
    return { data: [] };
  }

  const originIcao = (originRow.ident || originRow.gps_code || '').toUpperCase();
  if (!originIcao) {
    console.warn('[searchFlights] Origen sin ICAO en OurAirports', originLocationCode, originRow);
    return { data: [] };
  }

  const dateStr = fmtDate(departureDate);
  if (!dateStr) {
    return { data: [] };
  }

  // Two windows of <= 12h to respect API limit
  const fromIso1 = `${dateStr}T00:00`;
  const toIso1 = `${dateStr}T11:59`;
  const fromIso2 = `${dateStr}T12:00`;
  const toIso2 = `${dateStr}T23:59`;

  // Sequential calls to be nicer with rate limits
  // Si una falla, intentamos con la otra
  let deps1: any[] = [];
  let deps2: any[] = [];
  
  try {
    deps1 = await fetchDeparturesWindow(originIcao, fromIso1, toIso1);
  } catch (err: any) {
    console.warn('[searchFlights] Error fetching first window:', err);
    // Si es rate limit, no intentar la segunda ventana
    if (err?.isRateLimit || err?.status === 429) {
      throw err;
    }
  }

  try {
    deps2 = await fetchDeparturesWindow(originIcao, fromIso2, toIso2);
  } catch (err: any) {
    console.warn('[searchFlights] Error fetching second window:', err);
    // Si es rate limit, lanzar el error
    if (err?.isRateLimit || err?.status === 429) {
      throw err;
    }
    // Si no es rate limit y tenemos resultados de la primera ventana, continuar
  }

  const departures = [...deps1, ...deps2];
  const destIataUpper = String(destinationLocationCode).toUpperCase();

  const flights = departures.filter((f) => {
    const arrAirport = f?.movement?.airport || {};
    const arrIata = (arrAirport.iata || arrAirport.iataCode || arrAirport.iata_code || '') + '';
    return arrIata.toUpperCase() === destIataUpper;
  });

  return { data: flights };
}

/**
 * Search flight by code
 */
export async function searchFlightByCode(flightCode: string, flightDate?: Date | string): Promise<any[]> {
  if (!flightCode) return [];
  const cleanCode = String(flightCode).replace(/\s+/g, '').toUpperCase();
  const dateStr = fmtDate(flightDate) || fmtDate(new Date()) || '';

  if (!dateStr) return [];

  const json = await callAeroDataBox(
    `/flights/number/${encodeURIComponent(cleanCode)}/${encodeURIComponent(dateStr)}`,
    {
      withLocation: 'false',
      withAircraftImage: 'false',
    }
  );

  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.flights)) return json.flights;
  if (Array.isArray(json?.data)) return json.data;
  return [];
}

/**
 * Get offer by ID
 */
export async function getOfferById(flightId: string): Promise<any | null> {
  if (!flightId) return null;
  const fid = String(flightId).trim();

  let codeMatch = fid.match(/^([A-Za-z]{2,3}\d{1,4})/);
  if (!codeMatch) {
    codeMatch = fid.match(/([A-Za-z]{2,3}\d{1,4})/);
  }
  if (!codeMatch) return null;
  const code = codeMatch[1].toUpperCase();

  const dateMatch = fid.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const date = dateMatch ? dateMatch[1] : undefined;

  const flights = await searchFlightByCode(code, date);
  if (!flights || flights.length === 0) return null;
  return flights[0];
}

const flightsApi = {
  searchAirportsByCity,
  getAirportOptionsForSelect,
  getAirportsByCountry,
  getAirportRowByIata,
  searchFlights,
  searchFlightByCode,
  getOfferById,
};

export default flightsApi;

