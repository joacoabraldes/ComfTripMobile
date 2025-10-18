import PrimaryButton from "@/components/buttons/PrimaryButton";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { apiGet, tokenStorage } from "@/helpers/api";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

// Helper: base64url decode (works in RN / browser)
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

type Profile = {
  id?: number;
  name?: string;
  email?: string;
  nationality?: string | null;
  birthdate?: string | null;
  phone?: string | null;
  interests?: { id: number; title: string }[];
};

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const btnHeight = Math.round(Math.max(44, Math.min(64, width * 0.14)));
  const btnRadius = Math.round(btnHeight * 0.22);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  // helper: try to read token a few times (handles small race where login sets token just before navigation)
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
      await new Promise((res) => setTimeout(res, delayMs));
    }
    return null;
  }, []);

  // load profile (used on focus and mount)
  const loadProfile = useCallback(async () => {
    let mounted = true;
    setLoading(true);
    try {
      const token = await getTokenWithRetries(6, 250);
      if (!token) {
        console.warn("No token found after retries — redirecting to login");
        // small delay to allow screen transition to finish cleanly
        router.replace("/login");
        return;
      }

      // decode token to get user id and fetch /users/:id
      let resp: any = null;
      try {
        const payload = parseJwt(token);
        const userId = payload?.id ?? payload?.userId ?? payload?.sub ?? null;
        if (userId) {
          const r2 = await apiGet(`/users/${userId}`);
          resp = r2?.data ?? r2;
        } else {
          console.warn("No userId in token; can't fetch profile");
        }
      } catch (err2) {
        console.warn("Fetching by id failed:", err2);
      }

      // Normalize shape { user, interests } or direct user object
      if (resp) {
        const userObj = resp.user ?? resp;
        const normalized: Profile = {
          id: userObj?.id,
          name: userObj?.name ?? "Usuario",
          email: userObj?.email ?? "",
          nationality: userObj?.nationality ?? null,
          birthdate: userObj?.birthdate ?? null,
          phone: (userObj?.phone ?? null) as string | null,
          interests: resp.interests ?? userObj?.interests ?? [],
        };
        if (mounted) setProfile(normalized);
      } else {
        // non-fatal: show placeholders if we couldn't fetch but token existed
        if (mounted)
          setProfile({
            name: "Nombre de usuario",
            email: "usuario@example.com",
            phone: "+54 11 1234 5678",
            nationality: null,
            birthdate: null,
            interests: [],
          });
      }
    } catch (err) {
      console.warn("Profile load error:", err);
      if (mounted)
        setProfile({
          name: "Nombre de usuario",
          email: "usuario@example.com",
          phone: "+54 11 1234 5678",
          nationality: null,
          birthdate: null,
          interests: [],
        });
    } finally {
      if (mounted) setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [getTokenWithRetries, router]);

  // run on focus (and on first mount) to always have fresh data when the screen appears
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      (async () => {
        await loadProfile();
      })();

      return () => {
        isActive = false;
      };
    }, [loadProfile])
  );

  async function performLogout() {
    try {
      try {
        // prefer removeToken if helper provides it
        // @ts-ignore
        if (typeof tokenStorage.removeToken === "function") {
          // @ts-ignore
          await tokenStorage.removeToken();
        } else if (typeof tokenStorage.setToken === "function") {
          await tokenStorage.setToken("");
        }
      } catch (e) {
        // ignore inner
        try {
          await tokenStorage.setToken("");
        } catch {}
      }
      // also try to remove AsyncStorage key directly (best-effort)
      try {
        const AsyncStorage = (() => {
          try {
            return require("@react-native-async-storage/async-storage").default;
          } catch {
            return null;
          }
        })();
        if (AsyncStorage) {
          await AsyncStorage.removeItem("token");
        } else if (typeof localStorage !== "undefined") {
          localStorage.removeItem("token");
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.warn("Logout storage cleanup failed", e);
    } finally {
      router.replace("/login");
    }
  }

  function handleLogout() {
    Alert.alert("Cerrar sesión", "¿Estás seguro que quieres cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: performLogout },
    ]);
  }

  function handleEdit() {
    router.push("../(profile)/edit");
  }
  function handleChangePassword() {
    router.push("../(profile)/change-password");
  }

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Format birthdate to DD/MM/YYYY
  function formatDateOnly(d?: string | null) {
    if (!d) return "—";
    const tryParse = (val: any) => {
      try {
        const date = new Date(val);
        if (isNaN(date.getTime())) return null;
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch {
        return null;
      }
    };
    const parsed = tryParse(d);
    if (parsed) return parsed;
    if (typeof d === "string") {
      const short = d.split("T")[0] || d;
      const parsed2 = tryParse(short);
      if (parsed2) return parsed2;
      return short;
    }
    return String(d);
  }

  const displayName = profile.name ?? "Usuario";
  const displayEmail = profile.email ?? "usuario@example.com";
  const displayPhone = profile.phone ?? "+54 11 1234 5678";
  const displayNationality = profile.nationality ?? "—";
  const displayBirthdate = formatDateOnly(profile.birthdate);

  function InfoRow({ label, value, iconName }: { label: string; value: string; iconName?: string }) {
    return (
      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          {iconName ? <IconSymbol name={iconName as any} size={18} color="#666" /> : null}
          <Text style={styles.infoLabel}>{label}</Text>
        </View>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarHalo} />
          <TouchableOpacity activeOpacity={0.8} style={styles.avatar}>
            <IconSymbol name="person.fill" size={82} color="#1E1E1E" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <InfoRow label="Usuario" value={displayName} iconName="person.fill" />
          <InfoRow label="Correo" value={displayEmail} iconName="map.fill" />
          <InfoRow label="Teléfono" value={displayPhone} iconName="airplane" />
          <InfoRow label="Nacionalidad" value={displayNationality} iconName="map.fill" />
          <InfoRow label="Fecha de nacimiento" value={displayBirthdate} iconName="paperplane.fill" />
        </View>

        <View style={styles.actions}>
          <View style={styles.buttonRow}>
            <PrimaryButton
              title="Editar mi perfil"
              onPress={handleEdit}
              height={48}
              borderRadius={10}
              style={{ width: 220 }}
            />
          </View>

          <View style={[styles.buttonRow, { marginTop: 14 }]}>
            <PrimaryButton
              title="Cambiar contraseña"
              onPress={handleChangePassword}
              height={48}
              borderRadius={10}
              style={{ width: 240 }}
            />
          </View>
        </View>

        <View style={styles.logoutWrap}>
          <PrimaryButton
            title="Cerrar Sesión"
            onPress={handleLogout}
            height={52}
            borderRadius={31}
            style={{ width: 220 }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const RED = "#FF3951";

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FCFCFC" },
  container: { flex: 1, alignItems: "center", justifyContent: "flex-start" },

  avatarWrap: {
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 220,
  },
  avatarHalo: {
    position: "absolute",
    width: 185,
    height: 185,
    borderRadius: 9999,
    backgroundColor: "rgba(255,57,81,0.15)",
    top: 8,
  },
  avatar: {
    width: 124,
    height: 132,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  infoCard: {
    width: "92%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EEE",
  },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { color: "#888", fontSize: 13, marginLeft: 8 },
  infoValue: { color: "#111", fontSize: 16, fontWeight: "600" },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
    marginTop: 6,
  },
  interestsText: {
    textAlign: "center",
    color: "#555",
    fontSize: 14,
    paddingHorizontal: 12,
  },

  actions: {
    marginTop: 14,
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
  },
  buttonRow: {
    alignItems: "center",
    justifyContent: "center",
  },

  logoutWrap: {
    position: "absolute",
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
});
