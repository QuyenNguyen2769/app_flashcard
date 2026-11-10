import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, XStack, YStack } from 'tamagui';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';

export default function StatsAndProfileScreen() {
  const { user, logout, themeMode, colors, toggleThemeMode, resetOnboarding } =
    useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleReplayOnboarding = async () => {
    await resetOnboarding();
    router.push('/onboarding');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.pageBg }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        <YStack gap={16} maxWidth={640} width="100%" alignSelf="center">
          {/* Thông tin tài khoản hiện tại */}
          <YStack
            padding={18}
            borderRadius={18}
            borderWidth={1.5}
            borderColor={colors.borderColor}
            backgroundColor={colors.cardBg}
            gap={10}
          >
            <XStack alignItems="center" gap={14}>
              <YStack
                width={58}
                height={58}
                borderRadius={29}
                backgroundColor={BRAND_COLORS.navy}
                borderWidth={2}
                borderColor={BRAND_COLORS.gold}
                alignItems="center"
                justifyContent="center"
              >
                <Ionicons name="person" size={28} color={BRAND_COLORS.gold} />
              </YStack>
              <YStack flex={1}>
                <Text fontSize={20} fontWeight="800" color={colors.textPrimary}>
                  {user?.name || 'Nguyễn Văn A'}
                </Text>
                <Text fontSize={13} color={colors.textSecondary}>
                  {user?.email || 'sinhvien@gmail.com'}
                </Text>
                <Text
                  fontSize={12}
                  color={colors.brandAccent}
                  fontWeight="800"
                  marginTop={4}
                >
                  🔥 Chuỗi học liên tiếp: {user?.streak || 1} ngày
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* Điều hướng nhanh */}
          <YStack
            padding={18}
            borderRadius={18}
            borderWidth={1.5}
            borderColor={colors.borderColor}
            backgroundColor={colors.cardBg}
            gap={10}
          >
            <Text fontSize={16} fontWeight="800" color={colors.brandAccent}>
              Tiện ích nhanh
            </Text>

            <Button
              size="md"
              justifyContent="flex-start"
              backgroundColor={colors.subtleBg}
              borderRadius={10}
              onPress={handleReplayOnboarding}
            >
              <Ionicons
                name="sparkles"
                size={17}
                color={colors.brandAccent}
              />
              <Text fontWeight="700" marginLeft={8} color={colors.textPrimary}>
                Xem lại giới thiệu (Onboarding)
              </Text>
            </Button>

            <Button
              size="md"
              justifyContent="flex-start"
              backgroundColor={colors.subtleBg}
              borderRadius={10}
              onPress={() => router.push('/(tabs)')}
            >
              <Ionicons name="home" size={17} color={colors.brandAccent} />
              <Text fontWeight="700" marginLeft={8} color={colors.textPrimary}>
                Trang chủ & Tiến độ hôm nay
              </Text>
            </Button>

            <Button
              size="md"
              justifyContent="flex-start"
              backgroundColor={colors.subtleBg}
              borderRadius={10}
              onPress={() => router.push('/(tabs)/decks')}
            >
              <Ionicons name="albums" size={17} color={colors.brandAccent} />
              <Text fontWeight="700" marginLeft={8} color={colors.textPrimary}>
                Kho bộ từ vựng
              </Text>
            </Button>
          </YStack>

          {/* Đổi giao diện Sáng / Tối & Đăng xuất */}
          <YStack gap={10}>
            <Button
              size="lg"
              backgroundColor={BRAND_COLORS.navy}
              borderWidth={1.5}
              borderColor={BRAND_COLORS.gold}
              borderRadius={14}
              onPress={toggleThemeMode}
            >
              <Ionicons
                name={themeMode === 'dark' ? 'sunny' : 'moon'}
                size={18}
                color={BRAND_COLORS.gold}
              />
              <Text fontWeight="800" marginLeft={8} color={BRAND_COLORS.gold}>
                Giao diện hiện tại:{' '}
                {themeMode === 'dark' ? 'Tối (Dark)' : 'Sáng (Light)'}
              </Text>
            </Button>

            <Button
              size="lg"
              backgroundColor={BRAND_COLORS.crimson}
              borderRadius={14}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color="white" />
              <Text color="white" fontWeight="800" marginLeft={8}>
                Đăng xuất tài khoản
              </Text>
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
