import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LOCATIONS = [
  { id: '1', title: 'Museo Nacional de Bellas Artes', latitude: -34.5858, longitude: -58.3923 },
  { id: '2',   title: 'Parque Tres de Febrero',         latitude: -34.5775, longitude: -58.4310 },
  { id: '3',title: 'Biblioteca Nacional',            latitude: -34.5938, longitude: -58.3933 },
];

export default function MapScreen() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomInset = insets?.bottom ?? 0;
  const webRef = useRef<WebView | null>(null);

  const [loadingPosition, setLoadingPosition] = useState(true);
  const [webReady, setWebReady] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [webLoadState, setWebLoadState] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission denied');
          setLoadingPosition(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!mounted) return;
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);

        try {
          const places = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
          if (places && places.length > 0) {
            const p = places[0];
            const label = p.city ?? p.subregion ?? p.region ?? p.name ?? `${p.latitude ?? ''}, ${p.longitude ?? ''}`;
            setCityName(label || 'Unknown');
          } else {
            setCityName('Unknown');
          }
        } catch (rgErr) {
          console.warn('reverseGeocodeAsync failed', rgErr);
          setCityName('Unknown');
        }
      } catch (err) {
        console.warn('Error getting location', err);
      } finally {
        setLoadingPosition(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Safe send to webview
  function postMessageToWeb(obj: any) {
    try {
      webRef.current?.postMessage(JSON.stringify(obj));
    } catch (e) {
      console.warn('postMessage failed', e);
    }
  }

  // When web ready and we have coords, send locations + user location
  useEffect(() => {
    if (!webReady) return;
    postMessageToWeb({ type: 'locations', payload: LOCATIONS });
    if (userCoords) postMessageToWeb({ type: 'userLocation', payload: userCoords });
  }, [webReady, userCoords]);

  // messages from WebView
  function handleOnMessage(e: any) {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data?.type === 'ready') {
        setWebReady(true);
      } else if (data?.type === 'log') {
        console.log('[WebView log]', data.payload);
      } else if (data?.type === 'markerClick') {
        console.log('Marker clicked:', data.payload);
      } else {
        // unknown message
        // console.log('WebView message', data);
      }
    } catch (err) {
      console.warn('Invalid message from webview', err);
    }
  }

  // HTML for the WebView (Leaflet + OSM). It posts a 'ready' message when initialised.
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html,body,#map { height: 100%; margin:0; padding:0; background:#f7f7f7; }
          .leaflet-container { touch-action: none; -webkit-user-select:none; -ms-user-select:none; user-select:none; }
          #info { position:absolute; z-index:1000; left:10px; top:10px; background: rgba(255,255,255,0.9); padding:6px 10px; border-radius:8px; font-family: sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div id="info">Starting...</div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          function send(msg) {
            try {
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify(msg));
              }
            } catch(e) { /* ignore */ }
          }

          send({ type: 'log', payload: 'HTML loaded' });

          window._markers = [];
          const map = L.map('map', { zoomControl: true }).setView([${LOCATIONS[0].latitude}, ${LOCATIONS[0].longitude}], 13);
          const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          tiles.on('tileload', function() { /* noop */ });
          tiles.on('tileerror', function() {
            send({ type: 'log', payload: 'tile error' });
            document.getElementById('info').innerText = 'Tile load error';
          });

          function addLocations(locations) {
            window._markers = [];
            locations.forEach(l => {
              const m = L.marker([l.latitude, l.longitude]).addTo(map).bindPopup('<b>'+l.title+'</b>');
              m.on('click', ()=> {
                send({ type: 'markerClick', payload: l });
              });
              window._markers.push(m);
            });
            if (window._markers.length) {
              const group = L.featureGroup(window._markers);
              map.fitBounds(group.getBounds().pad(0.35));
            }
            document.getElementById('info').innerText = 'Markers loaded';
          }

          function updateUserLocation(lat, lng) {
            if (window._userMarker) {
              window._userMarker.setLatLng([lat, lng]);
            } else {
              window._userMarker = L.circleMarker([lat, lng], { radius: 8, color: '#007bff', fillColor: '#007bff', fillOpacity: 0.9 }).addTo(map).bindPopup('You are here');
            }
            const pts = window._markers.map(m => m.getLatLng());
            pts.push({ lat, lng });
            try {
              const bounds = L.latLngBounds(pts);
              map.fitBounds(bounds.pad(0.30));
            } catch(e) {}
            document.getElementById('info').innerText = 'User located';
          }

          function onMessage(event) {
            try {
              const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              if (!data || !data.type) return;
              if (data.type === 'locations') {
                addLocations(data.payload || []);
              } else if (data.type === 'userLocation') {
                const { lat, lng } = data.payload || {};
                if (lat && lng) updateUserLocation(lat, lng);
              } else if (data.type === 'setInfo') {
                document.getElementById('info').innerText = data.payload || '';
              }
            } catch (e) {
              send({ type: 'log', payload: 'onMessage parse error: ' + (e && e.message) });
            }
          }

          document.addEventListener('message', onMessage);
          window.addEventListener('message', onMessage);

          // small delay then signal ready
          setTimeout(() => {
            send({ type: 'ready' });
            send({ type: 'log', payload: 'map ready posted' });
            document.getElementById('info').innerText = 'Map ready';
          }, 250);
        </script>
      </body>
    </html>
  `;

  // handle webview load events (debug)
  function onWebLoadStart() { setWebLoadState('start'); console.log('WebView load start'); }
  function onWebLoadEnd() { setWebLoadState('end'); console.log('WebView load end'); }
  function onWebError(s: any) { console.warn('WebView error', s); setWebLoadState('error'); }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {loadingPosition ? 'Detecting location…' : cityName ? `City: ${cityName}` : 'City: unknown'}
        </Text>
        <Text style={styles.subText}>
          {webReady ? 'Map loaded' : 'Waiting for map…'}
        </Text>
      </View>

      <View style={[styles.container, { height: height - 120 - bottomInset }]}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          onMessage={handleOnMessage}
          onLoadStart={onWebLoadStart}
          onLoadEnd={onWebLoadEnd}
          onError={onWebError}
          onHttpError={(ev) => console.warn('HTTP error in WebView', ev)}
        />
        {(loadingPosition || !webReady) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FCFCFC' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  headerText: { fontSize: 16, fontWeight: '600' },
  subText: { fontSize: 12, color: '#666', marginTop: 4 },
  container: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-start' },
  loadingOverlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
