import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, XStack, YStack } from 'tamagui';

export default function QuizStubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} padding={20} gap={16} backgroundColor="$background">
        <XStack alignItems="center" gap={10}>
          <Button size="sm" circular onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} />
          </Button>
          <Text fontSize={20} fontWeight="800">
            Trắc nghiệm Quiz (Bộ từ #{id || '1'})
          </Text>
        </XStack>

        <YStack
          padding={20}
          borderRadius={16}
          borderWidth={1}
          borderColor="rgba(124, 58, 237, 0.3)"
          gap={12}
        >
          <Text fontWeight="700" fontSize={16}>
            Kiểm tra từ vựng Quiz
          </Text>
          <Text fontSize={14} opacity={0.75}>
            Màn hình làm bài trắc nghiệm từ vựng của bộ từ #{id || '1'}.
          </Text>
          <Button
            backgroundColor="#7C3AED"
            borderRadius={10}
            onPress={() => router.back()}
          >
            <Text color="white" fontWeight="700">
              Quay lại chi tiết bộ từ
            </Text>
          </Button>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
