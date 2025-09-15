// app/(auth)/interests.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
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
import PrimaryButton from "@/components/buttons/PrimaryButton";
import { apiGet, apiPost, tokenStorage } from "@/helpers/api";
import { useRouter } from "expo-router";


const IMAGES: Record<string, any> = {
  cultura: require("../../assets/images/interests/cultura.png"),
  gastronomia: require("../../assets/images/interests/gastronomia.png"),
  naturaleza: require("../../assets/images/interests/naturaleza.png"),
  // Add more mappings here as you add files to app/assets/images/interests
};

const getImageSource = (slug?: string) => {
  if (!slug) return defaultImage;
  const key = String(slug).trim().toLowerCase();
  if (IMAGES[key]) return IMAGES[key];

    return defaultImage;
};

// Local fallback icon (should exist in your repo)
const defaultImage = require("../../assets/images/icon.png");

/**
 * Small wait helper used when retrieving the token
 */
const wait = (ms = 250) => new Promise((res) => setTimeout(res, ms));

/**
 * JWT helpers (copied from your original file)
 */
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

export default function InterestsScreen() {
  const [selected, setSelected] = useState<string[]>([]); // selected slugs
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [interests, setInterests] = useState<ServerInterest[]>([]);
  const [imageLoadFailed, setImageLoadFailed] = useState<Record<string, boolean>>({});

  const router = useRouter();
  const { width } = Dimensions.get("window");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setFetching(true);
      try {
        // User requested GET /api/users/interests
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

  const toggleInterest = (slug: string) => {
    setSelected((prev) => (prev.includes(slug) ? prev.filter((i) => i !== slug) : [...prev, slug]));
  };

  const renderItem = ({ item }: { item: ServerInterest }) => {
    const isSelected = selected.includes(item.slug);
    const imageSource = getImageSource(item.slug);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => toggleInterest(item.slug)}
        style={[styles.card, isSelected && styles.cardSelected]}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        <Image
          source={imageSource}
          style={styles.image}
          resizeMode="cover"
          onError={() => {
            // mark this slug as failed so we show the local fallback next time
            setImageLoadFailed((s) => ({ ...s, [item.slug]: true }));
          }}
        />
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
  };

  /**
   * Try to read token a few times (handles small race where login sets token just before navigation)
   */
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

      // Map selected slugs -> ids using the already-fetched interests
      const selectedIds: number[] = [];
      for (const slug of selected) {
        const match = interests.find((s) => (s.slug ?? "").trim().toLowerCase() === slug.trim().toLowerCase());
        if (match?.id) selectedIds.push(match.id);
      }

      const payload = selectedIds.length > 0 ? { interestIds: selectedIds } : { interestSlugs: selected };

      let postRes: any = null;
      try {
        if (userId) {
          postRes = await apiPost(`/users/${userId}/interests`, payload);
        } else {
          postRes = await apiPost("/users/interests", payload);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Seleccione sus intereses</Text>

        {fetching ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            data={interests}
            renderItem={renderItem}
            keyExtractor={(i) => i.slug || String(i.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", marginTop: 24 }}>
                <Text style={{ color: "#6f6f6f" }}>No hay intereses disponibles.</Text>
              </View>
            }
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
  safeArea: { flex: 1, backgroundColor: "#FCFCFC" },
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
  image: { width: 96, height: 96, borderRadius: 10, marginRight: 14, backgroundColor: "#EDEDED" },
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
