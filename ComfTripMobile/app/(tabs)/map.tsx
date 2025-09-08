// app/(tabs)/map.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Text,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Loc = { id: string; title: string; category: string; latitude: number; longitude: number };

// 20 locations across three categories
const LOCATIONS: Loc[] = [
  // Cultura
  { id: "mnb", title: "Museo Nacional de Bellas Artes", category: "Cultura", latitude: -34.58398611, longitude: -58.39297000 }, // MNBA (official / wiki)
  { id: "teatro_colon", title: "Teatro Colón", category: "Cultura", latitude: -34.60113100, longitude: -58.38361700 }, // theatre (latlong/net)
  { id: "malba", title: "MALBA (Museo)", category: "Cultura", latitude: -34.57693340, longitude: -58.40339800 }, // MALBA
  { id: "recoleta_cc", title: "Centro Cultural Recoleta", category: "Cultura", latitude: -34.58516400, longitude: -58.38866400 },
  { id: "museo_moderno", title: "Museo de Arte Moderno (MAMBA)", category: "Cultura", latitude: -34.61765000, longitude: -58.36898000 },
  { id: "teatro_cervantes", title: "Teatro Cervantes", category: "Cultura", latitude: -34.59933300, longitude: -58.38411100 },

  // Naturaleza
  { id: "tres_febrero", title: "Parque Tres de Febrero (Bosques de Palermo)", category: "Naturaleza", latitude: -34.57071422, longitude: -58.42070191 },
  { id: "reserva", title: "Reserva Ecológica Costanera Sur", category: "Naturaleza", latitude: -34.60752100, longitude: -58.35232500 },
  { id: "jardin_botanico", title: "Jardín Botánico Carlos Thays", category: "Naturaleza", latitude: -34.58247000, longitude: -58.41859800 }, 
  { id: "parque_lezama", title: "Parque Lezama", category: "Naturaleza", latitude: -34.62659642, longitude: -58.36955600 },
  { id: "parque_centenario", title: "Parque Centenario", category: "Naturaleza", latitude: -34.60654373, longitude: -58.43563380 }, 

  // Gastronomia
  { id: "cafe_tortoni", title: "Café Tortoni", category: "Gastronomia", latitude: -34.60891700, longitude: -58.37833300 },
  { id: "don_julio", title: "Parrilla Don Julio", category: "Gastronomia", latitude: -34.58634000, longitude: -58.42423000 },
  { id: "la_cabrera", title: "La Cabrera", category: "Gastronomia", latitude: -34.58935800, longitude: -58.43289800 },
  { id: "el_preferido", title: "El Preferido de Palermo", category: "Gastronomia", latitude: -34.59125000, longitude: -58.41865000 },
  { id: "bar_galgos", title: "Bar Los Galgos", category: "Gastronomia", latitude: -34.60625600, longitude: -58.37956800 },
  { id: "mercado_santelmo", title: "Mercado de San Telmo", category: "Gastronomia", latitude: -34.61926800, longitude: -58.37259200 },

  // Extra Cultura / Naturaleza
  { id: "museo_hist", title: "Museo Histórico Nacional", category: "Cultura", latitude: -34.62704012, longitude: -58.37058920 },
  { id: "plaza_houssay", title: "Plaza Houssay", category: "Naturaleza", latitude: -34.58752400, longitude: -58.40208500 },
  { id: "puerto_madero", title: "Costanera / Puerto Madero (waterfront)", category: "Naturaleza", latitude: -34.60893800, longitude: -58.36461700 },
];

const CATEGORY_COLOR: Record<string, string> = {
  Cultura: "#D9534F",
  Naturaleza: "#28A745", 
  Gastronomia: "#F0AD4E", 
};

export default function MapScreen() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomInset = insets?.bottom ?? 0;
  const webRef = useRef<WebView | null>(null);

  const [loadingPosition, setLoadingPosition] = useState(true);
  const [webReady, setWebReady] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);

  // get user location + reverse geocode
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Location permission denied");
          setLoadingPosition(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!mounted) return;
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);

        // reverse geocode
        try {
          const places = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
          if (places && places.length > 0) {
            const p = places[0];
            const label = p.city ?? p.subregion ?? p.region ?? p.name ?? "Unknown";
            setCityName(label);
          } else {
            setCityName("Unknown");
          }
        } catch (rgErr) {
          console.warn("reverseGeocodeAsync failed", rgErr);
          setCityName("Unknown");
        }
      } catch (err) {
        console.warn("Error getting location", err);
      } finally {
        setLoadingPosition(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function postMessageToWeb(obj: any) {
    try {
      webRef.current?.postMessage(JSON.stringify(obj));
    } catch (e) {
      console.warn("postMessage failed", e);
    }
  }

  // send user coords when web ready
  useEffect(() => {
    if (!webReady) return;
    if (userCoords) postMessageToWeb({ type: "userLocation", payload: userCoords });
    // we also send a setInfo message so the webview's info box shows the city quickly
    if (cityName) postMessageToWeb({ type: "setInfo", payload: `City: ${cityName}` });
  }, [webReady, userCoords, cityName]);

  function handleOnMessage(e: any) {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data?.type === "ready") {
        setWebReady(true);
      } else if (data?.type === "markerClick") {
        console.log("Marker clicked in webview:", data.payload);
      } else if (data?.type === "log") {
        console.log("[WebView log]", data.payload);
      }
    } catch (err) {
      console.warn("Invalid message from webview", err);
    }
  }

  // Insert LOCATIONS into the HTML so markers appear immediately; the RN still posts userLocation later.
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html,body,#map { height: 100%; margin:0; padding:0; background:#f7f7f7; }
          .leaflet-container { touch-action: none; -webkit-user-select:none; -ms-user-select:none; user-select:none; }
          #info { position:absolute; z-index:1000; left:10px; top:10px; background: rgba(255,255,255,0.95); padding:8px 10px; border-radius:8px; font-family: sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
          .legend { display:flex; gap:8px; align-items:center; margin-top:6px; font-size:13px; color:#333; }
          .dot { width:12px; height:12px; border-radius:6px; display:inline-block; margin-right:6px; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div id="info">Loading map...</div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          function send(msg) {
            try {
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify(msg));
              }
            } catch(e) {}
          }

          send({ type: 'log', payload: 'HTML loaded' });

          const LOCATIONS = ${JSON.stringify(LOCATIONS)};

          const CATEGORY_COLOR = ${JSON.stringify(CATEGORY_COLOR)};

          window._markers = [];
          const map = L.map('map', { zoomControl: true }).setView([${LOCATIONS[0].latitude}, ${LOCATIONS[0].longitude}], 13);
          const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          function colorForCategory(cat) {
            return CATEGORY_COLOR[cat] || '#007bff';
          }

          function addLocations(locations) {
            window._markers = [];
            locations.forEach(l => {
              const color = colorForCategory(l.category);
              const m = L.circleMarker([l.latitude, l.longitude], {
                radius: 8,
                color,
                weight: 1,
                fillColor: color,
                fillOpacity: 0.95
              }).addTo(map)
                .bindPopup('<b>' + l.title + '</b><br/><i>' + l.category + '</i>');
              m.on('click', () => send({ type: 'markerClick', payload: l }));
              window._markers.push(m);
            });
            if (window._markers.length) {
              const group = L.featureGroup(window._markers);
              map.fitBounds(group.getBounds().pad(0.35));
            }
          }

          function updateUserLocation(lat, lng) {
            if (window._userMarker) {
              window._userMarker.setLatLng([lat, lng]);
            } else {
              window._userMarker = L.circleMarker([lat, lng], { radius: 9, color: '#007bff', fillColor: '#007bff', fillOpacity: 0.95 }).addTo(map).bindPopup('You are here');
            }
            const pts = window._markers.map(m => m.getLatLng());
            pts.push({ lat, lng });
            try {
              const bounds = L.latLngBounds(pts);
              map.fitBounds(bounds.pad(0.30));
            } catch(e){}
            document.getElementById('info').innerText = 'User located';
          }

          function onMessage(event) {
            try {
              const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              if (!data || !data.type) return;
              if (data.type === 'userLocation') {
                const { lat, lng } = data.payload || {};
                if (lat && lng) updateUserLocation(lat, lng);
              } else if (data.type === 'setInfo') {
                document.getElementById('info').innerText = data.payload || '';
              } else if (data.type === 'locations') {
                // accept locations posted from RN if needed
                addLocations(data.payload || []);
              }
            } catch (e) {
              send({ type: 'log', payload: 'onMessage parse error: ' + (e && e.message) });
            }
          }

          document.addEventListener('message', onMessage);
          window.addEventListener('message', onMessage);

          // init
          setTimeout(() => {
            addLocations(LOCATIONS);
            send({ type: 'ready' });
            send({ type: 'log', payload: 'map ready posted' });
          }, 250);
        </script>
      </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerText}>
            {loadingPosition ? "Detecting location…" : cityName ? `Ciudad: ${cityName}` : "City: unknown"}
          </Text>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLOR.Cultura }]} />
            <Text style={styles.legendLabel}>Cultura</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLOR.Naturaleza }]} />
            <Text style={styles.legendLabel}>Naturaleza</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLOR.Gastronomia }]} />
            <Text style={styles.legendLabel}>Gastronomía</Text>
          </View>
        </View>
      </View>

      <View style={[styles.container, { height: height - 120 - bottomInset }]}>
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          onMessage={handleOnMessage}
          onError={(e) => console.warn("WebView error", e)}
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
  safeArea: { flex: 1, backgroundColor: "#FCFCFC" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerText: { fontSize: 16, fontWeight: "600" },
  smallHint: { fontSize: 12, color: "#666" },
  legendRow: { flexDirection: "row", marginTop: 8, gap: 12, alignItems: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", marginRight: 12 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  legendLabel: { fontSize: 13, color: "#333" },

  container: { flex: 1, alignItems: "stretch", justifyContent: "flex-start" },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
});
