import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, XStack, YStack } from 'tamagui';

export default function DeckFormStubScreen() {
  const { deckId } = useLocalSearchParams<{ deckId?: string }>();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} padding={20} gap={16} backgroundColor="$background">
        <XStack alignItems="center" gap={10}>
          <Button size="sm" circular onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} />
          </Button>
          <Text fontSize={20} fontWeight="800">
            {deckId ? 'Chỉnh sửa bộ từ' : 'Thêm bộ từ mới'}
          </Text>
        </XStack>

        <YStack
          padding={20}
          borderRadius={16}
          borderWidth={1}
          borderColor="rgba(148, 163, 184, 0.3)"
          gap={12}
        >
          <Text fontWeight="700" fontSize={16}>
            Quản lý bộ từ & thẻ từ
          </Text>
          <Text fontSize={14} opacity={0.75}>
            Tính năng thêm/sửa bộ từ đã được kết nối sẵn với các hàm API tạo và cập nhật bộ từ.
          </Text>
          <Button
            backgroundColor="#2563EB"
            borderRadius={10}
            onPress={() => router.back()}
          >
            <Text color="white" fontWeight="700">
              Quay lại
            </Text>
          </Button>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
