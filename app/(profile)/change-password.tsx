// ChangePasswordScreen.tsx
import PrimaryButton from "@/components/buttons/PrimaryButton";
import BackButton from "@/components/BackButton";
import { apiPut, tokenStorage } from "@/helpers/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ActivityIndicator, StyleSheet, Text, TextInput, View, Platform } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonStyles } from '@/constants/Styles';

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

  const [userId, setUserId] = useState<string | number | undefined>(paramId);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [initChecking, setInitChecking] = useState(true);

  // if no id param, try to read it from token
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (paramId) {
          if (mounted) setUserId(paramId);
          return;
        }
        const token = await tokenStorage.getToken();
        if (!token) {
          // no token -> redirect to login
          Alert.alert("No autorizado", "Debes iniciar sesión.");
          router.replace("/login");
          return;
        }
        const payload = parseJwt(token);
        const idFromToken = payload?.id ?? payload?.userId ?? payload?.sub ?? null;
        if (!idFromToken) {
          Alert.alert("No autorizado", "Usuario inválido.");
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
      Alert.alert("Error", "Usuario no identificado. Intenta iniciar sesión de nuevo.");
      return;
    }
    if (!oldPassword || !newPassword) {
      Alert.alert("Error", "Por favor completa ambos campos de contraseña.");
      return;
    }
    setLoading(true);
    try {
      const token = await tokenStorage.getToken();
      if (!token) throw new Error("No token");
      const res = await apiPut(`/users/${userId}/password`, {
        oldPassword,
        newPassword,
      });
      Alert.alert("Contraseña actualizada", res.data?.message || "Se actualizó correctamente");
      router.back();
    } catch (err: any) {
      // Show server message when available, otherwise generic
      const msg = err?.response?.data?.message || err?.message || "No se pudo cambiar la contraseña";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  if (initChecking) {
    return (
      <SafeAreaView style={CommonStyles.safeArea}>
        <View style={CommonStyles.containerWithBackButton}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={CommonStyles.safeArea}>
      <View style={CommonStyles.backButtonContainer}>
        <BackButton />
      </View>
      <View style={CommonStyles.containerWithBackButton}>
        <Text style={CommonStyles.pageTitle}>Cambiar Contraseña</Text>
        <TextInput
          style={CommonStyles.input}
          placeholder="Contraseña actual"
          value={oldPassword}
          onChangeText={setOldPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <TextInput
          style={CommonStyles.input}
          placeholder="Nueva contraseña"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <PrimaryButton title={loading ? "Cambiando..." : "Cambiar"} onPress={handleChangePassword} style={{ marginTop: 24 }} disabled={loading} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
});
