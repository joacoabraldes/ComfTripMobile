import PrimaryButton from "@/components/buttons/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import SecondaryLayout from "@/components/layouts/SecondaryLayout";
import { apiGet, authStorage } from "@/helpers/api";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "@/i18n";
import {AppColors, ShadowColors} from "@/constants/Colors";
import { getResponsiveValues, responsiveSize } from "@/helpers/responsive";
import TextButton from "@/components/buttons/TextButton";
import { useTheme, ThemeMode } from "@/hooks/useTheme";
import { useAppColors } from "@/hooks/useAppColors";
import {useCommonStyles} from "@/constants/Styles";
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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
  const { width, height } = useWindowDimensions();
  const { t, language, setLanguage } = useTranslation();
  const { themeMode, setThemeMode } = useTheme();
  const AppColors = useAppColors();
    const CommonStyles = useCommonStyles();
  
  // Tamaños relativos basados en el tamaño de pantalla
  const responsive = getResponsiveValues(width, height);
  const btnHeight = responsive.heights.button;
  const btnRadius = responsive.borderRadius.button;
  const iconSize = responsiveSize(width, 0.045, 16, 20);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // helper: try to read token a few times (handles small race where login sets token just before navigation)
  const getTokenWithRetries = useCallback(async (attempts = 6, delayMs = 250) => {
    for (let i = 0; i < attempts; i++) {
      try {
        const t = await authStorage.getToken();
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
        }
      } catch (err2) {
        // Fetching by id failed - will use fallback
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
        } else if (typeof authStorage.setToken === "function") {
          await authStorage.setToken("");
        }
      } catch (e) {
        // ignore inner
        try {
          await authStorage.setToken("");
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
      // Logout storage cleanup failed - non-critical
    } finally {
      router.replace("/login");
    }
  }

  function handleLogout() {
    setShowLogoutDialog(true);
  }

  function handleConfirmLogout() {
    setShowLogoutDialog(false);
    performLogout();
  }

  function handleCancelLogout() {
    setShowLogoutDialog(false);
  }

  // Generate dynamic styles early so they're available everywhere
  const styles = getStyles(AppColors);

  function handleEdit() {
    router.push("../(profile)/edit-profile");
  }
  function handleChangePassword() {
    router.push("../(profile)/change-password");
  }

  if (loading || !profile) {
    return (
      <SecondaryLayout title={t('profile.profile')}>
        <View style={styles.centered}>
            <ActivityIndicator size="large" color="#FF3951" />
            <Text style={CommonStyles.loadingText}>{t('profile.loading')}</Text>
        </View>
      </SecondaryLayout>
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

  // Tamaños relativos para textos y espaciados
  const fontSizeSmall = responsive.fontSizes.small;
  const fontSizeMedium = responsive.fontSizes.medium;
  const fontSizeLarge = responsive.fontSizes.large;
  const paddingSmall = responsive.padding.small;
  const paddingMedium = responsive.padding.medium;
  const paddingLarge = responsive.padding.large;
  const borderRadius = responsive.borderRadius.default;

  function InfoRow({ label, value, iconName, iconSize }: { label: string; value: string; iconName?: keyof typeof Ionicons.glyphMap; iconSize?: number }) {
    return (
      <View style={[styles.infoRow, { paddingVertical: paddingSmall }]}>
        <View style={styles.infoLeft}>
          {iconName ? <Ionicons name={iconName} size={iconSize || 18} color={AppColors.textSecondary} /> : null}
          <Text style={[styles.infoLabel, { fontSize: fontSizeSmall, marginLeft: iconName ? responsive.spacing.small : 0 }]}>{label}</Text>
        </View>
        <Text style={[styles.infoValue, { fontSize: fontSizeMedium }]}>{value}</Text>
      </View>
    );
  }

  return (
    <SecondaryLayout title={t('profile.profile')}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View style={[styles.infoCard, { 
          borderRadius: borderRadius,
          paddingVertical: paddingMedium,
          paddingHorizontal: paddingMedium,
          marginTop: 16,
          marginHorizontal: 16,
        }]}>
          {/* Profile Photo */}
          <View style={styles.profilePhotoContainer}>
            <View style={[styles.profilePhoto, { width: responsiveSize(width, 0.25, 80, 120), height: responsiveSize(width, 0.25, 80, 120), borderRadius: responsiveSize(width, 0.125, 40, 60) }]}>
              <Ionicons name="person" size={responsiveSize(width, 0.12, 40, 60)} color={AppColors.textSecondary} />
            </View>
          </View>
          
          <InfoRow label={t('profile.user')} value={displayName} iconName="person" iconSize={iconSize} />
          <InfoRow label={t('profile.email')} value={displayEmail} iconName="mail" iconSize={iconSize} />
          <InfoRow label={t('profile.phone')} value={displayPhone} iconName="call" iconSize={iconSize} />
          <InfoRow label={t('profile.nationality')} value={displayNationality} iconName="flag" iconSize={iconSize} />
          <InfoRow label={t('profile.birthdate')} value={displayBirthdate} iconName="calendar" iconSize={iconSize} />
          
          {/* Language Selector */}
          <View style={[styles.infoRow, { paddingVertical: paddingSmall }]}>
            <View style={styles.infoLeft}>
              <Ionicons name="globe" size={iconSize} color={AppColors.textSecondary} />
              <Text style={[styles.infoLabel, { fontSize: fontSizeSmall, marginLeft: responsive.spacing.small }]}>
                {t('profile.language')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowLanguageModal(true)}
              style={styles.languageButton}
            >
              <Text style={[styles.languageButtonText, { fontSize: fontSizeMedium }]}>
                {language === 'es' ? t('profile.spanish') : t('profile.english')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={AppColors.textSecondary} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>

          {/* Theme Selector */}
          <View style={[styles.infoRow, { paddingVertical: paddingSmall, borderBottomWidth: 0 }]}>
            <View style={styles.infoLeft}>
              <Ionicons name="color-palette" size={iconSize} color={AppColors.textSecondary} />
              <Text style={[styles.infoLabel, { fontSize: fontSizeSmall, marginLeft: responsive.spacing.small }]}>
                {t('profile.theme')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowThemeModal(true)}
              style={styles.languageButton}
            >
              <Text style={[styles.languageButtonText, { fontSize: fontSizeMedium }]}>
                {themeMode === 'light' ? t('profile.themeLight') : 
                 themeMode === 'dark' ? t('profile.themeDark') : 
                 t('profile.themeAuto')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={AppColors.textSecondary} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Row with Edit Profile and Change Password */}
          <View style={styles.textButtonRow}>
            <TextButton
              title={t('profile.editProfile')}
              onPress={handleEdit}
              textStyle={styles.smallTextButton}
              style={styles.leftTextButton}
            />
            <TextButton
              title={t('profile.changePassword')}
              onPress={handleChangePassword}
              textStyle={styles.smallTextButton}
              style={styles.rightTextButton}
            />
          </View>

          {/* Logout Button */}
          <View style={[styles.buttonRow, { marginTop: 32 }]}>
            <PrimaryButton
              title={t('profile.logout')}
              onPress={handleLogout}
              height={btnHeight}
              borderRadius={btnRadius}
              style={[styles.actionButton, { width: '100%' }]}
            />
          </View>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowLanguageModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: fontSizeLarge }]}>
                {t('profile.selectLanguage')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={AppColors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalOptions}>
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  language === 'es' && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setLanguage('es');
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  { fontSize: fontSizeMedium },
                  language === 'es' && styles.modalOptionTextSelected,
                ]}>
                  {t('profile.spanish')}
                </Text>
                {language === 'es' && (
                  <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  language === 'en' && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setLanguage('en');
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  { fontSize: fontSizeMedium },
                  language === 'en' && styles.modalOptionTextSelected,
                ]}>
                  {t('profile.english')}
                </Text>
                {language === 'en' && (
                  <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowThemeModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: fontSizeLarge }]}>
                {t('profile.selectTheme')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowThemeModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={AppColors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalOptions}>
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  themeMode === 'light' && styles.modalOptionSelected,
                ]}
                onPress={async () => {
                  await setThemeMode('light');
                  setShowThemeModal(false);
                }}
              >
                <View style={styles.modalOptionLeft}>
                  <Ionicons name="sunny" size={20} color={themeMode === 'light' ? AppColors.primary : AppColors.textSecondary} />
                  <Text style={[
                    styles.modalOptionText,
                    { fontSize: fontSizeMedium },
                    themeMode === 'light' && styles.modalOptionTextSelected,
                  ]}>
                    {t('profile.themeLight')}
                  </Text>
                </View>
                {themeMode === 'light' && (
                  <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  themeMode === 'dark' && styles.modalOptionSelected,
                ]}
                onPress={async () => {
                  await setThemeMode('dark');
                  setShowThemeModal(false);
                }}
              >
                <View style={styles.modalOptionLeft}>
                  <Ionicons name="moon" size={20} color={themeMode === 'dark' ? AppColors.primary : AppColors.textSecondary} />
                  <Text style={[
                    styles.modalOptionText,
                    { fontSize: fontSizeMedium },
                    themeMode === 'dark' && styles.modalOptionTextSelected,
                  ]}>
                    {t('profile.themeDark')}
                  </Text>
                </View>
                {themeMode === 'dark' && (
                  <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalOption,
                  themeMode === 'auto' && styles.modalOptionSelected,
                ]}
                onPress={async () => {
                  await setThemeMode('auto');
                  setShowThemeModal(false);
                }}
              >
                <View style={styles.modalOptionLeft}>
                  <Ionicons name="phone-portrait" size={20} color={themeMode === 'auto' ? AppColors.primary : AppColors.textSecondary} />
                  <Text style={[
                    styles.modalOptionText,
                    { fontSize: fontSizeMedium },
                    themeMode === 'auto' && styles.modalOptionTextSelected,
                  ]}>
                    {t('profile.themeAuto')}
                  </Text>
                </View>
                {themeMode === 'auto' && (
                  <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={showLogoutDialog}
        title={t('profile.logoutTitle')}
        message={t('profile.logoutMessage')}
        confirmText={t('profile.logout')}
        cancelText={t('profile.logoutCancel')}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
        destructive={true}
      />
    </SecondaryLayout>
  );
}

// Create dynamic styles function
const getStyles = (colors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: colors.backgroundPrimary,
    ...Platform.select({
      ios: {
        shadowColor: ShadowColors.black,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { color: colors.textSecondary, fontWeight: "500" },
  infoValue: { color: colors.text, fontWeight: "600" },
  languageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.backgroundInputMuted,
  },
  languageButtonText: {
    color: colors.text,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 16,
    width: "85%",
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalOptions: {
    padding: 8,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: colors.backgroundTertiary,
  },
  modalOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalOptionSelected: {
    backgroundColor: colors.primaryLight,
  },
  modalOptionText: {
    color: colors.text,
    fontWeight: "500",
  },
  modalOptionTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
    marginTop: 6,
  },
  interestsText: {
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 14,
    paddingHorizontal: 12,
  },

  profilePhotoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  profilePhoto: {
    backgroundColor: colors.backgroundInputMuted,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: colors.borderLight,
  },
  actionsContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
    width: "100%",
  },
  textButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  leftTextButton: {
    alignSelf: "flex-start",
  },
  rightTextButton: {
    alignSelf: "flex-end",
  },
  smallTextButton: {
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    minWidth: 0,
  },
  centered: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center",
    paddingTop: 100,
  },
});