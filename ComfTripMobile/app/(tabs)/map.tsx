// MapScreen.tsx (fixed)
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Text,
  Platform,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  FlatList,
  ScrollView,
  Linking,
} from "react-native";
import type { ViewStyle } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PrimaryButton from "@/components/buttons/PrimaryButton";
import { ArrowIcon } from "@/components/icons/ArrowIcon";

type Loc = {
  id: string;
  title: string;
  category: string;
  latitude: number;
  longitude: number;
  description?: string;
  images?: string[];
};

const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoibWFuZHJhY2EiLCJhIjoiY21mZnE1dmI0MDlubjJpcG5rYmw3ZnRiZiJ9.RwdRSwXlP1PX_7j7cwUsMA";

const img = (id: string, n = 1) => `https://picsum.photos/seed/${id}-${n}/800/520`;

const LOCATIONS: Loc[] = [
  {
    id: "mnb",
    title: "Museo Nacional de Bellas Artes",
    category: "Cultura",
    latitude: -34.58398611,
    longitude: -58.39297,
    description:
      "Colección extensa de arte argentino y europeo destacada por pinturas, esculturas y exposiciones temporales.",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/c/c2/Museo_Nacional_de_Bellas_Artes_%28Buenos_Aires%29_10209.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/5/55/Museo_Nacional_de_Bellas_Artes_-_Buenos_Aires%2C_Argentina.jpg",
      "https://picsum.photos/seed/mnb-3/800/520",
    ],
  },
  {
    id: "teatro_colon",
    title: "Teatro Colón",
    category: "Cultura",
    latitude: -34.601131,
    longitude: -58.383617,
    description:
      "Famoso teatro de ópera, reconocido por su acústica y arquitectura; sede de presentaciones clásicas y contemporáneas.",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/3/3a/Teatro_Col%C3%B3n%2C_Buenos_Aires.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/9/9e/Teatro_Col%C3%B3n_-_Buenos_Aires.jpg",
    ],
  },
  {
    id: "malba",
    title: "MALBA (Museo)",
    category: "Cultura",
    latitude: -34.5769334,
    longitude: -58.403398,
    description:
      "Museo de arte latinoamericano con colecciones permanentes y exposiciones temporales de artistas contemporáneos.",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/9/9a/Malba_-_Buenos_Aires.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/0/03/MALBA_%28Museo_de_Arte_Latinoamericano_de_Buenos_Aires%29.jpg",
      "https://picsum.photos/seed/malba-3/800/520",
    ],
  },
  {
    id: "recoleta_cc",
    title: "Centro Cultural Recoleta",
    category: "Cultura",
    latitude: -34.585164,
    longitude: -58.388664,
    description:
      "Centro cultural con muestras de arte, ferias, talleres y actividades culturales en el corazón de Recoleta.",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/f/f0/Centro_Cultural_Recoleta%2C_Buenos_Aires.jpg",
      "https://picsum.photos/seed/recoleta-2/800/520",
    ],
  },
  {
    id: "museo_moderno",
    title: "Museo de Arte Moderno (MAMBA)",
    category: "Cultura",
    latitude: -34.61765,
    longitude: -58.36898,
    description:
      "Museo dedicado al arte moderno y contemporáneo con colecciones y exhibiciones temporales.",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/1/13/Museo_de_Arte_Moderno_de_Buenos_Aires.jpg",
      "https://picsum.photos/seed/museo_moderno-2/800/520",
      "https://picsum.photos/seed/museo_moderno-3/800/520",
    ],
  },
  {
    id: "teatro_cervantes",
    title: "Teatro Cervantes",
    category: "Cultura",
    latitude: -34.599333,
    longitude: -58.384111,
    description:
      "Importante espacio teatral con una variada programación de música, teatro y danza.",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/f/f4/Teatro_Cervantes.jpg",
      "https://picsum.photos/seed/teatro_cervantes-2/800/520",
    ],
  },
  {
    id: "tres_febrero",
    title: "Parque Tres de Febrero (Bosques de Palermo)",
    category: "Naturaleza",
    latitude: -34.57071422,
    longitude: -58.42070191,
    description:
      "Amplios jardines, lagos y rosedales: un clásico para paseos, picnics y actividades al aire libre.",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/1/10/Parque_Tres_de_Febrero.jpg",
      "https://picsum.photos/seed/tres_febrero-2/800/520",
    ],
  },
  {
    id: "reserva",
    title: "Reserva Ecológica Costanera Sur",
    category: "Naturaleza",
    latitude: -34.607521,
    longitude: -58.352325,
    description:
      "Área protegida junto al río con senderos, observación de aves y naturaleza urbana preservada.",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/2/22/Costanera_Sur_-_Buenos_Aires.jpg",
      "https://picsum.photos/seed/reserva-2/800/520",
      "https://picsum.photos/seed/reserva-3/800/520",
    ],
  },
  {
    id: "jardin_botanico",
    title: "Jardín Botánico Carlos Thays",
    category: "Naturaleza",
    latitude: -34.58247,
    longitude: -58.418598,
    description:
      "Colección botánica y invernáculos con especies locales y exóticas para visitar todo el año.",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/4/49/Jardin_Botanico_Carlos_Thays_01.jpg",
      "https://picsum.photos/seed/jardin_botanico-2/800/520",
    ],
  },
  {
    id: "parque_lezama",
    title: "Parque Lezama",
    category: "Naturaleza",
    latitude: -34.62659642,
    longitude: -58.369556,
    description:
      "Espacio histórico y arbolado con esculturas, ideal para pasear y ver la arquitectura vecina.",
    images: ["https://picsum.photos/seed/parque_lezama-1/800/520"],
  },
  {
    id: "parque_centenario",
    title: "Parque Centenario",
    category: "Naturaleza",
    latitude: -34.60654373,
    longitude: -58.4356338,
    description:
      "Gran parque con laguna, espacios deportivos y actividades familiares durante los fines de semana.",
    images: [
      "https://turismo.buenosaires.gob.ar/sites/turismo/files/parque-centenario-2023-1500x610.jpg",
      "https://turismo.buenosaires.gob.ar/sites/turismo/files/parque-centenario-2023-1500x610.jpg",
    ],
  },
  {
    id: "cafe_tortoni",
    title: "Café Tortoni",
    category: "Gastronomia",
    latitude: -34.608917,
    longitude: -58.378333,
    description:
      "Café histórico famoso por su ambiente porteño y eventos culturales. Clásico para tomar algo y ver la arquitectura.",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/3/32/Cafe_Tortoni_Buenos_Aires.jpg",
      "https://picsum.photos/seed/cafe_tortoni-2/800/520",
    ],
  },
  {
    id: "don_julio",
    title: "Parrilla Don Julio",
    category: "Gastronomia",
    latitude: -34.58634,
    longitude: -58.42423,
    description:
      "Parrilla reconocida por su excelente carne y ambiente acogedor; reserva recomendada en horas pico.",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/2/2b/Parrilla_Don_Julio.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/5/5c/Don_Julio_01_%28interior%29.jpg",
      "https://picsum.photos/seed/don_julio-3/800/520",
    ],
  },
  {
    id: "la_cabrera",
    title: "La Cabrera",
    category: "Gastronomia",
    latitude: -34.589358,
    longitude: -58.432898,
    description:
      "Otra parrilla clásica de Palermo, con porciones abundantes y menú tradicional argentino.",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/0/0d/Parrila_La_Cabrera.jpg",
      "https://picsum.photos/seed/la_cabrera-2/800/520",
    ],
  },
  {
    id: "el_preferido",
    title: "El Preferido de Palermo",
    category: "Gastronomia",
    latitude: -34.59125,
    longitude: -58.41865,
    description:
      "Bar/restaurante con una mezcla de clásicos porteños y propuestas modernas; buen brunch.",
    images: [
      "https://picsum.photos/seed/el_preferido-1/800/520",
      "https://picsum.photos/seed/el_preferido-2/800/520",
    ],
  },
  {
    id: "bar_galgos",
    title: "Bar Los Galgos",
    category: "Gastronomia",
    latitude: -34.606256,
    longitude: -58.379568,
    description:
      "Bar tradicional con historia gastronómica porteña y platos típicos en un ambiente relajado.",
    images: ["https://picsum.photos/seed/bar_galgos-1/800/520"],
  },
  {
    id: "mercado_santelmo",
    title: "Mercado de San Telmo",
    category: "Gastronomia",
    latitude: -34.619268,
    longitude: -58.372592,
    description:
      "Mercado y feria con comidas típicas, antigüedades y artesanías; un paseo cultural y gastronómico.",
    images: [
      "https://picsum.photos/seed/mercado_santelmo-1/800/520",
      "https://picsum.photos/seed/mercado_santelmo-2/800/520",
    ],
  },
  {
    id: "museo_hist",
    title: "Museo Histórico Nacional",
    category: "Cultura",
    latitude: -34.62704012,
    longitude: -58.3705892,
    description:
      "Museo con piezas históricas que cuentan la historia argentina; visitas guiadas disponibles.",
    images: [
      "https://picsum.photos/seed/museo_hist-1/800/520",
      "https://picsum.photos/seed/museo_hist-2/800/520",
    ],
  },
  {
    id: "plaza_houssay",
    title: "Plaza Houssay",
    category: "Naturaleza",
    latitude: -34.587524,
    longitude: -58.402085,
    description:
      "Pequeña plaza urbana con espacios para descansar cerca de la zona universitaria.",
    images: ["https://picsum.photos/seed/plaza_houssay-1/800/520"],
  },
  {
    id: "puerto_madero",
    title: "Costanera / Puerto Madero (waterfront)",
    category: "Naturaleza",
    latitude: -34.608938,
    longitude: -58.364617,
    description:
      "Zona moderna junto al río con paseos, restaurantes y arquitectura contemporánea frente al agua.",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/6/66/Puerto_Madero%2C_Buenos_Aires.jpg",
      "https://picsum.photos/seed/puerto_madero-2/800/520",
      "https://picsum.photos/seed/puerto_madero-3/800/520",
    ],
  },
];
const CATEGORY_COLOR: Record<string, string> = {
  Cultura: "#D9534F",
  Naturaleza: "#28A745",
  Gastronomia: "#F0AD4E",
};

// Simplified URI normalization
function normalizeUri(uri?: string | null): string | undefined {
  if (!uri) return undefined;

  try {
    // Only decode once to handle encoded URLs properly
    const decoded = decodeURIComponent(uri);
    // Re-encode to ensure it's a valid URI
    return encodeURI(decoded);
  } catch (e) {
    console.warn("Failed to normalize URI:", uri, e);
    return uri ?? undefined;
  }
}

export default function MapScreen() {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomInset = insets?.bottom ?? 0;
  const webRef = useRef<WebView | null>(null);

  const [loadingPosition, setLoadingPosition] = useState(true);
  const [webReady, setWebReady] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);

  const [detailVisible, setDetailVisible] = useState(false);
  const [selected, setSelected] = useState<{
    id?: string;
    title?: string;
    category?: string;
    description?: string;
    images?: string[];
    coords?: [number, number];
  } | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

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

  useEffect(() => {
    if (!webReady) return;
    if (userCoords) postMessageToWeb({ type: "userLocation", payload: userCoords });
    if (cityName) postMessageToWeb({ type: "setInfo", payload: `Ciudad: ${cityName}` });
  }, [webReady, userCoords, cityName]);

  function handleOnMessage(e: any) {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data?.type === "ready") {
        setWebReady(true);
      } else if (data?.type === "markerClick") {
        const payload = data.payload || {};

        const rawImages = payload.images || [];
        const images = Array.isArray(rawImages)
          ? rawImages
              .map((itm: any) => {
                if (!itm && itm !== 0) return null;
                try {
                  if (typeof itm === "string") return normalizeUri(itm);
                  if (itm && (itm.url || itm.uri)) return normalizeUri(itm.url || itm.uri);
                  return normalizeUri(String(itm));
                } catch (e) {
                  return null;
                }
              })
              .filter(Boolean) as string[]
          : [];

        setSelected({
          id: payload.id,
          title: payload.title,
          category: payload.category,
          description: payload.description,
          images,
          coords: payload.coords,
        });
        setImageIndex(0);
        setDetailVisible(true);
      } else if (data?.type === "log") {
        console.log("[WebView log]", data.payload);
      }
    } catch (err) {
      console.warn("Invalid message from webview", err);
    }
  }

  const openDirections = useCallback(() => {
    if (!selected?.coords) return;
    const [lng, lat] = selected.coords;
    const geo = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(selected?.title || "")})`;
    const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.canOpenURL(geo)
      .then((supported) => {
        if (supported) return Linking.openURL(geo);
        return Linking.openURL(gmaps);
      })
      .catch(() => {
        Linking.openURL(gmaps);
      });
  }, [selected]);

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
        <style>
          html,body,#map { height:100%; margin:0; padding:0; background: #f8f8f8; }
          #info { position:absolute; z-index:999; left:10px; top:10px; background: rgba(255,255,255,0.95); padding:8px 10px; border-radius:10px; font-family: sans-serif; box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
          .marker-popup { font-family: sans-serif; font-size: 14px; color: #222; }
          .marker-title { font-weight:700; margin-bottom:6px; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div id="info">Loading map...</div>
        <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
        <script>
          (function forwardConsole(){
            const origLog = console.log.bind(console);
            const origError = console.error.bind(console);
            function sendLog(...args) {
              try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', payload: args.map(a => {
                  try { return typeof a === 'string' ? a : JSON.stringify(a); } catch(e) { return String(a); }
                }).join(' ') })); } catch(e){}
            }
            console.log = function(...args){ origLog(...args); sendLog(...args); };
            console.error = function(...args){ origError(...args); sendLog('ERROR: ', ...args); };

            window.onerror = function(message, source, lineno, colno, err) {
              try { window.ReactNativeWebView.postMessage(JSON.stringify({ type:'log', payload: 'window.onerror: ' + message + ' @' + source + ':' + lineno })); } catch(e){}
            };
            window.addEventListener('unhandledrejection', function(ev) {
              try { window.ReactNativeWebView.postMessage(JSON.stringify({ type:'log', payload: 'unhandledrejection: ' + (ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason)) })); } catch(e){}
            });
          })();

          const MAPBOX_TOKEN = "${MAPBOX_ACCESS_TOKEN}";
          mapboxgl.accessToken = MAPBOX_TOKEN;

          function send(msg) {
            try {
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify(msg));
              }
            } catch(e){}
          }

          send({ type: 'log', payload: 'HTML loaded' });

          const LOCATIONS = ${JSON.stringify(LOCATIONS)};
          const CATEGORY_COLOR = ${JSON.stringify(CATEGORY_COLOR)};

          const geojson = {
            type: 'FeatureCollection',
            features: LOCATIONS.map(l => ({
              type: 'Feature',
              properties: { id: l.id, title: l.title, category: l.category, description: l.description, images: l.images },
              geometry: { type: 'Point', coordinates: [l.longitude, l.latitude] }
            }))
          };

          try {
            if (!mapboxgl.supported()) {
              send({ type: 'log', payload: 'mapboxgl.supported() === false -> likely WebGL not available in this WebView / device.' });
              document.getElementById('info').innerText = 'WebGL not supported in this WebView/device.';
            }
          } catch (e) {
            send({ type: 'log', payload: 'mapboxgl.supported() check failed: ' + (e && e.message) });
          }

          let map;
          try {
            map = new mapboxgl.Map({
              container: 'map',
              style: 'mapbox://styles/mapbox/streets-v11',
              center: [${LOCATIONS[0]?.longitude ?? 0}, ${LOCATIONS[0]?.latitude ?? 0}],
              zoom: 12
            });
          } catch (err) {
            send({ type: 'log', payload: 'Map constructor failed: ' + (err && err.message ? err.message : String(err)) });
          }

          if (map) {
            map.on('load', () => {
              try {
                map.addSource('places', { type: 'geojson', data: geojson });

                map.addLayer({
                  id: 'places-layer',
                  type: 'circle',
                  source: 'places',
                  paint: {
                    'circle-radius': 8,
                    'circle-color': ['match', ['get', 'category'],
                      'Cultura', '${CATEGORY_COLOR.Cultura}',
                      'Naturaleza', '${CATEGORY_COLOR.Naturaleza}',
                      'Gastronomia', '${CATEGORY_COLOR.Gastronomia}',
                      '#007bff'
                    ],
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-width': 1
                  }
                });

                map.on('click', 'places-layer', (e) => {
                  try {
                    if (!e.features || !e.features.length) return;
                    const f = e.features[0];
                    const props = f.properties || {};
                    let images = [];
                    try { images = (typeof props.images === 'string') ? JSON.parse(props.images) : props.images; } catch (err) { images = props.images || []; }

                    const payload = {
                      id: props.id,
                      title: props.title,
                      category: props.category,
                      description: props.description,
                      images: images,
                      coords: f.geometry.coordinates
                    };
                    send({ type: 'markerClick', payload });
                    const coords = f.geometry.coordinates.slice();
                    const popupHtml = '<div class="marker-popup"><div class="marker-title">' + (props.title || '') + '</div><div>' + (props.category || '') + '</div></div>';
                    new mapboxgl.Popup({ offset: 10 }).setLngLat(coords).setHTML(popupHtml).addTo(map);
                  } catch (err) {
                    send({ type: 'log', payload: 'click handler error: ' + (err && err.message) });
                  }
                });

                map.on('mouseenter', 'places-layer', () => map.getCanvas().style.cursor = 'pointer');
                map.on('mouseleave', 'places-layer', () => map.getCanvas().style.cursor = '');

                if (geojson.features.length) {
                  try {
                    const bounds = geojson.features.reduce((b, f) => b.extend(f.geometry.coordinates), new mapboxgl.LngLatBounds(geojson.features[0].geometry.coordinates, geojson.features[0].geometry.coordinates));
                    map.fitBounds(bounds.pad(0.25), { animate: false });
                  } catch(e){}
                }

                send({ type: 'ready' });
                send({ type: 'log', payload: 'map load event fired' });
              } catch (e) {
                send({ type: 'log', payload: 'map.on(load) handler failed: ' + (e && e.message) });
              }
            });

            map.on('error', (e) => {
              try { send({ type: 'log', payload: 'map error: ' + JSON.stringify(e && e.error ? e.error.message : e) }); } catch(e){}
            });
            map.on('style.load', () => { try { send({ type: 'log', payload: 'style.load fired' }); } catch(e){} });
            map.on('styledata', () => { try { send({ type: 'log', payload: 'styledata fired' }); } catch(e){} });

            let userMarker = null;
            function updateUserLocation(lat, lng) {
              const lngLat = [lng, lat];
              try {
                if (userMarker) {
                  userMarker.setLngLat(lngLat);
                } else {
                  userMarker = new mapboxgl.Marker({ color: '#007bff' }).setLngLat(lngLat).setPopup(new mapboxgl.Popup().setText('You are here')).addTo(map);
                }

                const allCoords = geojson.features.map(f => f.geometry.coordinates).concat([lngLat]);
                const bounds = allCoords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]));
                try {
                  map.fitBounds(bounds.pad(0.25));
                } catch (e) {}
                document.getElementById('info').innerText = 'User located';
              } catch (e) {
                send({ type: 'log', payload: 'updateUserLocation error: ' + (e && e.message) });
              }
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
                  try { map.getSource('places').setData(data.payload || geojson); } catch (e) { send({ type:'log', payload: 'setData failed: ' + (e && e.message) }); }
                }
              } catch (e) {
                send({ type: 'log', payload: 'onMessage parse error: ' + (e && e.message) });
              }
            }

            document.addEventListener('message', onMessage);
            window.addEventListener('message', onMessage);
          } // end if(map)
        </script>
      </body>
    </html>
  `;

  const onViewRef = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length) {
      setImageIndex(viewableItems[0].index ?? 0);
    }
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  function ImageWithFallback({
    uri,
    fallbackSeed,
    style,
    resizeMode,
  }: {
    uri?: string;
    fallbackSeed?: string;
    style?: any;
    resizeMode?: any;
  }) {
    const [failed, setFailed] = useState(false);
    const [loading, setLoading] = useState(true);

    const normalized = normalizeUri(uri);
    const flatStyle = StyleSheet.flatten(style) || {};
    const containerWidth = flatStyle.width ?? undefined;
    const containerHeight = flatStyle.height ?? undefined;

    const containerStyle: ViewStyle = {
      width: containerWidth ?? 300,
      height: containerHeight ?? 220,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: flatStyle.backgroundColor ?? "#000",
      overflow: "hidden",
    };

    const source = !failed && normalized
      ? { uri: normalized, headers: { Referer: "https://commons.wikimedia.org/", "User-Agent": "Mozilla/5.0 (compatible)" } }
      : { uri: img(fallbackSeed || "placeholder", 1) };

    return (
      <View style={containerStyle}>
        {loading && (
          <View style={[StyleSheet.absoluteFillObject, { justifyContent: "center", alignItems: "center" }]}>
            <ActivityIndicator />
          </View>
        )}

        <Image
          source={source as any}
          style={[{ width: "100%", height: "100%" }, flatStyle]}
          resizeMode={resizeMode || "cover"}
          onLoadStart={() => {
            setLoading(true);
            setFailed(false);
          }}
          onLoadEnd={() => setLoading(false)}
          onError={(e) => {
            console.warn("Image load failed:", normalized || uri, e?.nativeEvent || e);
            setFailed(true);
            setLoading(false);
          }}
        />

        {failed && !loading && (
          <View style={[StyleSheet.absoluteFillObject, { justifyContent: "center", alignItems: "center" }]}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Imagen no disponible</Text>
          </View>
        )}
      </View>
    );
  }

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
          androidLayerType="hardware"
        />
        {(loadingPosition || !webReady) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" />
          </View>
        )}
      </View>

      <Modal
        visible={detailVisible}
        animationType="slide"
        onRequestClose={() => setDetailVisible(false)}
        transparent
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setDetailVisible(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <SafeAreaView
            style={[
              styles.modalContent,
              { height: Math.min(500, Math.round(height * 0.6)) },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeText}>Cerrar</Text>
              </TouchableOpacity>

              <View style={styles.headerTitles}>
                {selected?.title ? <Text style={styles.modalTitle}>{selected.title}</Text> : null}
                {selected?.category ? <Text style={styles.modalCategory}>{selected.category}</Text> : null}
              </View>
            </View>

            {selected?.images && selected.images.length > 0 ? (
              <View style={[styles.imagesWrap, { height: 160 }]}>
                <FlatList
                  data={selected.images}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  initialNumToRender={1}
                  windowSize={2}
                  removeClippedSubviews={false}
                  keyExtractor={(_, idx) => `${selected?.id ?? "img"}-${idx}`}
                  snapToInterval={width}
                  decelerationRate="fast"
                  renderItem={({ item }) => {
                    const uri = typeof item === "string" ? item : String(item);
                    return (
                      <View style={{ width: width, height: 160, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
                        <ImageWithFallback
                          uri={uri}
                          fallbackSeed={selected?.id ?? "placeholder"}
                          style={[styles.detailImage, { width, height: 160 }]}
                          resizeMode="cover"
                        />
                      </View>
                    );
                  }}
                  onViewableItemsChanged={onViewRef.current}
                  viewabilityConfig={viewConfigRef.current}
                />

                <View style={styles.imageOverlay}>
                  <Text numberOfLines={1} style={styles.overlayTitle}>
                    {selected?.title ?? ""}
                  </Text>
                </View>

                <View style={styles.dots}>
                  {selected.images.map((_, i) => (
                    <View key={i} style={[styles.dot, i === imageIndex ? styles.dotActive : undefined]} />
                  ))}
                </View>
              </View>
            ) : (
              <View style={[styles.imagesWrap, { height: 120, alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ color: "rgba(0,0,0,0.5)" }}>No hay imágenes</Text>
              </View>
            )}

            <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ padding: 20 }}>
              <View style={styles.rowTop}>
                <View style={[styles.badge, { backgroundColor: CATEGORY_COLOR[selected?.category ?? ""] || "#ddd" }]}>
                  {selected?.category ? <Text style={styles.badgeText}>{selected.category}</Text> : null}
                </View>
              </View>

              {selected?.description ? <Text style={styles.descriptionText}>{selected.description}</Text> : null}

              <View style={styles.actionsRow}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    title="Cómo llegar"
                    onPress={openDirections}
                    height={52}
                    borderRadius={10}
                    rightIcon={<ArrowIcon color="#FFFFFF" />}
                    style={{ flex: 1 }}
                    activeOpacity={0.95}
                  />
                </View>

                <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryTxt}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
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
  legendRow: { flexDirection: "row", marginTop: 8, alignItems: "center" },
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

  modalSafe: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
  },
  closeBtn: { padding: 8 },
  closeText: { color: "#007bff", fontWeight: "600" },
  headerTitles: { flex: 1, alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  modalCategory: { fontSize: 13, color: "rgba(0,0,0,0.6)", marginTop: 4 },

  imagesWrap: {
    height: 220,
    backgroundColor: "#000",
  },
  detailImage: {
    height: 220,
  },
  imageOverlay: {
    position: "absolute",
    left: 16,
    bottom: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  overlayTitle: { color: "#fff", fontWeight: "700", fontSize: 16, maxWidth: "85%" },

  dots: {
    position: "absolute",
    bottom: 10,
    right: 16,
    flexDirection: "row",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.45)",
    marginHorizontal: 3,
  },
  dotActive: { backgroundColor: "#fff", width: 10, height: 10 },

  modalBody: {
    flex: 1,
    backgroundColor: "#fff",
  },

  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { color: "#fff", fontWeight: "700" },

  descriptionText: {
    fontSize: 16,
    color: "rgba(0,0,0,0.8)",
    lineHeight: 22,
    marginBottom: 18,
  },

  actionsRow: {
    flexDirection: "row",
    marginTop: 6,
    alignItems: "center",
  },

  secondaryBtn: {
    marginLeft: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    justifyContent: "center",
  },
  secondaryTxt: { color: "#444", fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
});
