// app/(tabs)/explore.tsx
import { apiGet } from '@/helpers/api';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

type Category = {
  id: number;
  title: string;
  slug: string;
};

type Location = {
  id: number;
  titulo?: string;
  title?: string;
  descripcion?: string;
  imagenes?: any;
  images?: any;
  fk_interest?: string | number;
  interest?: string | number;
  relevancia?: number;
  latitude?: number | string;
  longitude?: number | string;
};

type Experience = {
  id: number;
  title: string;
  description: string;
  category: string | number | null;
  image: string | null;
  raw: Location;
};

/**
 * Robust image parser
 * Accepts:
 * - null/undefined
 * - array of strings
 * - array of objects [{ url }]
 * - JSON-stringified array or string
 * - comma-separated string
 * - object with .url or .urls
 */
const safeParseImages = (im: any): string[] => {
  if (!im) return [];
  if (Array.isArray(im)) {
    return im
      .map((it) => {
        if (!it) return null;
        if (typeof it === 'string') return it;
        if (typeof it === 'object') return it.url ?? it.src ?? it.image ?? null;
        return String(it);
      })
      .filter(Boolean) as string[];
  }
  if (typeof im === 'string') {
    // try JSON
    try {
      const parsed = JSON.parse(im);
      if (Array.isArray(parsed)) {
        return parsed
          .map((it) => (typeof it === 'object' && it !== null ? it.url ?? it.src ?? it.image ?? String(it) : String(it)))
          .filter(Boolean);
      }
      // parsed is primitive
      return [String(parsed)];
    } catch (e) {
      // fallback: comma separated
      if (im.includes(',')) return im.split(',').map((s) => s.trim()).filter(Boolean);
      return [im];
    }
  }
  if (typeof im === 'object' && im !== null) {
    if (Array.isArray((im as any).urls)) return (im as any).urls;
    if ((im as any).url) return [(im as any).url];
    if ((im as any).src) return [(im as any).src];
  }
  return [];
};

/** Choose a small/thumbnail URL when possible */
const pickBestImage = (imgs: string[] = []): string | null => {
  if (!Array.isArray(imgs) || imgs.length === 0) return null;
  const urls = imgs.filter(Boolean).map((u) => String(u));
  // prefer Wikimedia /thumb/
  const thumb = urls.find((u) => u.includes('/thumb/'));
  if (thumb) return thumb;
  // prefer things like /330px-
  const smallPx = urls.find((u) => /\/\d+px-/.test(u));
  if (smallPx) return smallPx;
  // many apis: [full, thumb]
  if (urls[1]) return urls[1];
  return urls[0] || null;
};

function sortByRelevanceDesc(arr?: Location[]) {
  if (!Array.isArray(arr)) return [];
  return [...arr].sort((a, b) => (Number(b.relevancia ?? 0) - Number(a.relevancia ?? 0)));
}

export default function ExploreScreen() {
  const router = useRouter();

  // server-driven
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularLocations, setPopularLocations] = useState<Location[]>([]);
  const [locationsFiltered, setLocationsFiltered] = useState<Location[]>([]);

  // ui & state
  const [initialLoading, setInitialLoading] = useState(true); // categories
  const [locationsLoading, setLocationsLoading] = useState(true); // grid
  const [error, setError] = useState<string | null>(null);

  // keep both slug and id for category selection (use id when calling backend)
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('todo');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);

  // INITIAL LOAD: fetch categories fast, then fetch locations in background
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        // categories first (so UI appears quickly)
        const catsResp = await apiGet('/interests');
        const cats = Array.isArray(catsResp?.data || catsResp) ? (catsResp?.data || catsResp) : [];
        if (!mounted) return;
        setCategories(cats);

        // now fetch locations (background)
        setLocationsLoading(true);
        try {
          const locsResp = await apiGet('/locations?limit=200');
          const locs = Array.isArray(locsResp?.data || locsResp) ? (locsResp?.data || locsResp) : [];
          if (!mounted) return;
          const sorted = sortByRelevanceDesc(locs);
          setPopularLocations(sorted.slice(0, 12));
          setLocationsFiltered(sorted.slice(0, 50));
        } catch (locErr) {
          console.error('Locations fetch error', locErr);
          if (!mounted) return;
          setPopularLocations([]);
          setLocationsFiltered([]);
          setError('No se pudieron cargar las localidades.');
        } finally {
          if (mounted) setLocationsLoading(false);
        }
      } catch (catErr) {
        console.error('Categories fetch error', catErr);
        if (!mounted) return;
        setCategories([]);
        setError('No se pudieron cargar las categorías.');
        setLocationsLoading(false);
      } finally {
        if (mounted) setInitialLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // When category changes, fetch filtered (only updates grid, doesn't block categories)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        setLocationsLoading(true);
        if (selectedCategorySlug === 'todo' || !selectedCategoryId) {
          const locsResp = await apiGet('/locations?limit=200');
          const locs = Array.isArray(locsResp?.data || locsResp) ? (locsResp?.data || locsResp) : [];
          if (!mounted) return;
          const sorted = sortByRelevanceDesc(locs);
          setLocationsFiltered(sorted.slice(0, 50));
        } else {
          // use id for backend if available
          const locsResp = await apiGet(`/locations?interest=${encodeURIComponent(String(selectedCategoryId))}&limit=200`);
          const locs = Array.isArray(locsResp?.data || locsResp) ? (locsResp?.data || locsResp) : [];
          if (!mounted) return;
          const sorted = sortByRelevanceDesc(locs);
          setLocationsFiltered(sorted);
        }
      } catch (err) {
        console.error('Error fetching filtered locations:', err);
        if (!mounted) return;
        setLocationsFiltered([]);
        setError('No se pudieron cargar las localidades filtradas.');
      } finally {
        if (mounted) setLocationsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedCategorySlug, selectedCategoryId]);

  const mapToExperiences = (locs: Location[]): Experience[] => {
    if (!Array.isArray(locs)) return [];
    return locs.map((loc) => {
      const imgs = safeParseImages(loc.imagenes ?? loc.images);
      const thumb = pickBestImage(imgs);
      const rawTitle = (loc.title ?? loc.titulo) || `Lugar #${loc.id}`;
      const rawDesc = (loc.descripcion ?? '') as string;
      const truncated = rawDesc && rawDesc.length > 150 ? rawDesc.slice(0, 150) + '…' : rawDesc;
      return {
        id: loc.id as number,
        title: rawTitle,
        description: truncated,
        category: loc.fk_interest ?? loc.interest ?? null,
        image: thumb,
        raw: loc,
      };
    });
  };

  const popularExperiences = useMemo(() => mapToExperiences(popularLocations), [popularLocations]);
  const filteredExperiences = useMemo(() => mapToExperiences(locationsFiltered), [locationsFiltered]);

  const onCategoryClick = (cat: Category | null) => {
    if (!cat) {
      setSelectedCategorySlug('todo');
      setSelectedCategoryId(null);
      return;
    }
    setSelectedCategorySlug(cat.slug);
    setSelectedCategoryId(cat.id ?? null);
  };

  const handleExperienceClick = (experience: Experience) => {
    setSelectedExperience(experience);
    setShowDetailModal(true);
  };

  const handleCreateTrip = () => {
    setShowDetailModal(false);
    router.push({
      pathname: '/add-trip',
      params: { destination: selectedExperience?.title ?? '' },
    });
  };

  const handleShare = () => {
    if (!selectedExperience) return;
    Alert.alert('Compartir', 'Función de compartir disponible próximamente');
  };

  // skeleton card for mobile while loading locations
  const renderSkeletonCard = (key: number) => (
    <View style={styles.experienceCard} key={`sk-${key}`}>
      <View style={[styles.cardImageContainer, { backgroundColor: '#EEE' }]}>
        <View style={{ flex: 1 }} />
      </View>
      <View style={styles.cardContent}>
        <View style={{ height: 18, width: '60%', backgroundColor: '#EEE', borderRadius: 8, marginBottom: 10 }} />
        <View style={{ height: 12, width: '40%', backgroundColor: '#EEE', borderRadius: 6, marginBottom: 6 }} />
        <View style={{ height: 12, width: '80%', backgroundColor: '#EEE', borderRadius: 6 }} />
      </View>
    </View>
  );

  // --- Render
  if (initialLoading) {
    // show a minimal page while categories load
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>Explorar por categorías</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF3951" />
            <Text style={styles.loadingText}>Cargando…</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Explorar por Categoría</Text>

        {/* categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          <TouchableOpacity
            key="cat-todo"
            style={[styles.categoryChip, selectedCategorySlug === 'todo' && styles.categoryChipSelected]}
            onPress={() => onCategoryClick(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.categoryChipText, selectedCategorySlug === 'todo' && styles.categoryChipTextSelected]}>Todo</Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, selectedCategorySlug === cat.slug && styles.categoryChipSelected]}
              onPress={() => onCategoryClick(cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryChipText, selectedCategorySlug === cat.slug && styles.categoryChipTextSelected]}>
                {cat.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results */}
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{selectedCategorySlug === 'todo' ? 'Resultados' : `Resultados — ${selectedCategorySlug}`}</Text>
            <Text style={styles.resultCount}>{filteredExperiences.length} resultados</Text>
          </View>

          {locationsLoading ? (
            // skeleton list while grid loads
            <View style={styles.experiencesList}>
              {Array.from({ length: 6 }).map((_, i) => renderSkeletonCard(i))}
            </View>
          ) : filteredExperiences.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se encontraron lugares para esta categoría.</Text>
            </View>
          ) : (
            <View style={styles.experiencesList}>
              {filteredExperiences.map((exp) => (
                <TouchableOpacity key={exp.id} style={styles.experienceCard} onPress={() => handleExperienceClick(exp)} activeOpacity={0.85}>
                  <View style={styles.cardImageContainer}>
                    {exp.image ? (
                      <ExpoImage
                        source={{ uri: exp.image }}
                        style={styles.cardImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.noImageContainer}>
                        <Text style={styles.noImageText}>Sin imagen</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {exp.title}
                    </Text>
                    <Text style={styles.cardDescription} numberOfLines={3}>
                      {exp.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Popular */}
          {popularExperiences.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Populares</Text>
              </View>

              <View style={styles.experiencesList}>
                {popularExperiences.map((exp) => (
                  <TouchableOpacity key={`pop-${exp.id}`} style={styles.experienceCard} onPress={() => handleExperienceClick(exp)} activeOpacity={0.85}>
                    <View style={styles.cardImageContainer}>
                      {exp.image ? (
                        <ExpoImage source={{ uri: exp.image }} style={styles.cardImage} contentFit="cover" />
                      ) : (
                        <View style={styles.noImageContainer}>
                          <Text style={styles.noImageText}>Sin imagen</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {exp.title}
                      </Text>
                      <Text style={styles.cardDescription} numberOfLines={3}>
                        {exp.description}
                      </Text>
                      {exp.category && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{String(exp.category)}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>

      {/* detail modal */}
      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDetailModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowDetailModal(false)}>
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
          </View>

          {selectedExperience && (
            <ScrollView style={styles.modalContent}>
              {selectedExperience.image ? (
                <ExpoImage source={{ uri: selectedExperience.image }} style={styles.modalImage} contentFit="cover" />
              ) : null}
              <View style={styles.modalDetails}>
                <Text style={styles.modalTitle}>{selectedExperience.title}</Text>
                <Text style={styles.modalDescription}>{selectedExperience.description}</Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.createTripButton} onPress={handleCreateTrip}>
                    <Text style={styles.createTripButtonText}>Crear plan de viaje</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <Text style={styles.shareButtonText}>Compartir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FCFCFC' },
  container: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#000', marginBottom: 20, marginTop: 38, textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#FF3951', textAlign: 'center' },

  categoriesContainer: { marginBottom: 0, height: 44, maxHeight: 44 },
  categoriesContent: { paddingHorizontal: 4, height: 44, alignItems: 'center' },
  categoryChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipSelected: { backgroundColor: '#FF3951', borderColor: '#FF3951' },
  categoryChipText: { fontSize: 14, fontWeight: '600', color: '#333' },
  categoryChipTextSelected: { color: '#FFF' },

  resultsContainer: { flex: 1 },
  sectionHeader: { marginBottom: 16, marginTop: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  resultCount: { fontSize: 14, color: '#666', marginTop: 4 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' },

  experiencesList: { paddingBottom: 20 },

  experienceCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: 'hidden',
  },
  cardImageContainer: { height: 200, width: '100%' },
  cardImage: { width: '100%', height: '100%' },
  noImageContainer: { width: '100%', height: '100%', backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  noImageText: { color: '#999', fontSize: 14 },

  cardContent: { padding: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 8, lineHeight: 24 },
  cardDescription: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 12 },

  categoryBadge: { alignSelf: 'flex-start', backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  categoryBadgeText: { fontSize: 12, fontWeight: '600', color: '#1976D2' },

  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalCloseButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 24, color: '#666' },
  modalContent: { flex: 1 },
  modalImage: { width: '100%', height: 250 },
  modalDetails: { padding: 20 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#000', marginBottom: 12 },
  modalDescription: { fontSize: 16, color: '#666', lineHeight: 24, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  createTripButton: { flex: 1, backgroundColor: '#FF3951', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  createTripButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  shareButton: { flex: 1, backgroundColor: '#F5F5F5', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  shareButtonText: { color: '#333', fontSize: 16, fontWeight: '600' },
});
