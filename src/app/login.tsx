import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Input, Text, XStack, YStack } from 'tamagui';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';
import { useLoginMutation } from '@/hooks/useFlashcardQueries';

export default function LoginScreen() {
  const { setSessionUser, colors } = useAuth();
  const loginMutation = useLoginMutation();

  const [email, setEmail] = useState('sinhvien@gmail.com');
  const [password, setPassword] = useState('123456');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Email và Mật khẩu!');
      return;
    }

    try {
      const loggedUser = await loginMutation.mutateAsync({
        email,
        password,
      });
      await setSessionUser(loggedUser, false);
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Đăng nhập thất bại. Vui lòng thử lại!');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.pageBg }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <YStack
              maxWidth={440}
              width="100%"
              alignSelf="center"
              gap={18}
              padding={24}
              borderRadius={22}
              borderWidth={1.5}
              borderColor={colors.borderColor}
              backgroundColor={colors.cardBg}
            >
              {/* Header */}
              <YStack alignItems="center" gap={8}>
                <YStack
                  width={68}
                  height={68}
                  borderRadius={22}
                  backgroundColor={BRAND_COLORS.crimson}
                  borderWidth={2}
                  borderColor={BRAND_COLORS.gold}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="book" size={32} color={BRAND_COLORS.gold} />
                </YStack>
                <Text
                  fontSize={26}
                  fontWeight="800"
                  marginTop={6}
                  color={colors.textPrimary}
                >
                  Chào mừng trở lại!
                </Text>
                <Text
                  fontSize={14}
                  color={colors.textSecondary}
                  textAlign="center"
                >
                  Đăng nhập để đồng bộ bộ từ vựng & chuỗi ngày học của bạn
                </Text>
              </YStack>

              {/* Thông báo lỗi nếu có */}
              {errorMsg ? (
                <XStack
                  backgroundColor="#FEE2E2"
                  padding={12}
                  borderRadius={10}
                  alignItems="center"
                  gap={8}
                >
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color={BRAND_COLORS.crimson}
                  />
                  <Text
                    color={BRAND_COLORS.crimson}
                    fontSize={13}
                    fontWeight="700"
                    flex={1}
                  >
                    {errorMsg}
                  </Text>
                </XStack>
              ) : null}

              {/* Form nhập Email & Password */}
              <YStack gap={14}>
                <YStack gap={6}>
                  <Text fontWeight="700" fontSize={13} color={colors.textPrimary}>
                    Email
                  </Text>
                  <Input
                    size="lg"
                    placeholder="Nhập email (VD: sinhvien@gmail.com)"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    backgroundColor={colors.inputBg}
                    color={colors.textPrimary}
                    borderColor={colors.borderColor}
                    borderRadius={10}
                  />
                </YStack>

                <YStack gap={6}>
                  <Text fontWeight="700" fontSize={13} color={colors.textPrimary}>
                    Mật khẩu
                  </Text>
                  <Input
                    size="lg"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    backgroundColor={colors.inputBg}
                    color={colors.textPrimary}
                    borderColor={colors.borderColor}
                    borderRadius={10}
                  />
                </YStack>
              </YStack>

              {/* Nút chọn nhanh tài khoản mẫu */}
              <YStack
                backgroundColor={colors.goldBadgeBg}
                borderWidth={1}
                borderColor={colors.reviewCardBorder}
                padding={12}
                borderRadius={12}
                gap={8}
              >
                <Text fontSize={12} fontWeight="800" color={colors.goldBadgeText}>
                  ⚡ Điền nhanh tài khoản Demo:
                </Text>
                <XStack gap={8} flexWrap="wrap">
                  <Button
                    size="sm"
                    backgroundColor={BRAND_COLORS.navy}
                    borderRadius={8}
                    onPress={() => {
                      setEmail('sinhvien@gmail.com');
                      setPassword('123456');
                    }}
                  >
                    <Text fontSize={12} fontWeight="700" color={BRAND_COLORS.gold}>
                      Nguyễn Văn A (Đã học 8/20 từ)
                    </Text>
                  </Button>
                  <Button
                    size="sm"
                    backgroundColor={BRAND_COLORS.crimson}
                    borderRadius={8}
                    onPress={() => {
                      setEmail('test@gmail.com');
                      setPassword('123456');
                    }}
                  >
                    <Text fontSize={12} fontWeight="700" color={BRAND_COLORS.white}>
                      Trần Thị B (Đã học 5/15 từ)
                    </Text>
                  </Button>
                </XStack>
              </YStack>

              {/* Nút Đăng nhập */}
              <Button
                size="lg"
                backgroundColor={BRAND_COLORS.crimson}
                borderRadius={12}
                onPress={handleLogin}
                disabled={loginMutation.isPending}
              >
                <Text color="white" fontWeight="800" fontSize={16}>
                  {loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Text>
              </Button>

              {/* Chuyển sang màn Đăng ký hoặc xem lại Onboarding */}
              <YStack alignItems="center" gap={8} marginTop={4}>
                <XStack alignItems="center" gap={6}>
                  <Text fontSize={14} color={colors.textSecondary}>
                    Chưa có tài khoản?
                  </Text>
                  <Link href="/register" asChild>
                    <Button
                      size="xs"
                      backgroundColor="transparent"
                      paddingHorizontal={4}
                    >
                      <Text
                        color={colors.brandAccent}
                        fontWeight="800"
                        fontSize={14}
                      >
                        Đăng ký ngay
                      </Text>
                    </Button>
                  </Link>
                </XStack>

                <Button
                  size="xs"
                  backgroundColor="transparent"
                  onPress={() => router.push('/onboarding')}
                >
                  <Text fontSize={12} color={colors.textSecondary}>
                    ← Xem lại giới thiệu ứng dụng
                  </Text>
                </Button>
              </YStack>
            </YStack>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
