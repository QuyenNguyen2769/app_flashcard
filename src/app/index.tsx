import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator } from 'react-native';
import { YStack } from 'tamagui';
import { useAuth } from '@/context/AuthContext';

export default function IndexGateScreen() {
  const { user, hasSeenOnboarding, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color="#2563EB" />
      </YStack>
    );
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
