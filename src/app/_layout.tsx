import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme } from 'tamagui';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { tamaguiConfig } from '@/tamagui.config';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootNavigator() {
  const { themeMode, isLoadingAuth } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoadingAuth]);

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={themeMode}>
      <Theme name={themeMode}>
        <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="deck/[id]" />
          <Stack.Screen name="deck-form" />
          <Stack.Screen name="study/[id]" />
          <Stack.Screen name="quiz/[id]" />
          <Stack.Screen name="quiz-result/[id]" />
          <Stack.Screen name="settings" />
        </Stack>
      </Theme>
    </TamaguiProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
