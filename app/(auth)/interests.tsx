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
  Platform,
  useWindowDimensions,
  BackHandler,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonStyles } from '@/constants/Styles';
import PrimaryButton from "@/components/buttons/PrimaryButton";
import { apiGet, apiPost, tokenStorage } from "@/helpers/api";
import { useRouter, useFocusEffect } from "expo-router";
import { Asset } from "expo-asset"; // <-- expo-asset for preloading
import { useTranslation } from '@/i18n';
import { AppColors, ShadowColors } from '@/constants/Colors';
import ProgressIndicator from '@/components/forms/ProgressIndicator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getResponsiveValues } from '@/helpers/responsive';
import { useCategoryTranslation, useCategoryDescriptionTranslation } from '@/helpers/categoryTranslations';

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
  translateCategory,
  translateDescription,
}: {
  item: ServerInterest;
  onToggle: (slug: string) => void;
  isSelected: boolean;
  imageFailed?: boolean;
  translateCategory: (slug: string | null | undefined, fallback?: string) => string;
  translateDescription: (slug: string | null | undefined, fallback?: string) => string;
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
        <Text style={styles.cardTitle}>{translateCategory(item.slug, item.title)}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={3}>
          {translateDescription(item.slug, item.description)}
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
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const responsive = getResponsiveValues(width);
  const translateCategory = useCategoryTranslation();
  const translateDescription = useCategoryDescriptionTranslation();
  
  const titleFontSize = responsive.fontSizes.titleLarge;
  const subtitleFontSize = responsive.fontSizes.subtitle;

  // Handle hardware back button (Android) and navigation back gesture
  const handleBackPress = useCallback(() => {
    // Set flag to indicate we're going back to register from interests
    AsyncStorage.setItem('@register_from_interests', 'true').then(() => {
      router.push('/register');
    });
    return true; // Prevent default back behavior
  }, [router]);

  // Set up back button handler
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => backHandler.remove();
      }
    }, [handleBackPress])
  );

  const loadInterests = useCallback(async () => {
    setFetching(true);
    try {
      const res = await apiGet("/users/interests");
      const data = res?.data ?? res;
      if (Array.isArray(data)) {
        const normalized = data.map((d: any) => ({
          id: d.id,
          slug:
            d.slug ??
            (d.title ? String(d.title).toLowerCase().replace(/\s+/g, "-") : ""),
          title: d.title ?? d.slug ?? "",
          description: d.description ?? "",
        }));
        setInterests(normalized);
      } else {
        setInterests([]);
      }
    } catch (err: any) {
      console.warn("Failed to fetch interests:", err);
      setInterests([]);
      // Show error message to user
      const errorMsg = err?.message || err?.error || t('auth.interests.loadError');
      Alert.alert(
        t('common.error'),
        errorMsg,
        [
          {
            text: t('common.retry'),
            onPress: () => {
              // Retry loading
              loadInterests();
            },
          },
          {
            text: t('common.ok'),
            style: 'cancel',
          },
        ]
      );
    } finally {
      setFetching(false);
      // Ensure assetsReady is set even if there's an error
      setAssetsReady(true);
    }
  }, [t]);

  useEffect(() => {
    loadInterests();
  }, [loadInterests]);

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

    // Only preload when we actually have interests and fetching is complete
    if (interests.length > 0 && !fetching) {
      preload();
    } else if (!fetching) {
      // If fetching is done but no interests, mark assets as ready
      setAssetsReady(true);
    }

    return () => {
      mounted = false;
    };
  }, [interests, fetching]);

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
        translateCategory={translateCategory}
        translateDescription={translateDescription}
      />
    ),
    [selected, imageLoadFailed, toggleInterest, translateCategory, translateDescription]
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

  const handleSaveInterests = async (skip: boolean = false) => {
    if (!skip && selected.length === 0) return;
    setLoading(true);
    try {
      // First, register the user with form data from AsyncStorage
      let token: string | null = null;
      try {
        const savedData = await AsyncStorage.getItem('@register_form_data');
        if (savedData) {
          const formData = JSON.parse(savedData);
          const registerPayload = {
            name: formData.name,
            email: formData.email,
            phone: `${formData.phoneCode}${formData.phoneNumber}`,
            password: formData.password,
            password_hash: formData.password,
            nationality: formData.nationality || "",
            birthdate: formData.birthdate || null,
          };

          const registerRes = await apiPost('/auth/register', registerPayload);
          const registerData = registerRes.data ?? registerRes;
          token = registerData?.token || registerData?.accessToken || registerData?.jwt || registerData?.data?.token || null;

          if (token) {
            await tokenStorage.setToken(token);
          } else {
            console.warn('No token found in register response', registerData);
            Alert.alert(t('auth.register.registerFailed'), t('auth.register.registerFailed'));
            return;
          }
        } else {
          // If no saved data, try to get existing token
          token = await getTokenWithRetries(6, 250);
          if (!token) {
            Alert.alert(t('auth.interests.attention'), t('auth.interests.noSession'));
            router.replace("/login");
            return;
          }
        }
      } catch (registerErr: any) {
        console.error('Register error:', registerErr);
        const msg = (registerErr && registerErr.message) || (registerErr && registerErr.error) || JSON.stringify(registerErr) || t('auth.register.registerFailed');
        Alert.alert(t('auth.register.registerFailed'), msg);
        return;
      }

      // Now save interests
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

      const payloadBody = skip || selectedIds.length === 0 
        ? { interestIds: [] } 
        : selectedIds.length > 0 
        ? { interestIds: selectedIds } 
        : { interestSlugs: selected };

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
        // Clear saved form data after successful registration
        try {
          await AsyncStorage.removeItem('@register_form_data');
        } catch (error) {
          console.warn('Error clearing form data:', error);
        }
        Alert.alert(t('auth.interests.saved'), t('auth.interests.savedSuccess'));
        router.replace("/home");
      } else {
        console.warn("Save interests unexpected response:", postRes);
        Alert.alert(t('auth.interests.error'), t('auth.interests.saveError'));
      }
    } catch (err: any) {
      console.error("Error saving interests:", err);
      const msg = (err && err.message) || JSON.stringify(err) || t('auth.interests.saveErrorGeneric');
      Alert.alert(t('auth.interests.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  // While fetching OR while we are preloading assets, show spinner
  const showLoadingList = fetching || !assetsReady;

  return (
    <SafeAreaView style={CommonStyles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: titleFontSize }]}>{t('auth.register.title')}</Text>
          <Text style={[styles.subtitle, { fontSize: subtitleFontSize }]}>{t('auth.register.subtitle')}</Text>
        </View>

        {/* Progress Indicator */}
        <ProgressIndicator currentStep={2} totalSteps={2} />

        <Text style={styles.interestsTitle}>{t('auth.interests.title')}</Text>

        <View style={styles.listContainer}>
          {showLoadingList ? (
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <ActivityIndicator size="large" />
              <Text style={{ color: AppColors.textSecondary, marginTop: 8 }}>{t('auth.interests.loading')}</Text>
            </View>
          ) : (
            <FlatList
              data={interests}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", marginTop: 24 }}>
                  <Text style={{ color: AppColors.textSecondary }}>{t('auth.interests.noInterests')}</Text>
                </View>
              }
              // performance tuning
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              windowSize={7}
              removeClippedSubviews={true}
            />
          )}
        </View>

        {/* Navigation Buttons - Fixed at bottom */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.navButton, styles.backButton]}
            onPress={async () => {
              // Set flag to indicate we're going back to register from interests
              await AsyncStorage.setItem('@register_from_interests', 'true');
              router.push('/register');
            }}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>{t('auth.register.backButton')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.completeButton, loading && styles.completeButtonDisabled]}
            onPress={() => handleSaveInterests(false)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={AppColors.white} />
            ) : (
              <Text style={styles.completeButtonText}>{t('auth.register.completeButton')}</Text>
            )}
          </TouchableOpacity>
        </View>

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
  container: { flex: 1, padding: 20, paddingBottom: 0 },
  listContainer: { flex: 1, marginBottom: 16 },
  header: {
    marginTop: Platform.OS === 'ios' ? 20 : 10,
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    color: AppColors.text,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  interestsTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    color: AppColors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 0,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  backButton: {
    backgroundColor: AppColors.backgroundTertiary,
    borderWidth: 1,
    borderColor: AppColors.border,
    flex: 0,
    minWidth: 100,
  },
  backButtonText: {
    color: AppColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: AppColors.primary,
    flex: 0,
    minWidth: 100,
  },
  completeButtonDisabled: {
    backgroundColor: AppColors.textDisabled,
    opacity: 0.6,
  },
  completeButtonText: {
    color: AppColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.backgroundPrimary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    shadowColor: ShadowColors.black,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
  },
  cardSelected: { borderColor: AppColors.primary, backgroundColor: AppColors.primaryLighter },
  image: { width: ITEM_IMAGE_SIZE, height: ITEM_IMAGE_SIZE, borderRadius: 10, backgroundColor: AppColors.borderLight },
  imageLoader: {
    position: "absolute",
    left: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: AppColors.text, marginBottom: 6 },
  cardSubtitle: { fontSize: 13, color: AppColors.textSecondary, lineHeight: 18 },
  checkBadge: {
    position: "absolute",
    right: 12,
    top: 12,
    backgroundColor: AppColors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ShadowColors.black,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  checkText: { color: AppColors.white, fontSize: 16, fontWeight: "700", lineHeight: 18 },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.backgroundPrimary + '99',
  },
});
