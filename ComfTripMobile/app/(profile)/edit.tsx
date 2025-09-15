// moved from EditProfileScreen.tsx
import DateTimePicker from "@react-native-community/datetimepicker";
import countries from "world-countries";
import PrimaryButton from "@/components/buttons/PrimaryButton";
import { apiGet, apiPut, tokenStorage } from "@/helpers/api";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Platform, FlatList,
} from "react-native";

export const options = {
  headerShown: false,
};

type SimpleCountry = {
  name: string;
  code: string;
};

function parseJwt(token: string | null) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let s = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    let decoded = null;
    if (typeof atob !== "undefined") {
      decoded = atob(s);
    } else {
      // @ts-ignore
      const Buffer = require("buffer").Buffer;
      decoded = Buffer.from(s, "base64").toString("utf8");
    }
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

// Format for display: DD/MM/YYYY
function formatDateForDisplay(d?: Date | null) {
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Convert Date to ISO date YYYY-MM-DD for API
function dateToISODate(d?: Date | null) {
  if (!d) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export default function EditProfileScreen() {
  const router = useRouter();
  // Get userId from token as in profile.tsx
  const [userId, setUserId] = useState<string | number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [nationality, setNationality] = useState<SimpleCountry | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // birthdate state now as Date | null (for picker) and display string
  const [birthdateDate, setBirthdateDate] = useState<Date | null>(null);
  const [birthdateDisplay, setBirthdateDisplay] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // DateTimePicker visibility (for Android modal / iOS inline)
  const [showPicker, setShowPicker] = useState(false);

  const countryList: SimpleCountry[] = countries.map(c => ({
    name: c.name.common,
    code: c.cca2,
  }));

  const filteredCountries = countryList.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    (async () => {
      setInitialLoading(true);
      try {
        const token = await tokenStorage.getToken();
        if (!token) throw new Error("No token");
        const payload = parseJwt(token);
        const id = payload?.id ?? payload?.userId ?? payload?.sub ?? null;
        setUserId(id);
        if (!id) throw new Error("No userId in token");
        const res = await apiGet(`/users/${id}`);
        const user = res.data?.user ?? res.data ?? res;

        setName(user.name || "");
        setEmail(user.email || "");
        setPhone(user.phone || "");
        const rawNationality: string = user.nationality || "";
        const matched = countryList.find(c => c.name === rawNationality) || null;
        setNationality(matched);

        // parse birthdate into Date if possible
        const raw = user.birthdate || "";
        let parsed: Date | null = null;
        if (raw) {
          // try to parse several common formats (ISO or date-only)
          const tryDate = (val: any) => {
            try {
              const d = new Date(val);
              if (!isNaN(d.getTime())) return d;
              return null;
            } catch {
              return null;
            }
          };
          parsed = tryDate(raw) ?? null;
        }
        setBirthdateDate(parsed);
        setBirthdateDisplay(parsed ? formatDateForDisplay(parsed) : raw || "");
      } catch (err) {
        // fallback: leave fields empty
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  // Handler from the DateTimePicker
  function onChangeDate(event: any, selected?: Date | undefined) {
    // selected is undefined when user cancels on Android
    if (selected) {
      setBirthdateDate(selected);
      setBirthdateDisplay(formatDateForDisplay(selected));
    }
    // On Android the picker is modal: hide after selection/cancel
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      const token = await tokenStorage.getToken();
      if (!token) throw new Error("No token");
      if (!userId) throw new Error("No userId");
      const res = await apiPut(`/users/${userId}`, {
        name,
        email,
        phone,
        nationality: nationality?.name || "",
        // send ISO date (YYYY-MM-DD) if we have one, otherwise empty string
        birthdate: birthdateDate ? dateToISODate(birthdateDate) : birthdateDisplay || "",
      });
      Alert.alert("Perfil actualizado", res.data?.message || "");
      // go back; profile screen listens for focus and will reload
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "No se pudo actualizar el perfil");
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Editar Perfil</Text>

        <TextInput style={styles.input} placeholder="Nombre" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Correo" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Teléfono" value={phone} onChangeText={setPhone} />


        {/* Input para abrir el dropdown */}
        {!open ? (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setOpen(!open)}
                style={[styles.inputBox, { justifyContent: 'flex-start', flexDirection: "row"}]}
            >
              <Text style={[styles.textInput, {color: nationality? "black" : "rgba(0,0,0,0.5)"}]}>
                {nationality ? nationality.name : "Nacionalidad"}
              </Text>
              <Text style={[styles.textInput, { marginLeft: "auto", fontSize: 16 }]}> ▼ </Text>
            </TouchableOpacity>
        ) : (
            <View style={styles.dropdown}>
              <View style={[styles.inputBox, {marginBottom:0 , flexDirection: "row", alignItems: "center", borderColor: "black", backgroundColor: "white", borderWidth: 2 }]}>
                <TextInput
                    style={[styles.textInput, { flex:1, borderWidth:0, outline:"none" }]}
                    placeholder={nationality? nationality.name : "Nacionalidad"}
                    value={search}
                    onChangeText={setSearch}
                />
                <Text
                    style={{ fontSize: 16, marginLeft: "auto" }}
                    onPress={() => setOpen(false)}
                >
                  ▲
                </Text>
              </View>

              <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item.code}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => {
                    const isSelected = nationality?.code === item.code;
                    return (
                        <TouchableOpacity
                            style={[styles.item,
                              isSelected && styles.itemSelected]}
                            onPress={() => {
                              setNationality(item);
                              setSearch("");
                              setOpen(false);
                            }}
                        >
                          <Text>{item.name}</Text>
                        </TouchableOpacity>
                    );
                  }}
              />
            </View>
        )}

        {/* Birthdate field: tap to open native picker */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowPicker(true)}
          style={[styles.input, styles.dateInput]}
        >
          <Text style={[styles.dateText, !birthdateDisplay && styles.placeholderText]}>
            {birthdateDisplay || "Fecha de nacimiento"}
          </Text>
        </TouchableOpacity>

        {/* DateTimePicker: rendered conditionally */}
        {showPicker && (
          <DateTimePicker
            value={birthdateDate ?? new Date()}
            mode="date"
            display={Platform.select({ ios: "spinner", android: "calendar" })}
            maximumDate={new Date()} // birthdate can't be in the future
            onChange={onChangeDate}
          />
        )}

        <PrimaryButton title={loading ? "Guardando..." : "Guardar"} onPress={handleSave} style={{ marginTop: 24 }} disabled={loading} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FCFCFC" },
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 18 },
  input: {
    backgroundColor: "#F2F2F2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },

  inputBox: {
    backgroundColor: 'rgba(196,196,196,0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    justifyContent: 'center' },

  textInput: { fontSize: 16, color: '#252525', borderRadius: 8},
  dateInput: {
    // make the TouchableOpacity look like the other inputs
    justifyContent: "center",
  },
  dateText: {
    fontSize: 16,
    color: "#111",
  },
  placeholderText: {
    color: "#999",
  },

  dropdown: { left: 0, right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 10,
    marginBottom: 12,},

  item: { flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: "#fff" },
  itemHover: { backgroundColor: "#f0f0f0" },
  itemSelected: { backgroundColor: "#d0d0d0" },
});
