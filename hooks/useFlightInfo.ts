import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/helpers/api';
import flightsApi from '@/services/flightsApi';

interface FlightInfo {
  flight_id: string;
  fromIata?: string;
  fromName?: string;
  toIata?: string;
  toName?: string;
  departureTime?: string;
  arrivalTime?: string;
  flightCode?: string;
  statusLabel?: string;
  statusVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
  airlineName?: string;
  gate?: string;
}

/**
 * Extract basic flight info from backend flight data
 * This is a simplified version - in production, you'd enrich this with AeroDataBox API
 */
function extractFlightInfo(backendFlight: any): FlightInfo | null {
  if (!backendFlight) return null;

  // Parse flight_id to extract flight code and date
  const flightId = backendFlight.flight_id || '';
  const parts = flightId.split('|');
  let flightCode = parts[0] || flightId;
  const date = parts[1] || null;

  // Try to extract info from raw data if available
  const raw = backendFlight.raw || backendFlight.details || {};
  
  // AeroDataBox by code -> usually has departure/arrival objects
  const depObj = raw.departure || raw.movement?.departure || raw.movement || raw.origin || {};
  const arrObj = raw.arrival || raw.movement?.arrival || raw.destination || {};
  
  const depAirport = depObj.airport || raw.movement?.airport || {};
  const arrAirport = arrObj.airport || {};

  // Extract IATA codes (check multiple possible locations)
  let fromIata = depAirport.iata || depAirport.iataCode || depAirport.iata_code || 
                 depObj.iataCode || depObj.iata || depObj.iata_code || '';
  let toIata = arrAirport.iata || arrAirport.iataCode || arrAirport.iata_code || 
               arrObj.iataCode || arrObj.iata || arrObj.iata_code || '';
  
  // Extract airport names (check multiple possible locations)
  let fromName = depAirport.name || depAirport.municipality || depAirport.city || 
                 depObj.city || depObj.name || '';
  let toName = arrAirport.name || arrAirport.municipality || arrAirport.city || 
               arrObj.city || arrObj.name || '';

  // If we have flight code from raw data, use it
  if (raw.number || raw.flight?.number) {
    const carrier = raw.carrierCode || raw.carrier || raw.airline?.iata || '';
    const number = raw.number || raw.flight?.number || '';
    if (carrier && number) {
      flightCode = `${carrier} ${number}`.trim();
    } else if (number) {
      flightCode = number;
    }
  }

  // Extract times (check multiple possible locations)
  const extractTime = (timeObj: any): string => {
    if (!timeObj) return '';
    
    // Date object
    if (timeObj instanceof Date) {
      const hh = String(timeObj.getHours()).padStart(2, '0');
      const mm = String(timeObj.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    
    // Object with local / utc / scheduledTimeLocal / scheduledTimeUtc
    if (typeof timeObj === 'object') {
      const candidate = timeObj.local || timeObj.scheduledTimeLocal || timeObj.scheduledTimeUtc || 
                       timeObj.utc || timeObj.scheduled || '';
      return extractTime(candidate);
    }
    
    // String - ISO format or HH:mm
    const str = String(timeObj);
    if (str.includes('T')) {
      const timePart = str.split('T')[1] || '';
      return timePart.slice(0, 5); // HH:mm
    }
    
    // Plain "HH:mm" or "HH:mm:ss"
    const match = str.match(/(\d{2}:\d{2})/);
    return match ? match[1] : '';
  };

  // Check multiple locations for departure time
  const depTimeRaw = depObj.scheduledTime || depObj.scheduledTimeLocal || depObj.scheduledTimeUtc || 
                     depObj.local || depObj.utc || 
                     raw.movement?.scheduledTime || raw.movement?.scheduledTimeLocal || 
                     raw.movement?.scheduledTimeUtc || raw.movement?.local || raw.movement?.utc || null;
  
  // Check multiple locations for arrival time
  const arrTimeRaw = arrObj.scheduledTime || arrObj.scheduledTimeLocal || arrObj.scheduledTimeUtc || 
                     arrObj.local || arrObj.utc || null;

  const departureTime = extractTime(depTimeRaw);
  const arrivalTime = extractTime(arrTimeRaw);

  // Extract status
  const statusRaw = raw.status || raw.flight?.status || '';
  const statusNormalized = statusRaw.toLowerCase();
  let statusLabel = 'Programado';
  let statusVariant: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted' = 'muted';
  
  if (statusNormalized.includes('cancel')) {
    statusLabel = 'Cancelado';
    statusVariant = 'danger';
  } else if (statusNormalized.includes('delay')) {
    statusLabel = 'Demorado';
    statusVariant = 'warning';
  } else if (statusNormalized.includes('board')) {
    statusLabel = 'Embarcando';
    statusVariant = 'info';
  } else if (statusNormalized.includes('depart') || statusNormalized.includes('in air')) {
    statusLabel = 'En vuelo';
    statusVariant = 'primary';
  } else if (statusNormalized.includes('land') || statusNormalized.includes('arriv')) {
    statusLabel = 'Aterrizado';
    statusVariant = 'success';
  }

  const gate = depObj.gate || depAirport.gate || depObj.gateName || '';
  const airlineName = raw.airline?.name || raw.operator?.name || '';

  return {
    flight_id: flightId,
    flightCode,
    fromIata,
    fromName,
    toIata,
    toName,
    departureTime,
    arrivalTime,
    statusLabel,
    statusVariant,
    airlineName,
    gate,
  };
}

export function useFlightInfo(tripId: number | null) {
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshFlight = useCallback(async () => {
    if (!tripId || !Number.isFinite(tripId) || tripId <= 0) {
      setFlightInfo(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiGet(`/flights?trip_id=${encodeURIComponent(tripId)}`);
      const data = res?.data ?? res;
      
      const flights = data?.flights || (Array.isArray(data) ? data : []);
      const firstFlight = flights.length > 0 ? flights[0] : null;
      
      if (firstFlight) {
        // Parse raw data if it's a string (JSON from database)
        let rawData = firstFlight.raw;
        if (typeof rawData === 'string') {
          try {
            rawData = JSON.parse(rawData);
          } catch (e) {
            console.warn('Error parsing raw flight data:', e);
            rawData = null;
          }
        }

        // If we have raw data from backend, use it first
        if (rawData) {
          const enrichedFlight = { ...firstFlight, raw: rawData };
          const info = extractFlightInfo(enrichedFlight);
          setFlightInfo(info);
        } else {
          // Try to enrich flight info from AeroDataBox
          try {
            const rawOffer = await flightsApi.getOfferById(firstFlight.flight_id);
            if (rawOffer) {
              // Use enriched data
              const enrichedFlight = { ...firstFlight, raw: rawOffer };
              const info = extractFlightInfo(enrichedFlight);
              setFlightInfo(info);
            } else {
              // Fallback to basic info
              const info = extractFlightInfo(firstFlight);
              setFlightInfo(info);
            }
          } catch (err: any) {
            // Handle rate limiting gracefully - don't show error, just use basic info
            if (err?.isRateLimit || err?.status === 429) {
              console.warn('AeroDataBox rate limit exceeded, using basic flight info');
            } else {
              console.warn('Error enriching flight info:', err);
            }
            // Fallback to basic info - app continues to work
            const info = extractFlightInfo(firstFlight);
            setFlightInfo(info);
          }
        }
      } else {
        setFlightInfo(null);
      }
    } catch (err: any) {
      console.error('Error loading flight info:', err);
      setError(err?.message || 'Error loading flight');
      setFlightInfo(null);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    refreshFlight();
  }, [refreshFlight]);

  return {
    flightInfo,
    loading,
    error,
    refreshFlight,
  };
}

