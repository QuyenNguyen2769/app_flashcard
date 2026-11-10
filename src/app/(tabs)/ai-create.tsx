import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Text, XStack, YStack } from 'tamagui';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';

export default function AICreateStubScreen() {
  const { colors } = useAuth();
  const [topic, setTopic] = useState('Từ vựng phỏng vấn xin việc IT');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.pageBg }}
        contentContainerStyle={{ padding: 20 }}
      >
        <YStack gap={16} maxWidth={640} width="100%" alignSelf="center">
          <XStack alignItems="center" gap={12}>
            <YStack
              width={52}
              height={52}
              borderRadius={16}
              backgroundColor={BRAND_COLORS.navy}
              borderWidth={1.5}
              borderColor={BRAND_COLORS.gold}
              alignItems="center"
              justifyContent="center"
            >
              <Ionicons name="sparkles" size={26} color={BRAND_COLORS.gold} />
            </YStack>
            <YStack flex={1}>
              <Text fontSize={22} fontWeight="800" color={colors.textPrimary}>
                AI Tạo Bộ Từ Theo Chủ Đề
              </Text>
              <Text fontSize={13} color={colors.textSecondary}>
                Tự động sinh danh sách từ vựng, phiên âm và câu ví dụ bằng AI
              </Text>
            </YStack>
          </XStack>

          <YStack
            padding={18}
            borderRadius={16}
            borderWidth={1.5}
            borderColor={colors.borderColor}
            backgroundColor={colors.cardBg}
            gap={12}
          >
            <Text fontWeight="700" color={colors.textPrimary}>
              Chủ đề muốn AI sinh thẻ từ:
            </Text>
            <Input
              size="lg"
              value={topic}
              onChangeText={setTopic}
              placeholder="Nhập chủ đề tiếng Anh..."
              backgroundColor={colors.inputBg}
              color={colors.textPrimary}
              borderColor={colors.borderColor}
              borderRadius={10}
            />
            <Button
              size="lg"
              backgroundColor={BRAND_COLORS.crimson}
              borderRadius={12}
              onPress={() => router.push('/(tabs)/decks')}
            >
              <Ionicons name="flash" size={18} color={BRAND_COLORS.gold} />
              <Text color="white" fontWeight="800" marginLeft={8}>
                Xem danh sách bộ từ hiện có
              </Text>
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
