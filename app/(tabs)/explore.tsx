import { apiGet } from '@/helpers/api';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

type Category = {
  id: number;
  title: string;
  slug: string;
};

type Location = {
  id: number;
  titulo: string;
  descripcion: string;
  imagenes: string | string[];
  fk_interest: string;
  relevancia?: number;
};

type Experience = {
  id: number;
  title: string;
  description: string;
  category: string;
  image: string | null;
  raw: Location;
};

const safeParseImages = (im: any): string[] => {
  if (!im) return [];
  if (Array.isArray(im)) return im;
  if (typeof im === 'string') {
    try {
      const parsed = JSON.parse(im);
      if (Array.isArray(parsed)) return parsed;
      return [parsed];
    } catch (e) {
      return [im];
    }
  }
  return [];
};

function sortByRelevanceDesc(arr: Location[]): Location[] {
  if (!Array.isArray(arr)) return [];
  return [...arr].sort((a, b) => (Number(b.relevancia || 0) - Number(a.relevancia || 0)));
}

export default function ExploreScreen() {
  const router = useRouter();

  // Server-driven state
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularLocations, setPopularLocations] = useState<Location[]>([]);
  const [locationsFiltered, setLocationsFiltered] = useState<Location[]>([]);

  // UI & state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('todo');

  // Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);

  // Initial load: categories + popular locations
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cats = await apiGet('/interests');
        const locs = await apiGet('/locations?limit=200');

        if (!mounted) return;
        setCategories(Array.isArray(cats?.data || cats) ? (cats?.data || cats) : []);

        // Ensure sorting by relevancia DESC
        const sorted = sortByRelevanceDesc(Array.isArray(locs?.data || locs) ? (locs?.data || locs) : []);
        setPopularLocations(sorted.slice(0, 12));
        setLocationsFiltered(sorted.slice(0, 50));
      } catch (err) {
        console.error('Explore load error:', err);
        setError('No se pudo cargar la página. Intente nuevamente.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // When category changes, fetch filtered locations
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (selectedCategorySlug === 'todo') {
          const locs = await apiGet('/locations?limit=200');
          if (!mounted) return;
          const sorted = sortByRelevanceDesc(Array.isArray(locs?.data || locs) ? (locs?.data || locs) : []);
          setLocationsFiltered(sorted.slice(0, 50));
        } else {
          const locs = await apiGet(`/locations?interest=${encodeURIComponent(selectedCategorySlug)}&limit=200`);
          if (!mounted) return;
          const sorted = sortByRelevanceDesc(Array.isArray(locs?.data || locs) ? (locs?.data || locs) : []);
          setLocationsFiltered(sorted);
        }
      } catch (err) {
        console.error('Error fetching filtered locations:', err);
        setError('No se pudieron cargar las localidades filtradas.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedCategorySlug]);

  const mapToExperiences = (locs: Location[]): Experience[] => {
    if (!Array.isArray(locs)) return [];
    return locs.map((loc) => {
      const imgs = safeParseImages(loc.imagenes);
      return {
        id: loc.id,
        title: loc.titulo || `Lugar #${loc.id}`,
        description: loc.descripcion ? (loc.descripcion.length > 150 ? loc.descripcion.slice(0, 150) + '…' : loc.descripcion) : '',
        category: loc.fk_interest,
        image: imgs.length ? imgs[0] : null,
        raw: loc,
      };
    });
  };

  const popularExperiences = useMemo(() => mapToExperiences(popularLocations), [popularLocations]);
  const filteredExperiences = useMemo(() => mapToExperiences(locationsFiltered), [locationsFiltered]);

  const onCategoryClick = (slug: string) => {
    setSelectedCategorySlug(slug);
  };

  const handleExperienceClick = (experience: Experience) => {
    setSelectedExperience(experience);
    setShowDetailModal(true);
  };

  const handleCreateTrip = () => {
    setShowDetailModal(false);
    router.push({
      pathname: '/add-trip',
      params: { destination: selectedExperience?.title ?? '' }
    });
  };

  const handleShare = () => {
    if (!selectedExperience) return;
    Alert.alert('Compartir', 'Función de compartir disponible próximamente');
  };

  const renderCategoryChip = (category: Category | null, isSelected: boolean) => {
    const title = category ? category.title : 'Todo';
    const slug = category ? category.slug : 'todo';
    
    return (
      <TouchableOpacity
        key={slug}
        style={[
          styles.categoryChip,
          isSelected && styles.categoryChipSelected
        ]}
        onPress={() => onCategoryClick(slug)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.categoryChipText,
          isSelected && styles.categoryChipTextSelected
        ]}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderExperienceCard = (exp: Experience) => (
    <TouchableOpacity
      key={exp.id}
      style={styles.experienceCard}
      onPress={() => handleExperienceClick(exp)}
      activeOpacity={0.8}
    >
      <View style={styles.cardImageContainer}>
        {exp.image ? (
          <ExpoImage
            source={exp.image}
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
        {exp.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{exp.category}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
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

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>Explorar por categorías</Text>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Explorar por categorías</Text>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {renderCategoryChip(null, selectedCategorySlug === 'todo')}
          {categories.map((cat) => renderCategoryChip(cat, selectedCategorySlug === cat.slug))}
        </ScrollView>

        {/* Results */}
        <ScrollView
          style={styles.resultsContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategorySlug === 'todo' ? 'Resultados' : `Resultados — ${selectedCategorySlug}`}
            </Text>
            <Text style={styles.resultCount}>
              {filteredExperiences.length} resultados
            </Text>
          </View>

          {filteredExperiences.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No se encontraron lugares para esta categoría.
              </Text>
            </View>
          ) : (
            <View style={styles.experiencesList}>
              {filteredExperiences.map(renderExperienceCard)}
            </View>
          )}

          {/* Popular section */}
          {popularExperiences.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Populares</Text>
              </View>
              <View style={styles.experiencesList}>
                {popularExperiences.map(renderExperienceCard)}
              </View>
            </>
          )}
        </ScrollView>
      </View>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
          </View>
          
          {selectedExperience && (
            <ScrollView style={styles.modalContent}>
              {selectedExperience.image && (
                <ExpoImage
                  source={selectedExperience.image}
                  style={styles.modalImage}
                  contentFit="cover"
                />
              )}
              <View style={styles.modalDetails}>
                <Text style={styles.modalTitle}>{selectedExperience.title}</Text>
                <Text style={styles.modalDescription}>
                  {selectedExperience.description}
                </Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.createTripButton}
                    onPress={handleCreateTrip}
                  >
                    <Text style={styles.createTripButtonText}>
                      Crear plan de viaje
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={handleShare}
                  >
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
  safeArea: {
    flex: 1,
    backgroundColor: '#FCFCFC',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 20,
    marginTop: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3951',
    textAlign: 'center',
  },
  categoriesContainer: {
    marginBottom: 0,
    height: 36,
    maxHeight: 44,
  },
  categoriesContent: {
    paddingHorizontal: 4,
    height: 36,
    alignItems: 'center',
  },
  categoryChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipSelected: {
    backgroundColor: '#FF3951',
    borderColor: '#FF3951',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  categoryChipTextSelected: {
    color: '#FFF',
  },
  resultsContainer: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  experiencesList: {
    paddingBottom: 20,
  },
  experienceCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: 'hidden',
  },
  cardImageContainer: {
    height: 200,
    width: '100%',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#999',
    fontSize: 14,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    lineHeight: 24,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    flex: 1,
  },
  modalImage: {
    width: '100%',
    height: 250,
  },
  modalDetails: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  createTripButton: {
    flex: 1,
    backgroundColor: '#FF3951',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  createTripButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  shareButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
