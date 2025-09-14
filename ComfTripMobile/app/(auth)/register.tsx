import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Platform,
  Alert,
  ActivityIndicator, FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MapSvg } from '@/components/icons/MapSvg';
import { ArrowIcon } from '@/components/icons/ArrowIcon';
import PrimaryButton from '@/components/buttons/PrimaryButton';
import countries from "world-countries";
import { useRouter } from 'expo-router';
import { apiPost, tokenStorage } from '@/helpers/api';

type SimpleCountry = {
  name: string;
  code: string;
};

// Tipos de props del componente
type NationalityDropdownProps = {
  selected: SimpleCountry | null;
  onSelect: (country: SimpleCountry) => void;
};

export default function RegisterScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [nationality, setNationality] = useState<SimpleCountry | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [birthdate, setBirthdate] = useState(''); 
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  // measurements
  const horizontalPadding = Math.round(width * 0.06);
  const topIllustrationHeight = Math.round(Math.max(120, Math.min(220, height * 0.22)));
  const titleFontSize = Math.round(Math.max(20, Math.min(28, width * 0.07)));
  const inputHeight = Math.round(Math.max(44, Math.min(56, width * 0.12)));
  const btnHeight = Math.round(Math.max(44, Math.min(60, width * 0.14)));
  const btnRadius = Math.round(btnHeight * 0.22);

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const onDateChange = (_event: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) {
      setBirthdate(formatDate(selected));
    }
  };

  const countryList: SimpleCountry[] = countries.map(c => ({
    name: c.name.common,
    code: c.cca2,
  }));
  const filteredCountries = countryList.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleNext = async () => {
    if (!name || !email || !password) {
      Alert.alert('Atención', 'Por favor complete los campos requeridos');
      return;
    }
    if (!accepted) {
      Alert.alert('Atención', 'Debe aceptar los términos y condiciones');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        email,
        password,
        password_hash: password,
        nationality: nationality || null,
        birthdate: birthdate || null,
      };

      const res = await apiPost('/auth/register', payload);
      const data = res.data ?? res;

      const token = data?.token || data?.accessToken || data?.jwt || data?.data?.token || null;

      if (token) {
        await tokenStorage.setToken(token);
      } else {
        console.warn('No token found in register response, storing full response for debugging', data);
      }

      router.replace('/interests');
    } catch (err: any) {
      console.error('Register error', err);
      const msg = (err && err.message) || (err && err.error) || JSON.stringify(err) || 'Register failed';
      Alert.alert('Registro fallido', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
        <View style={[styles.topArea, { marginTop: 60 }]}>
          <View style={{ alignItems: 'center', height: topIllustrationHeight }}>
            <MapSvg width={Math.round(width * 2)} height={Math.round(topIllustrationHeight * 1.4)} />
          </View>
        </View>

        <View style={styles.form}>
          <Text style={[styles.title, { fontSize: titleFontSize, marginBottom: 18 }]}>Registrarse</Text>

          <View style={[styles.inputBox, { height: inputHeight }]}>
            <TextInput
              placeholder="Nombre"
              placeholderTextColor="rgba(0,0,0,0.5)"
              value={name}
              onChangeText={setName}
              style={styles.textInput}
            />
          </View>

          <View style={[styles.inputBox, { height: inputHeight, marginTop: 12 }]}>
            <TextInput
              placeholder="Email"
              placeholderTextColor="rgba(0,0,0,0.5)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.textInput}
            />
          </View>

          {/* Input para abrir el dropdown */}

          <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setOpen(!open)}   // 🔥 togglea el menú
              style={[styles.inputBox, { marginTop: 12, justifyContent: 'flex-start', flexDirection: "row", }]}
          >
            <Text style={styles.textInput}>
              {nationality ? nationality.name : "Seleccionar nacionalidad"}
            </Text>
            {/* Flecha rotatoria */} <Text style={[styles.textInput, { marginLeft: 10, transform: [{ rotate: open ? '180deg' : '0deg' }], fontSize: 16, }]}> ▼ </Text>
        </TouchableOpacity>

          {/* Dropdown flotante */}
          {open && (
              <View style={styles.dropdown}>
                <TextInput
                    placeholder="Buscar..."
                    value={search}
                    onChangeText={setSearch}
                    style={[styles.textInput, { borderBottomWidth: 1, borderColor: "#ccc" }]}
                />

                <FlatList
                    data={filteredCountries}
                    keyExtractor={(item) => item.code}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => {
                      const isSelected = nationality?.code === item.code;
                      return (
                          <TouchableOpacity
                              style={[styles.item, isSelected && styles.itemSelected]}
                              onPress={() => {
                                setNationality(item);  // guarda selección
                                setSearch("");         // limpia búsqueda
                                setOpen(false);        // 🔥 cierra dropdown
                              }}
                          >
                            <Text>{item.name}</Text>
                          </TouchableOpacity>
                      );
                    }}
                />
              </View>
          )}


          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowDatePicker(true)}
            style={[styles.inputBox, { height: inputHeight, marginTop: 12, justifyContent: 'center' }]}
          >
            <Text style={styles.textInput}>{birthdate || 'Select birthdate'}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={birthdate ? new Date(birthdate) : new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={onDateChange}
            />
          )}

          <View style={[styles.inputBox, { height: inputHeight, marginTop: 12 }]}>
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="rgba(0,0,0,0.5)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.textInput}
            />
          </View>

          <View style={styles.termsRow}>
            <TouchableOpacity
              onPress={() => setAccepted(!accepted)}
              style={styles.checkbox}
              accessibilityRole="button"
            >
              {accepted && <View style={styles.checkboxTick} />}
            </TouchableOpacity>

            <Text style={styles.termsText}>
              <Text>Al marcar la casilla, acepta nuestros </Text>
              <Text style={styles.link}>Términos</Text>
              <Text> y </Text>
              <Text style={styles.link}>condiciones</Text>
              <Text>.</Text>
            </Text>
          </View>

          <PrimaryButton
            title={loading ? '' : 'Next'}
            onPress={handleNext}
            height={btnHeight}
            borderRadius={btnRadius}
            rightIcon={<ArrowIcon color="#FFFFFF" />}
            style={{ marginTop: 20 }}
          >
            {loading && <ActivityIndicator />}
          </PrimaryButton>

          <View style={styles.loginRow}>
            <Text style={styles.already}>¿Ya eres miembro? </Text>
            <Text style={styles.loginLink} onPress={() => router.push('/login')}>
              Iniciar Sesión
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FCFCFC' },
  container: { flex: 1, paddingTop: Platform.OS === 'android' ? 8 : 0, justifyContent: 'space-between' },

  topArea: { alignItems: 'center' },

  title: { color: '#252525', fontWeight: '800' },

  form: { paddingBottom: 60 },

  inputBox: {
    width: '100%',
    backgroundColor: 'rgba(196,196,196,0.2)',
    borderRadius: 10,
    justifyContent: 'center',
  },
  textInput: { fontSize: 14, color: '#252525', paddingHorizontal:22, paddingVertical: 18, borderRadius: 10 },

  nationInput:{fontSize: 14, color: '#252525', paddingHorizontal:22, paddingVertical: 18, borderRadius: 10,flexDirection: "row",
    position: "absolute",
  },

  termsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, width: '100%' },
  checkbox: { width: 12, height: 12, borderRadius: 3, borderWidth: 1, borderColor: '#CBCBCB', marginRight: 8 },
  checkboxTick: { flex: 1, backgroundColor: '#FF3951', borderRadius: 2 },
  termsText: { fontSize: 9, color: '#252525', flexWrap: 'wrap', flex: 1 },
  link: { color: '#FF3951' },

  nextBtn: {
    width: '100%',
    backgroundColor: '#FF3951',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  nextText: { color: '#FCFCFC', fontSize: 20, fontWeight: '600' },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18, alignItems: 'center' },
  already: { color: '#252525', fontSize: 13, fontWeight: '500' },
  loginLink: { color: '#FF3951', fontSize: 13, fontWeight: '700', marginLeft: 6 },

  dropdown: {

    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,   // iOS
    elevation: 10,  // Android
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#fff",
  },
  itemHover: {
    backgroundColor: "#f0f0f0",
  },
  itemSelected: {
    backgroundColor: "#d0d0d0",
  },
});
