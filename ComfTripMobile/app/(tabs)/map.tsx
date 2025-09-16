// MapScreen.tsx (fetch locations from backend) - map centered on user by default; markers rendered using SVG icons as Mapbox images
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  FlatList,
  ScrollView,
  Linking,
  Pressable,
  Platform,
} from "react-native";
import type { ViewStyle } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PrimaryButton from "@/components/buttons/PrimaryButton";
import { ArrowIcon } from "@/components/icons/ArrowIcon";
import { apiGet } from "@/helpers/api"; // <-- use your api helper

type Loc = {
  id: string;
  title: string;
  category: string;
  latitude: number;
  longitude: number;
  description?: string;
  images?: string[];
};

type Interest = {
  id?: number | string;
  slug?: string;
  title: string;
};

const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoibWFuZHJhY2EiLCJhIjoiY21mZnE1dmI0MDlubjJpcG5rYmw3ZnRiZiJ9.RwdRSwXlP1PX_7j7cwUsMA";

// helper that returns a fake placeholder image when needed
const img = (id: string, n = 1) => `https://picsum.photos/seed/${id}-${n}/800/520`;

/**
 * Colors keyed by the display category used in the webview HTML (capitalized).
 * HTML expects keys like CATEGORY_COLOR.Cultura etc, so keep these keys capitalized.
 * Added Compras color as requested.
 */
const CATEGORY_COLOR: Record<string, string> = {
  Cultura: "#D9534F",
  Naturaleza: "#28A745",
  Gastronomia: "#F0AD4E",
  Compras: "#8E44AD", // new color for Compras
};

function normalizeUri(uri?: string | null): string | undefined {
  if (!uri) return undefined;
  try {
    const decoded = decodeURIComponent(uri);
    return encodeURI(decoded);
  } catch (e) {
    console.warn("Failed to normalize URI:", uri, e);
    return uri ?? undefined;
  }
}

// Convert fk_interest slug (or any string) into display category (capitalize & replace - with space)
const displayCategoryFromFk = (fk?: string | null) => {
  if (!fk) return "Otros";
  return String(fk).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

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

  // New: locations & interests from API
  const [locations, setLocations] = useState<Loc[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  const [interests, setInterests] = useState<Interest[]>([]);
  const [loadingInterests, setLoadingInterests] = useState(true);
  const [selectedInterest, setSelectedInterest] = useState<string>(""); // slug; empty = Todos

  // Fetch interests from /users/interests
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingInterests(true);
      try {
        const res = await apiGet("/users/interests");
        const data = res?.data ?? res;
        if (Array.isArray(data) && mounted) {
          // normalize to { id, slug, title }
          const normalized = data.map((it: any) => ({
            id: it.id,
            slug: it.slug ?? (it.title ? String(it.title).toLowerCase().replace(/\s+/g, "-") : undefined),
            title: it.title ?? it.slug ?? String(it.id ?? ""),
          })) as Interest[];
          setInterests(normalized);
        } else if (mounted) {
          setInterests([]);
        }
      } catch (err) {
        console.warn("Failed to fetch interests:", err);
        if (mounted) setInterests([]);
      } finally {
        if (mounted) setLoadingInterests(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch locations (filtered by selectedInterest if set)
  const fetchLocations = useCallback(
    async (interestSlug?: string) => {
      setLoadingLocations(true);
      try {
        const q = interestSlug ? `?interest=${encodeURIComponent(interestSlug)}` : "";
        const res = await apiGet(`/locations${q}`);
        const data = res?.data ?? res;
        if (Array.isArray(data)) {
          const normalized = data
            .map((r: any): Loc | null => {
              let imgs: any = [];
              if (r.imagenes) {
                if (typeof r.imagenes === "string") {
                  try {
                    imgs = JSON.parse(r.imagenes);
                  } catch (err) {
                    imgs = [r.imagenes];
                  }
                } else if (Array.isArray(r.imagenes)) {
                  imgs = r.imagenes;
                } else if (r.imagenes.url || r.imagenes.uri) {
                  imgs = [r.imagenes.url ?? r.imagenes.uri];
                } else {
                  imgs = [];
                }
              }

              const lat =
                r.latitude !== undefined && r.latitude !== null
                  ? Number(r.latitude)
                  : r.latitud !== undefined && r.latitud !== null
                  ? Number(r.latitud)
                  : null;
              const lng =
                r.longitude !== undefined && r.longitude !== null
                  ? Number(r.longitude)
                  : r.longitud !== undefined && r.longitud !== null
                  ? Number(r.longitud)
                  : null;

              if (lat === null || lng === null) return null;

              return {
                id: String(r.id),
                title: r.titulo ?? "",
                category: displayCategoryFromFk(r.fk_interest),
                latitude: lat,
                longitude: lng,
                description: r.descripcion ?? "",
                images: Array.isArray(imgs) ? imgs.map((it: any) => (typeof it === "string" ? it : it?.url ?? it?.uri ?? String(it))) : [],
              } as Loc;
            })
            .filter((x): x is Loc => x !== null);

          setLocations(normalized);
        } else {
          setLocations([]);
        }
      } catch (err) {
        console.warn("Failed to fetch locations:", err);
        setLocations([]);
      } finally {
        setLoadingLocations(false);
      }
    },
    []
  );

  // initial fetch and when selectedInterest changes
  useEffect(() => {
    fetchLocations(selectedInterest || undefined);
  }, [selectedInterest, fetchLocations]);

  // location permission & reverse geocode
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

  // IMPORTANT: keep html static so WebView source doesn't change (prevents reloads).
  // initialGeo starts empty; markers/user-location handled by postMessage later.
  const html = useMemo(() => {
    const initialGeo = JSON.stringify({ type: "FeatureCollection", features: [] });

    return `<!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
        <style>
          html,body,#map { height:100%; margin:0; padding:0; background: #f8f8f8; }
          #info { display:none !important; }
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
            function sendLog(...args) {
              try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', payload: args.map(a => {
                  try { return typeof a === 'string' ? a : JSON.stringify(a); } catch(e) { return String(a); }
                }).join(' ') })); } catch(e){}
            }
            console.log = function(...args){ origLog(...args); sendLog(...args); };
            window.onerror = function(message, source, lineno) {
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

          const CATEGORY_COLOR = ${JSON.stringify(CATEGORY_COLOR)};
          let geojson = ${initialGeo};

          function colorFromString(s) {
            if (!s) return '#007bff';
            let h = 0;
            for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
            const hue = Math.abs(h) % 360;
            return 'hsl(' + hue + ' 70% 45%)';
          }

          // create SVG string for the pin; we do not apply transforms here — Mapbox symbol layout anchors the icon.
          function createPinSvg(color) {
            // Use the same SVG shape as before
            return [
              '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">',
              '<path d="M12 2C8.1 2 5 5.1 5 9c0 5 7 12 7 12s7-7 7-12c0-3.9-3.1-7-7-7z" fill="', color, '" />',
              '<circle cx="12" cy="9" r="2.3" fill="#fff" />',
              '</svg>'
            ].join('');
          }

          // URL-encode SVG for data URL
          function svgToDataUrl(svg) {
            return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
          }

          try {
            if (!mapboxgl.supported()) {
              send({ type: 'log', payload: 'mapboxgl.supported() === false -> likely WebGL not available in this WebView / device.' });
              const infoEl = document.getElementById('info');
              if (infoEl) infoEl.innerText = 'WebGL not supported in this WebView/device.';
            }
          } catch (e) {
            send({ type: 'log', payload: 'mapboxgl.supported() check failed: ' + (e && e.message) });
          }

          let map;
          try {
            map = new mapboxgl.Map({
              container: 'map',
              style: 'mapbox://styles/mapbox/streets-v11',
              center: [0,0],
              zoom: 12
            });
          } catch (err) {
            send({ type: 'log', payload: 'Map constructor failed: ' + (err && err.message ? err.message : String(err)) });
          }

          // helper to enrich features with a color property
          function enrichColors(gj) {
            if (!gj || !gj.features) return gj;
            gj.features.forEach(f => {
              const cat = f.properties && f.properties.category ? f.properties.category : '';
              f.properties.color = CATEGORY_COLOR[cat] || colorFromString(cat || (f.properties && f.properties.title ? f.properties.title : ''));
            });
            return gj;
          }

          if (map) {
            map.on('load', () => {
              try {
                // add empty sources: places (features) and user
                map.addSource('places', { type: 'geojson', data: geojson });
                // symbol layer that references images named 'marker-<id>'
                map.addLayer({
                  id: 'places-symbol',
                  type: 'symbol',
                  source: 'places',
                  layout: {
                    // explicit, safer concat
                    'icon-image': ['concat', ['literal', 'marker-'], ['to-string', ['get', 'id']]],
                    'icon-size': 1,
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true
                  }
                });

                // user source/layer (small circle)
                map.addSource('user', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
                map.addLayer({
                  id: 'user-layer',
                  type: 'circle',
                  source: 'user',
                  paint: {
                    'circle-radius': 8,
                    'circle-color': '#007bff',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff'
                  }
                });

                // click handling on places-symbol
                map.on('click', 'places-symbol', function (e) {
                  try {
                    const feat = e.features && e.features[0];
                    if (!feat) return;
                    const coords = feat.geometry.coordinates.slice();
                    const props = feat.properties || {};

                    // send markerClick to react native (we still keep click -> RN modal)
                    send({
                      type: 'markerClick',
                      payload: {
                        id: props.id,
                        title: props.title,
                        category: props.category,
                        description: props.description,
                        images: props.images ? (typeof props.images === 'string' ? JSON.parse(props.images) : props.images) : [],
                        coords: coords
                      }
                    });

                    // NOTE: removed the default Mapbox popup so React Native modal controls the detail UI.
                    // previously: new mapboxgl.Popup(...).setHTML(...).addTo(map);
                  } catch (err) {
                    send({ type: 'log', payload: 'places click handler failed: ' + (err && err.message) });
                  }
                });

                map.on('mouseenter', 'places-symbol', () => map.getCanvas().style.cursor = 'pointer');
                map.on('mouseleave', 'places-symbol', () => map.getCanvas().style.cursor = '');

                send({ type: 'ready' });
                send({ type: 'log', payload: 'map load event fired (symbol layer ready)' });
              } catch (e) {
                send({ type: 'log', payload: 'map.on(load) handler failed: ' + (e && e.message) });
              }
            });

            map.on('error', (e) => {
              try { send({ type: 'log', payload: 'map error: ' + JSON.stringify(e && e.error ? e.error.message : e) }); } catch(e){}
            });

            let initialCentered = false;

            // Reliable image-adding via HTMLImageElement (works better inside WebView than map.loadImage for data: URLs)
            function ensureMarkerImage(name, dataUrl) {
              return new Promise((resolve) => {
                try {
                  if (map.hasImage(name)) { resolve(); return; }
                  const imgEl = new Image();
                  imgEl.onload = function() {
                    try {
                      map.addImage(name, imgEl);
                    } catch (errAdd) {
                      send({ type: 'log', payload: 'map.addImage failed: ' + String(errAdd) });
                      // fallback canvas
                      try {
                        const canvas = document.createElement('canvas');
                        canvas.width = 28; canvas.height = 28;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#007bff';
                        ctx.beginPath(); ctx.arc(14, 10, 6, 0, Math.PI * 2); ctx.fill();
                        map.addImage(name, canvas);
                      } catch (cErr) {}
                    }
                    resolve();
                  };
                  imgEl.onerror = function(err) {
                    send({ type: 'log', payload: 'Image element failed to load for ' + name + ': ' + String(err) });
                    try {
                      const canvas = document.createElement('canvas');
                      canvas.width = 28; canvas.height = 28;
                      const ctx = canvas.getContext('2d');
                      ctx.fillStyle = '#007bff';
                      ctx.beginPath(); ctx.arc(14, 10, 6, 0, Math.PI * 2); ctx.fill();
                      map.addImage(name, canvas);
                    } catch (cErr) {}
                    resolve();
                  };
                  imgEl.src = dataUrl;
                } catch (e) {
                  resolve();
                }
              });
            }

            function updateUserLocation(lat, lng) {
              try {
                const pt = {
                  type: 'FeatureCollection',
                  features: [{
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [lng, lat] },
                    properties: {}
                  }]
                };
                const src = map.getSource('user');
                if (src && src.setData) {
                  src.setData(pt);
                } else {
                  try {
                    map.addSource('user', { type: 'geojson', data: pt });
                  } catch(e){}
                }

                const infoEl = document.getElementById('info');
                if (infoEl) infoEl.innerText = 'User located';

                // center on user once at initial load
                if (!initialCentered) {
                  try {
                    map.setCenter([lng, lat]);
                    map.setZoom(13);
                  } catch (err) {
                    send({ type: 'log', payload: 'Failed to center map on initial user location: ' + String(err) });
                  }
                  initialCentered = true;
                }
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
                  if (lat != null && lng != null) updateUserLocation(lat, lng);
                } else if (data.type === 'centerOn') {
                  // explicit center request from RN
                  const { lat, lng } = data.payload || {};
                  if (lat != null && lng != null) {
                    try {
                      map.flyTo({ center: [lng, lat], zoom: 13 });
                    } catch (err) {
                      send({ type: 'log', payload: 'centerOn flyTo failed: ' + String(err) });
                    }
                  }
                } else if (data.type === 'setInfo') {
                  const infoEl = document.getElementById('info');
                  if (infoEl) infoEl.innerText = data.payload || '';
                } else if (data.type === 'locations') {
                  try {
                    // we expect a FeatureCollection with features having geometry.coordinates = [lng, lat]
                    geojson = data.payload || geojson;
                    geojson = enrichColors(geojson);

                    // prepare and add images for each feature (marker-<id>)
                    const feats = Array.isArray(geojson.features) ? geojson.features : [];
                    const addPromises = feats.map(f => {
                      try {
                        const id = f.properties && (f.properties.id !== undefined ? String(f.properties.id) : undefined);
                        const color = f.properties && f.properties.color ? f.properties.color : '#007bff';
                        if (!id) return Promise.resolve();
                        const name = 'marker-' + id;
                        // create svg and data url
                        const svg = createPinSvg(color);
                        const dataUrl = svgToDataUrl(svg);
                        return ensureMarkerImage(name, dataUrl);
                      } catch (e) { return Promise.resolve(); }
                    });

                    Promise.all(addPromises).then(() => {
                      const src = map.getSource('places');
                      if (src && src.setData) {
                        src.setData(geojson);
                      } else {
                        try {
                          map.addSource('places', { type: 'geojson', data: geojson });
                        } catch(e){}
                      }
                      send({ type: 'log', payload: 'places source updated with ' + feats.length + ' features' });
                    }).catch((err) => {
                      send({ type: 'log', payload: 'Failed to add marker images: ' + String(err) });
                      // still try to set data
                      const src = map.getSource('places');
                      if (src && src.setData) {
                        src.setData(geojson);
                      }
                    });
                  } catch (e) {
                    send({ type:'log', payload: 'setData failed: ' + (e && e.message) });
                  }
                }
              } catch (e) {
                send({ type: 'log', payload: 'onMessage parse error: ' + (e && e.message) });
              }
            }

            document.addEventListener('message', onMessage);
            window.addEventListener('message', onMessage);
          }
        </script>
      </body>
    </html>
  `;
  }, []); // static — no locations dependency

  useEffect(() => {
    if (!webReady) return;
    if (userCoords) postMessageToWeb({ type: "userLocation", payload: userCoords });
    if (cityName) postMessageToWeb({ type: "setInfo", payload: `Ciudad: ${cityName}` });
    // send locations via postMessage — updates markers on the already-mounted map without reloading it
    postMessageToWeb({ type: "locations", payload: geojsonForWeb() });
  }, [webReady, userCoords, cityName, locations]);

  function geojsonForWeb() {
    return {
      type: "FeatureCollection",
      features: locations.map((l) => ({
        type: "Feature",
        properties: { id: l.id, title: l.title, category: l.category, description: l.description, images: l.images },
        geometry: { type: "Point", coordinates: [l.longitude, l.latitude] },
      })),
    };
  }

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

  // center map on user button handler
  const handleCenterOnUser = useCallback(() => {
    if (!userCoords) return;
    // send an explicit center request to the webview (map.flyTo)
    postMessageToWeb({ type: "centerOn", payload: userCoords });
    // also update user marker if needed
    postMessageToWeb({ type: "userLocation", payload: userCoords });
  }, [userCoords]);

  // Render filter chips (native) matching the provided HTML layout
  function RenderFilter() {
    // build display list: Todos + interests
    const chips: { key: string; label: string; slug: string }[] = [
      { key: "all", label: "Todos", slug: "" },
      ...interests.map((it) => ({
        key: String(it.id ?? it.slug ?? it.title),
        label: it.title ?? String(it.slug ?? it.id),
        slug: it.slug ?? "",
      })),
    ];

    return (
      <View style={styles.filterWrap}>
        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>Filtrar por categoría</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {chips.map((c) => {
              const active = selectedInterest === c.slug;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => {
                    setSelectedInterest(c.slug);
                    // fetchLocations will be triggered by effect when selectedInterest changes
                  }}
                  style={[
                    styles.chip,
                    active ? styles.chipActive : styles.chipInactive,
                  ]}
                >
                  <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { flex: 1 }]}>
        {/* WebView (map) fills container */}
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

        {/* Overlayed filter: absolute position on top of map. */}
        <View
          style={[
            styles.filterOverlay,
            {
              top: (insets.top ?? 12) + 8, // keep filter below status bar / notch
              left: 16,
            },
          ]}
        >
          {RenderFilter()}
        </View>

        {/* center on user button: placed above tabbar using bottomInset */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleCenterOnUser}
          style={[
            styles.centerButton,
            {
              right: 16,
              bottom: bottomInset + 74, // moved up so it isn't covered by tabbar (adjust if your tabbar is taller)
            },
          ]}
        >
          <View style={styles.centerOuter}>
            <View style={styles.centerInner} />
          </View>
        </TouchableOpacity>

        {/* loading overlay centered on top of map when loading */}
        {(loadingPosition || !webReady || loadingLocations) && (
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

  // overlay wrapper (positioned dynamically)
  filterOverlay: {
    position: "absolute",
    zIndex: 60,
  },

  // center button
  centerButton: {
    position: "absolute",
    zIndex: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    backgroundColor: "transparent",
  },
  centerOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  centerInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#007bff",
    borderWidth: 2,
    borderColor: "#fff",
  },

  // FILTER styles (matches the provided HTML look)
  filterWrap: {
    width: "100%",
  },
  filterCard: {
    // allow content size to adapt
    maxWidth: 360,
    minWidth: 140,
    height: 74,
    position: "relative",
    overflow: "hidden",
    alignSelf: "flex-start",
    // card background
    backgroundColor: "#fff",
    borderRadius: 13,
    paddingHorizontal: 8,
    paddingTop: 6,
    // shadow
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  filterTitle: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    letterSpacing: 0.14,
    marginLeft: 0,
    marginBottom: 4,
  },
  chipsRow: {
    // space on left like HTML
    paddingLeft: 5,
    paddingRight: 8,
    alignItems: "center",
  },
  chip: {
    minWidth: 50,
    height: 27,
    borderRadius: 14,
    marginRight: 8,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
    // box-shadow
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1 },
    }),
  },
  chipActive: {
    backgroundColor: "#007AFF",
  },
  chipInactive: {
    backgroundColor: "#fff",
  },
  chipText: {
    fontSize: 12,
    lineHeight: 20,
    letterSpacing: 0.12,
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "300",
  },
  chipTextInactive: {
    color: "#000",
    fontWeight: "300",
  },

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
    zIndex: 70,
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
