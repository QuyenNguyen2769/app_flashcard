import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Text, XStack, YStack } from 'tamagui';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';
import { useUpdateUserProfileMutation } from '@/hooks/useFlashcardQueries';
import { goBackSafely } from '@/utils/navigation';

export default function SettingsScreen() {
  const {
    user,
    colors,
    themeMode,
    toggleThemeMode,
    logout,
    setSessionUser,
  } = useAuth();
  const { width, height } = useWindowDimensions();
  const isWide = width >= 768 || width > height;
  const updateProfile = useUpdateUserProfileMutation();
  const [name, setName] = useState(user?.name ?? '');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage('Tên hiển thị không được để trống.');
      setSuccessMessage('');
      return;
    }
    if (!user) {
      setErrorMessage('Không tìm thấy phiên đăng nhập.');
      return;
    }
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const updated = await updateProfile.mutateAsync({
        userId: user.id,
        name: trimmed,
      });
      await setSessionUser(updated);
      setSuccessMessage('Đã cập nhật tên hiển thị.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ.');
    }
  };

  const changeTheme = async () => {
    try {
      await toggleThemeMode();
    } catch {
      setErrorMessage('Không thể lưu chế độ giao diện trên thiết bị.');
    }
  };

  const performLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } catch {
      setErrorMessage('Không thể xóa phiên đăng nhập khỏi thiết bị.');
      setIsLoggingOut(false);
    }
  };

  const confirmLogout = () => {
    if (isLoggingOut) return;
    const title = 'Đăng xuất';
    const message = 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?';

    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        void performLogout();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Ở lại', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => void performLogout(),
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.pageBg }}
        contentContainerStyle={{ padding: isWide ? 24 : 18, paddingBottom: 36 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack gap={18} maxWidth={1040} width="100%" alignSelf="center">
          <XStack alignItems="center" gap={12}>
            <Button size="md" circular onPress={() => goBackSafely('/(tabs)')}>
              <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
            </Button>
            <YStack>
              <Text fontSize={24} fontWeight="900" color={colors.textPrimary}>Hồ sơ & cài đặt</Text>
              <Text color={colors.textSecondary}>Quản lý thông tin tài khoản và giao diện.</Text>
            </YStack>
          </XStack>

          <XStack flexDirection={isWide ? 'row' : 'column'} gap={16} alignItems="stretch">
            <YStack flex={1} padding={20} borderRadius={18} backgroundColor={colors.cardBg} borderWidth={1} borderColor={colors.borderColor} gap={14}>
              <XStack alignItems="center" gap={14}>
                <YStack width={58} height={58} borderRadius={29} backgroundColor={BRAND_COLORS.navy} borderWidth={2} borderColor={BRAND_COLORS.gold} alignItems="center" justifyContent="center">
                  <Ionicons name="person" size={28} color={BRAND_COLORS.gold} />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={18} fontWeight="800" color={colors.textPrimary}>{user?.name || 'Người học'}</Text>
                  <Text color={colors.textSecondary}>{user?.email || 'Chưa đăng nhập'}</Text>
                </YStack>
              </XStack>
              <YStack gap={6}>
                <Text fontWeight="700" color={colors.textPrimary}>Tên hiển thị</Text>
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder="Nhập tên của bạn"
                  backgroundColor={colors.inputBg}
                  color={colors.textPrimary}
                  borderColor={errorMessage ? BRAND_COLORS.crimson : colors.borderColor}
                />
                {errorMessage ? <Text color="$red10" fontSize={12}>{errorMessage}</Text> : null}
                {successMessage ? <Text color="$green10" fontSize={12}>{successMessage}</Text> : null}
              </YStack>
              <Button backgroundColor={BRAND_COLORS.crimson} disabled={updateProfile.isPending || !user} onPress={saveName}>
                {updateProfile.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text color="white" fontWeight="800">Lưu thay đổi</Text>
                )}
              </Button>
            </YStack>

            <YStack flex={1} padding={20} borderRadius={18} backgroundColor={colors.cardBg} borderWidth={1} borderColor={colors.borderColor} gap={16}>
              <Text fontSize={17} fontWeight="800" color={colors.textPrimary}>Giao diện</Text>
              <XStack alignItems="center" justifyContent="space-between" gap={12}>
                <XStack alignItems="center" gap={10}>
                  <Ionicons name={themeMode === 'dark' ? 'moon' : 'sunny'} size={21} color={BRAND_COLORS.goldDark} />
                  <YStack>
                    <Text fontWeight="700" color={colors.textPrimary}>{themeMode === 'dark' ? 'Chế độ tối' : 'Chế độ sáng'}</Text>
                    <Text fontSize={12} color={colors.textSecondary}>Lựa chọn được lưu trên thiết bị.</Text>
                  </YStack>
                </XStack>
                <Button
                  size="sm"
                  backgroundColor={themeMode === 'dark' ? BRAND_COLORS.navy : colors.subtleBg}
                  borderColor={themeMode === 'dark' ? BRAND_COLORS.gold : colors.borderColor}
                  borderWidth={1}
                  onPress={() => { void changeTheme(); }}
                >
                  <Text color={themeMode === 'dark' ? BRAND_COLORS.gold : colors.textPrimary}>
                    Chuyển sang {themeMode === 'dark' ? 'sáng' : 'tối'}
                  </Text>
                </Button>
              </XStack>
              <YStack height={1} backgroundColor={colors.borderColor} />
              <Button
                backgroundColor={BRAND_COLORS.crimson}
                onPress={confirmLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={18} color="white" />
                    <Text color="white" fontWeight="800" marginLeft={8}>Đăng xuất</Text>
                  </>
                )}
              </Button>
            </YStack>
          </XStack>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
