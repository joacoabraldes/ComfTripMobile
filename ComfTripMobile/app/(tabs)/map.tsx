// MapScreen.tsx (fetch locations from backend)
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

const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoibWFuZHJhY2EiLCJhIjoiY21mZnE1dmI0MDlubjJpcG5rYmw3ZnRiZiJ9.RwdRSwXlP1PX_7j7cwUsMA";

// helper that returns a fake placeholder image when needed
const img = (id: string, n = 1) => `https://picsum.photos/seed/${id}-${n}/800/520`;

/**
 * Colors keyed by the display category used in the webview HTML (capitalized).
 * HTML expects keys like CATEGORY_COLOR.Cultura etc, so keep these keys capitalized.
 */
const CATEGORY_COLOR: Record<string, string> = {
  Cultura: "#D9534F",
  Naturaleza: "#28A745",
  Gastronomia: "#F0AD4E",
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

  // New: locations from API
  const [locations, setLocations] = useState<Loc[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingLocations(true);
      try {
        const res = await apiGet("/locations");
        const data = res?.data ?? res;
        if (Array.isArray(data) && mounted) {
          const normalized = data
            .map((r: any): Loc | null => {
              // parse imagenes: could be JSON string or already an array
              let imgs: any = [];
              if (r.imagenes) {
                if (typeof r.imagenes === "string") {
                  try {
                    imgs = JSON.parse(r.imagenes);
                  } catch (err) {
                    // if parsing fails, treat as single-string uri
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

              if (lat === null || lng === null) {
                // skip rows without coordinates
                return null;
              }

              return {
                id: String(r.id),
                title: r.titulo ?? "",
                category: displayCategoryFromFk(r.fk_interest),
                latitude: lat,
                longitude: lng,
                description: r.descripcion ?? "",
                images: Array.isArray(imgs)
                  ? imgs.map((it: any) => (typeof it === "string" ? it : it?.url ?? it?.uri ?? String(it)))
                  : [],
              } as Loc;
            })
            .filter((x): x is Loc => x !== null); // <-- type predicate so TS knows this is Loc[]

          setLocations(normalized);
        } else if (mounted) {
          setLocations([]);
        }
      } catch (err) {
        console.warn("Failed to fetch locations:", err);
        if (mounted) setLocations([]);
      } finally {
        if (mounted) setLoadingLocations(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
    // send updated locations to webview
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

  // Build HTML for WebView. We embed CATEGORY_COLOR and MAPBOX token; locations are embedded as an initial dataset.
  const html = useMemo(() => {
    const initialGeo = JSON.stringify(geojsonForWeb());

    // The embedded HTML now renders DOM markers with inline SVG matching the web app.
    // It keeps CATEGORY_COLOR, but falls back to a hashed HSL color when needed.
    return `<!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
        <style>
          html,body,#map { height:100%; margin:0; padding:0; background: #f8f8f8; }
          #info { position:absolute; z-index:999; left:10px; top:10px; background: rgba(255,255,255,0.95); padding:8px 10px; border-radius:10px; font-family: sans-serif; box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
          .marker-popup { font-family: sans-serif; font-size: 14px; color: #222; }
          .marker-title { font-weight:700; margin-bottom:6px; }
          .rn-marker { display:inline-block; line-height:0; }
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

          const CATEGORY_COLOR = ${JSON.stringify(CATEGORY_COLOR)};
          let geojson = ${initialGeo};

          // fallback color function (hash a string to HSL) if CATEGORY_COLOR doesn't have the key
          function colorFromString(s) {
            if (!s) return '#007bff';
            let h = 0;
            for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
            const hue = Math.abs(h) % 360;
            return 'hsl(' + hue + ' 70% 45%)';
          }

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
            const center = (geojson.features && geojson.features[0]) ? geojson.features[0].geometry.coordinates : [0,0];
            map = new mapboxgl.Map({
              container: 'map',
              style: 'mapbox://styles/mapbox/streets-v11',
              center: center,
              zoom: 12
            });
          } catch (err) {
            send({ type: 'log', payload: 'Map constructor failed: ' + (err && err.message ? err.message : String(err)) });
          }

          // DOM markers (we keep references here so we can remove them on updates)
          let domMarkers = [];

          function clearDomMarkers() {
            try {
              domMarkers.forEach(m => {
                try { m.remove(); } catch(e){}
              });
            } catch(e){}
            domMarkers = [];
          }

          function createSvgPin(color) {
            // returns an SVG string for the pin with a white center, matching web style
            return '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" style="transform:translate(-14px,-28px);"><path d="M12 2C8.1 2 5 5.1 5 9c0 5 7 12 7 12s7-7 7-12c0-3.9-3.1-7-7-7z" fill="' + color + '" /><circle cx="12" cy="9" r="2.3" fill="#fff" /></svg>';
          }

          function renderDomMarkers(geo) {
            try {
              clearDomMarkers();
              if (!geo || !geo.features) return;
              geo.features.forEach(f => {
                try {
                  const coords = f.geometry && f.geometry.coordinates;
                  const props = f.properties || {};
                  const cat = props.category || '';
                  const color = CATEGORY_COLOR[cat] || colorFromString(cat || (props.title || ''));

                  // create wrapper element and set innerSVG
                  const el = document.createElement('div');
                  el.className = 'rn-marker';
                  el.innerHTML = createSvgPin(color);

                  const marker = new mapboxgl.Marker(el).setLngLat(coords).addTo(map);
                  domMarkers.push(marker);

                  // click handler: send message and show popup
                  el.addEventListener('click', (evt) => {
                    try {
                      evt.stopPropagation && evt.stopPropagation();
                      const payload = {
                        id: props.id,
                        title: props.title,
                        category: props.category,
                        description: props.description,
                        images: props.images,
                        coords: coords
                      };
                      send({ type: 'markerClick', payload });

                      const popupHtml = '<div class="marker-popup"><div class="marker-title">' + (props.title || '') + '</div><div>' + (props.category || '') + '</div></div>';
                      new mapboxgl.Popup({ offset: 10 }).setLngLat(coords).setHTML(popupHtml).addTo(map);
                    } catch (err) {
                      send({ type: 'log', payload: 'marker click handler failed: ' + (err && err.message) });
                    }
                  });

                } catch (err) {
                  send({ type: 'log', payload: 'renderDomMarkers feature failed: ' + (err && err.message) });
                }
              });

              // fit bounds if features exist
              if (geo.features.length) {
                try {
                  const bounds = geo.features.reduce((b, f) => b.extend(f.geometry.coordinates), new mapboxgl.LngLatBounds(geo.features[0].geometry.coordinates, geo.features[0].geometry.coordinates));
                  map.fitBounds(bounds.pad(0.25), { animate: false });
                } catch (e) {}
              }
            } catch(e) {
              send({ type: 'log', payload: 'renderDomMarkers failed: ' + (e && e.message) });
            }
          }

          if (map) {
            map.on('load', () => {
              try {
                // render initial DOM markers from embedded geojson
                renderDomMarkers(geojson);
                send({ type: 'ready' });
                send({ type: 'log', payload: 'map load event fired (dom markers)' });
              } catch (e) {
                send({ type: 'log', payload: 'map.on(load) handler failed: ' + (e && e.message) });
              }
            });

            map.on('error', (e) => {
              try { send({ type: 'log', payload: 'map error: ' + JSON.stringify(e && e.error ? e.error.message : e) }); } catch(e){}
            });

            // user location shape handled by messages from RN
            let userMarker = null;
            function updateUserLocation(lat, lng) {
              const lngLat = [lng, lat];
              try {
                if (userMarker) {
                  userMarker.setLngLat(lngLat);
                } else {
                  userMarker = new mapboxgl.Marker({ color: '#007bff' }).setLngLat(lngLat).setPopup(new mapboxgl.Popup().setText('You are here')).addTo(map);
                }

                const allCoords = (geojson.features || []).map(f => f.geometry.coordinates).concat([lngLat]);
                if (allCoords.length) {
                  const bounds = allCoords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]));
                  try {
                    map.fitBounds(bounds.pad(0.25));
                  } catch (e) {}
                }
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
                  try {
                    // update geojson and re-render dom markers
                    geojson = data.payload || geojson;
                    renderDomMarkers(geojson);
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
          } // end if(map)
        </script>
      </body>
    </html>
  `;
  }, [locations]);

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
