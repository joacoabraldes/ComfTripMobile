// ChangePasswordScreen.tsx
import PrimaryButton from "@/components/buttons/PrimaryButton";
import SecondaryLayout from "@/components/layouts/SecondaryLayout";
import { apiPut, authStorage } from "@/helpers/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View, ScrollView, useWindowDimensions } from "react-native";
import { useTranslation } from '@/i18n';
import InputField from '@/components/forms/InputField';
import { getResponsiveValues } from '@/helpers/responsive';
import { useSnackbar } from '@/contexts/SnackbarContext';

function base64UrlDecode(input: string) {
  try {
    let s = input.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    if (typeof atob !== "undefined") return atob(s);
    // node buffer fallback
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
  } catch {
    return null;
  }
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const paramId = (params?.id as string | undefined) ?? undefined;
  const { t } = useTranslation();
  const { showSuccess, showError } = useSnackbar();

  const [userId, setUserId] = useState<string | number | undefined>(paramId);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initChecking, setInitChecking] = useState(true);
  const { width } = useWindowDimensions();
  const responsive = getResponsiveValues(width);
  const inputHeight = responsive.heights.input;

  // Validate form - all fields must be filled and passwords must match
  const isFormValid = oldPassword.trim().length > 0 && 
                      newPassword.trim().length >= 6 && 
                      confirmPassword.trim().length >= 6 && 
                      newPassword === confirmPassword;

  // if no id param, try to read it from token
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (paramId) {
          if (mounted) setUserId(paramId);
          return;
        }
        const token = await authStorage.getToken();
        if (!token) {
          // no token -> redirect to login
          showError(t('changePassword.mustLogin'));
          router.replace("/login");
          return;
        }
        const payload = parseJwt(token);
        const idFromToken = payload?.id ?? payload?.userId ?? payload?.sub ?? null;
        if (!idFromToken) {
          showError(t('changePassword.invalidUser'));
          router.replace("/login");
          return;
        }
        if (mounted) setUserId(idFromToken);
      } catch (err) {
        console.warn("Error obtaining user id for change-password:", err);
      } finally {
        if (mounted) setInitChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [paramId, router]);

  async function handleChangePassword() {
    if (!userId) {
      showError(t('changePassword.userNotIdentified'));
      return;
    }
    if (!oldPassword || !newPassword || !confirmPassword) {
      showError(t('changePassword.completeAllFields'));
      return;
    }
    if (newPassword !== confirmPassword) {
      showError(t('changePassword.passwordsDoNotMatch'));
      return;
    }
    setLoading(true);
    try {
      const token = await authStorage.getToken();
      if (!token) throw new Error("No token");
      const res = await apiPut(`/users/${userId}/password`, {
        oldPassword,
        newPassword,
      });
      showSuccess(res.data?.message || t('changePassword.updatedMessage'));
      router.back();
    } catch (err: any) {
      // Show server message when available, otherwise generic
      const msg = err?.response?.data?.message || err?.message || t('changePassword.updateError');
      showError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (initChecking) {
    return (
      <SecondaryLayout title={t('changePassword.title')}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SecondaryLayout>
    );
  }

  return (
    <SecondaryLayout title={t('changePassword.title')}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <InputField
          placeholder={t('changePassword.currentPassword')}
          value={oldPassword}
          onChangeText={setOldPassword}
          secureTextEntry={!showOldPassword}
          showPasswordToggle
          showPassword={showOldPassword}
          onTogglePassword={() => setShowOldPassword(!showOldPassword)}
          containerStyle={{ height: inputHeight, marginBottom: 12 }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <InputField
          placeholder={t('changePassword.newPassword')}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNewPassword}
          showPasswordToggle
          showPassword={showNewPassword}
          onTogglePassword={() => setShowNewPassword(!showNewPassword)}
          containerStyle={{ height: inputHeight, marginBottom: 12 }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <InputField
          placeholder={t('changePassword.confirmPassword') || 'Confirmar contraseña'}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          showPasswordToggle
          showPassword={showConfirmPassword}
          onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
          containerStyle={{ height: inputHeight,marginBottom: 12 }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <PrimaryButton 
          title={loading ? t('changePassword.changing') : t('changePassword.change')} 
          onPress={handleChangePassword} 
          style={{ marginTop: 24 }} 
          disabled={!isFormValid || loading} 
        />
      </ScrollView>
    </SecondaryLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
