import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/api/queries";
import { supabaseConfigMissing } from "@/api/supabase";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { DialogProvider } from "@/components/common/dialog";
import { ToastProvider } from "@/components/common/toast";
import { Screen, StateView } from "@/components/common/ui";
import { color } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DialogProvider>
            <ToastProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </ToastProvider>
          </DialogProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { session, isRestoring } = useAuth();

  useEffect(() => {
    if (!isRestoring) SplashScreen.hideAsync().catch(() => {});
  }, [isRestoring]);

  if (supabaseConfigMissing) {
    return (
      <Screen>
        <StateView
          title="接続先が設定されていません"
          message="EXPO_PUBLIC_SUPABASE_URL と EXPO_PUBLIC_SUPABASE_ANON_KEY を .env.local に設定して、アプリを起動し直してください（README の初回セットアップ）"
        />
      </Screen>
    );
  }

  // 復元中はスプラッシュを出したまま。未ログインの画面が一瞬見えるのを防ぐ
  if (isRestoring) return null;

  const signedIn = session !== null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
      {/* 未ログインではサインイン画面だけ（受け入れ基準1） */}
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
