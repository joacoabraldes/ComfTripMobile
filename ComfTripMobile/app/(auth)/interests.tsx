// app/(auth)/interests.tsx
import React, { useCallback, useState } from "react";
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

/**
 * Helper: base64url decode (works in RN / browser)
 */
function base64UrlDecode(input: string) {
  try {
    let s = input.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    if (typeof atob !== "undefined") {
      return atob(s);
    }
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

/**
 * Small wait helper
 */
const wait = (ms = 250) => new Promise((res) => setTimeout(res, ms));

const INTERESTS = [
  {
    title: "Cultura y Entretenimiento",
    subtitle:
      "Museos, arte y exposiciones • Historia y patrimonio • Música en vivo • Cine y teatro • Festivales y eventos locales",
    image: require("../../assets/images/interests/Cultura.png"),
  },
  {
    title: "Naturaleza y Aire Libre",
    subtitle:
      "Parques y plazas • Senderismo • Playas y ríos • Miradores • Actividades al aire libre",
    image: require("../../assets/images/interests/Naturaleza.png"),
  },
  {
    title: "Gastronomía",
    subtitle:
      "Restaurantes • Cafeterías y bares • Comida callejera • Bodegas • Experiencias gourmet",
    image: require("../../assets/images/interests/Gastronomia.png"),
  },
  {
    title: "Compras y Paseos",
    subtitle:
      "Ferias y mercados • Centros comerciales • Tiendas de diseño • Artesanías • Outlets",
    image: require("../../assets/images/icon.png"),
  },
  {
    title: "Vida Nocturna",
    subtitle: "Bares y pubs • Boliches • Shows nocturnos • Rooftops",
    image: require("../../assets/images/icon.png"),
  },
  {
    title: "Deportes y Actividades",
    subtitle:
      "Gimnasios • Fútbol y básquet • Deportes acuáticos • Escalada • Patinaje",
    image: require("../../assets/images/icon.png"),
  },
  {
    title: "Bienestar y Relax",
    subtitle: "Spas • Yoga • Meditación • Termas • Masajes",
    image: require("../../assets/images/icon.png"),
  },
  {
    title: "Plan Familiar",
    subtitle: "Parques de diversiones • Zoológicos • Actividades con niños",
    image: require("../../assets/images/icon.png"),
  },
];

export default function InterestsScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { width } = Dimensions.get("window");

  const toggleInterest = (title: string) => {
    setSelected((prev) =>
      prev.includes(title) ? prev.filter((i) => i !== title) : [...prev, title]
    );
  };

  const renderItem = ({ item }: { item: typeof INTERESTS[0] }) => {
    const isSelected = selected.includes(item.title);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => toggleInterest(item.title)}
        style={[styles.card, isSelected && styles.cardSelected]}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        <Image source={item.image} style={styles.image} resizeMode="cover" />

        <View style={styles.content}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={3}>
            {item.subtitle}
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
   * mirrors the pattern used in your ProfileScreen example
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
      // 1) get token (with retries)
      const token = await getTokenWithRetries(6, 250);
      if (!token) {
        Alert.alert("Atención", "No se encontró sesión activa. Por favor inicia sesión nuevamente.");
        router.replace("/login");
        return;
      }

      // 2) decode token to try to obtain userId
      let userId: number | string | null = null;
      try {
        const payload = parseJwt(token);
        userId = payload?.id ?? payload?.userId ?? payload?.sub ?? null;
      } catch (e) {
        console.warn("parseJwt failed:", e);
      }

      // 4) fetch server interests list to map titles -> ids
      let serverInterests: Array<{ id: number; title?: string; slug?: string }> = [];
      try {
        const res = await apiGet("/users/interests");
        const data = res?.data ?? res;
        if (Array.isArray(data)) serverInterests = data;
      } catch (e) {
        // non-fatal: backend may not expose that endpoint or helper may not exist
        console.warn("apiGet('/users/interests') failed:", e);
      }

      // 5) map selected titles to server IDs (case-insensitive)
      const mapTitle = (t?: string) => (t ? t.trim().toLowerCase() : "");
      const selectedIds: number[] = [];
      for (const title of selected) {
        const match = serverInterests.find(
          (s) => mapTitle(s.title) === mapTitle(title) || mapTitle(s.slug) === mapTitle(title)
        );
        if (match?.id) selectedIds.push(match.id);
      }

      // 6) prepare payload. Prefer interestIds if mapped; otherwise send names fallback
      const payload = selectedIds.length > 0 ? { interestIds: selectedIds } : { interestNames: selected };

      // 7) perform POST to /users/:id/interests (preferred) or fallback to /users/interests
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
      const success =
        (postRes && postRes.status >= 200 && postRes.status < 300) ||
        Boolean(postData && (postData.message || postData.success));

      if (success) {
        Alert.alert("Listo", "Intereses guardados correctamente");
        router.replace("/home");
      } else {
        console.warn("Save interests unexpected response:", postRes);
        Alert.alert(
          "Error",
          "No se pudieron guardar los intereses. Revisa la consola para más detalles."
        );
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

        <FlatList
          data={INTERESTS}
          renderItem={renderItem}
          keyExtractor={(i) => i.title}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        />

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
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    color: "#252525",
  },

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
  cardSelected: {
    borderColor: "#FF3951",
    backgroundColor: "#FFF5F6",
  },

  image: {
    width: 96,
    height: 96,
    borderRadius: 10,
    marginRight: 14,
    backgroundColor: "#EDEDED",
  },

  content: {
    flex: 1,
    justifyContent: "center",
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1E1E",
    marginBottom: 6,
  },

  cardSubtitle: {
    fontSize: 13,
    color: "#6F6F6F",
    lineHeight: 18,
  },

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
  checkText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },

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
