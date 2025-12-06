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
  const departure = raw.departure || raw.movement?.departure || raw.movement || {};
  const arrival = raw.arrival || raw.movement?.arrival || {};
  
  const depAirport = departure.airport || raw.movement?.airport || {};
  const arrAirport = arrival.airport || {};

  // Extract IATA codes
  let fromIata = depAirport.iata || depAirport.iataCode || depAirport.iata_code || departure.iataCode || departure.iata || '';
  let toIata = arrAirport.iata || arrAirport.iataCode || arrAirport.iata_code || arrival.iataCode || arrival.iata || '';
  
  // Extract airport names
  let fromName = depAirport.name || depAirport.municipality || depAirport.city || departure.city || '';
  let toName = arrAirport.name || arrAirport.municipality || arrAirport.city || arrival.city || '';

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

  // Extract times
  const extractTime = (timeObj: any): string => {
    if (!timeObj) return '';
    if (typeof timeObj === 'string') {
      const match = timeObj.match(/(\d{2}:\d{2})/);
      return match ? match[1] : '';
    }
    const time = timeObj.local || timeObj.utc || timeObj.scheduledTimeLocal || timeObj.scheduledTimeUtc || '';
    if (typeof time === 'string') {
      const match = time.match(/(\d{2}:\d{2})/);
      return match ? match[1] : '';
    }
    return '';
  };

  const departureTime = extractTime(departure.scheduledTime || departure.scheduledTimeLocal || departure.local || departure);
  const arrivalTime = extractTime(arrival.scheduledTime || arrival.scheduledTimeLocal || arrival.local || arrival);

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

  const gate = departure.gate || depAirport.gate || '';
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
        } catch (err) {
          console.warn('Error enriching flight info:', err);
          // Fallback to basic info
          const info = extractFlightInfo(firstFlight);
          setFlightInfo(info);
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

