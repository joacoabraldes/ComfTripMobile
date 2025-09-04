// app/(auth)/interests.tsx
import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Image,
} from "react-native";
import PrimaryButton from "@/components/buttons/PrimaryButton";
import { useRouter } from "expo-router";

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
    // fallback image until you add a dedicated one:
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
        {/* local image (require) -> pass directly as source */}
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
          onPress={() => router.replace("/home")}
          height={52}
          borderRadius={12}
          style={{ marginTop: 12 }}
          disabled={selected.length === 0}
        />
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
});
