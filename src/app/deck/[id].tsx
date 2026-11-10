import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { DeckDetailContent } from '@/components/DeckDetailContent';
import { useAuth } from '@/context/AuthContext';

export default function DeckDetailScreen() {
  const { colors } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deckId = typeof id === 'string' ? id : '1';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <YStack flex={1} backgroundColor={colors.pageBg}>
        <DeckDetailContent
          deckId={deckId}
          isSplitView={false}
          onBack={() => router.back()}
        />
      </YStack>
    </SafeAreaView>
  );
}
