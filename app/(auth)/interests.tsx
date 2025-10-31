// app/(auth)/interests.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonStyles } from '@/constants/Styles';
import PrimaryButton from "@/components/buttons/PrimaryButton";
import { apiGet, apiPost, tokenStorage } from "@/helpers/api";
import { useRouter } from "expo-router";
import { Asset } from "expo-asset"; // <-- expo-asset for preloading

// --- images mapping (local assets) ---
const IMAGES: Record<string, any> = {
  cultura: require("../../assets/images/interests/Cultura.png"),
  gastronomia: require("../../assets/images/interests/Gastronomia.png"),
  naturaleza: require("../../assets/images/interests/Naturaleza.png"),
  compras: require("../../assets/images/interests/compras.png"),
  deportes: require("../../assets/images/interests/deportes.png"),
  familia: require("../../assets/images/interests/familia.png"),
  fiestas: require("../../assets/images/interests/fiestas.png"),
  relax: require("../../assets/images/interests/relax.png"),
};

const defaultImage = require("../../assets/images/icon.png");

const getImageSource = (slug?: string) => {
  if (!slug) return defaultImage;
  const key = String(slug).trim().toLowerCase();
  if (IMAGES[key]) return IMAGES[key];
  return defaultImage;
};

const wait = (ms = 250) => new Promise((res) => setTimeout(res, ms));

function base64UrlDecode(input: string) {
  try {
    let s = input.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    if (typeof atob !== "undefined") return atob(s);
    // node / buffer fallback
    // @ts-ignore
    const Buffer = require("buffer").Buffer;
    return Buffer.from(s, "base64").toString("utf8");
  } catch (e) {
    return null;
  }
}
function parseJwt(token: string | null) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const decoded = base64UrlDecode(parts[1]);
    if (!decoded) return null;
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

type ServerInterest = { id: number; slug: string; title?: string; description?: string };

const { width } = Dimensions.get("window"); // kept in top-level

// ---------- Memoized Card Component ----------
const ITEM_IMAGE_SIZE = 96;

const InterestCard = React.memo(function InterestCard({
  item,
  onToggle,
  isSelected,
  imageFailed,
}: {
  item: ServerInterest;
  onToggle: (slug: string) => void;
  isSelected: boolean;
  imageFailed?: boolean;
}) {
  const [imgLoading, setImgLoading] = useState(true);
  const imageSource = imageFailed ? defaultImage : getImageSource(item.slug);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onToggle(item.slug)}
      style={[styles.card, isSelected && styles.cardSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <View style={{ width: ITEM_IMAGE_SIZE, height: ITEM_IMAGE_SIZE, marginRight: 14 }}>
        <Image
          source={imageSource}
          style={styles.image}
          resizeMode="cover"
          onLoadEnd={() => setImgLoading(false)}
          onError={() => {
            setImgLoading(false);
            // parent will mark as failed through onToggle flow if you want;
            // but we still show fallback image
          }}
        />
        {imgLoading && (
          <View style={[styles.image, styles.imageLoader]}>
            <ActivityIndicator />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={3}>
          {item.description}
        </Text>
      </View>
      {isSelected && (
        <View style={styles.checkBadge}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ---------- Main Screen ----------
export default function InterestsScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [interests, setInterests] = useState<ServerInterest[]>([]);
  const [imageLoadFailed, setImageLoadFailed] = useState<Record<string, boolean>>({});
  const [assetsReady, setAssetsReady] = useState(false);

  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setFetching(true);
      try {
        const res = await apiGet("/users/interests");
        const data = res?.data ?? res;
        if (Array.isArray(data) && mounted) {
          const normalized = data.map((d: any) => ({
            id: d.id,
            slug:
              d.slug ??
              (d.title ? String(d.title).toLowerCase().replace(/\s+/g, "-") : ""),
            title: d.title ?? d.slug ?? "",
            description: d.description ?? "",
          }));
          setInterests(normalized);
        } else if (mounted) {
          setInterests([]);
        }
      } catch (err) {
        console.warn("Failed to fetch interests:", err);
        setInterests([]);
      } finally {
        if (mounted) setFetching(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Preload local images with expo-asset **after** interests are fetched
  useEffect(() => {
    let mounted = true;
    const preload = async () => {
      try {
        // gather unique modules to load (local assets returned by require(...))
        const modules: any[] = [];
        // always include defaultImage
        modules.push(defaultImage);
        for (const it of interests) {
          const src = getImageSource(it.slug);
          if (!modules.includes(src)) modules.push(src);
        }
        if (modules.length > 0) {
          // Asset.loadAsync will cache & decode bundled images
          await Asset.loadAsync(modules);
        }
        if (mounted) setAssetsReady(true);
      } catch (e) {
        console.warn("Asset preload failed:", e);
        if (mounted) setAssetsReady(true);
      }
    };

    // Only preload when we actually have interests
    if (interests.length > 0) {
      preload();
    } else {
      setAssetsReady(true); // nothing to preload
    }

    return () => {
      mounted = false;
    };
  }, [interests]);

  const toggleInterest = useCallback((slug: string) => {
    setSelected((prev) => (prev.includes(slug) ? prev.filter((i) => i !== slug) : [...prev, slug]));
  }, []);

  // mark image load failure to show fallback persistently if needed
  const onImageError = useCallback((slug: string) => {
    setImageLoadFailed((s) => ({ ...s, [slug]: true }));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ServerInterest }) => (
      <InterestCard
        item={item}
        onToggle={toggleInterest}
        isSelected={selected.includes(item.slug)}
        imageFailed={Boolean(imageLoadFailed[item.slug])}
      />
    ),
    [selected, imageLoadFailed, toggleInterest]
  );

  const keyExtractor = useCallback((i: ServerInterest) => String(i.id ?? i.slug), []);

  const getTokenWithRetries = useCallback(async (attempts = 6, delayMs = 250) => {
    for (let i = 0; i < attempts; i++) {
      try {
        const t = await tokenStorage.getToken();
        if (t) return t;
      } catch (e) {
        // ignore
      }
      // small wait
      // eslint-disable-next-line no-await-in-loop
      await wait(delayMs);
    }
    return null;
  }, []);

  const handleSaveInterests = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const token = await getTokenWithRetries(6, 250);
      if (!token) {
        Alert.alert("Atención", "No se encontró sesión activa. Por favor inicia sesión nuevamente.");
        router.replace("/login");
        return;
      }

      let userId: number | string | null = null;
      try {
        const payload = parseJwt(token);
        userId = payload?.id ?? payload?.userId ?? payload?.sub ?? null;
      } catch (e) {
        console.warn("parseJwt failed:", e);
      }

      const selectedIds: number[] = [];
      for (const slug of selected) {
        const match = interests.find((s) => (s.slug ?? "").trim().toLowerCase() === slug.trim().toLowerCase());
        if (match?.id) selectedIds.push(match.id);
      }

      const payloadBody = selectedIds.length > 0 ? { interestIds: selectedIds } : { interestSlugs: selected };

      let postRes: any = null;
      try {
        if (userId) {
          postRes = await apiPost(`/users/${userId}/interests`, payloadBody);
        } else {
          postRes = await apiPost("/users/interests", payloadBody);
        }
      } catch (e) {
        console.warn("apiPost to save interests failed:", e);
      }

      const postData = postRes?.data ?? postRes;
      const success = (postRes && postRes.status >= 200 && postRes.status < 300) || Boolean(postData && (postData.message || postData.success));

      if (success) {
        Alert.alert("Listo", "Intereses guardados correctamente");
        router.replace("/home");
      } else {
        console.warn("Save interests unexpected response:", postRes);
        Alert.alert("Error", "No se pudieron guardar los intereses. Revisa la consola para más detalles.");
      }
    } catch (err: any) {
      console.error("Error saving interests:", err);
      const msg = (err && err.message) || JSON.stringify(err) || "Error al guardar intereses";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  // While fetching OR while we are preloading assets, show spinner
  const showLoadingList = fetching || !assetsReady;

  return (
    <SafeAreaView style={CommonStyles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Seleccione sus intereses</Text>

        {showLoadingList ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <ActivityIndicator size="large" />
            <Text style={{ color: "#6f6f6f", marginTop: 8 }}>Cargando recursos...</Text>
          </View>
        ) : (
          <FlatList
            data={interests}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", marginTop: 24 }}>
                <Text style={{ color: "#6f6f6f" }}>No hay intereses disponibles.</Text>
              </View>
            }
            // performance tuning
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={7}
            removeClippedSubviews={true}
          />
        )}

        <PrimaryButton
          title={selected.length ? `Continuar (${selected.length})` : "Continuar"}
          onPress={handleSaveInterests}
          height={52}
          borderRadius={12}
          style={{ marginTop: 12 }}
          disabled={selected.length === 0 || loading}
        >
          {loading && <ActivityIndicator />}
        </PrimaryButton>

        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12, color: "#252525" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
  },
  cardSelected: { borderColor: "#FF3951", backgroundColor: "#FFF5F6" },
  image: { width: ITEM_IMAGE_SIZE, height: ITEM_IMAGE_SIZE, borderRadius: 10, backgroundColor: "#EDEDED" },
  imageLoader: {
    position: "absolute",
    left: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1E1E1E", marginBottom: 6 },
  cardSubtitle: { fontSize: 13, color: "#6F6F6F", lineHeight: 18 },
  checkBadge: {
    position: "absolute",
    right: 12,
    top: 12,
    backgroundColor: "#FF3951",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  checkText: { color: "#fff", fontSize: 16, fontWeight: "700", lineHeight: 18 },
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
