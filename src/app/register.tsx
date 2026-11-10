import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Input, Text, XStack, YStack } from 'tamagui';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';
import { useRegisterMutation } from '@/hooks/useFlashcardQueries';

export default function RegisterScreen() {
  const { setSessionUser, colors } = useAuth();
  const registerMutation = useRegisterMutation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    setErrorMsg('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu!');
      return;
    }

    if (!email.includes('@')) {
      setErrorMsg('Định dạng Email không hợp lệ!');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      const createdUser = await registerMutation.mutateAsync({
        name,
        email,
        password,
      });
      // Đánh dấu isNewRegistration = true để khởi tạo tiến độ = 0/20 từ đã thuộc
      await setSessionUser(createdUser, true);
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể đăng ký tài khoản!');
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
              gap={16}
              padding={24}
              borderRadius={22}
              borderWidth={1.5}
              borderColor={colors.borderColor}
              backgroundColor={colors.cardBg}
            >
              {/* Header */}
              <YStack alignItems="center" gap={8}>
                <YStack
                  width={64}
                  height={64}
                  borderRadius={20}
                  backgroundColor={BRAND_COLORS.navy}
                  borderWidth={2}
                  borderColor={BRAND_COLORS.gold}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons
                    name="person-add"
                    size={28}
                    color={BRAND_COLORS.gold}
                  />
                </YStack>
                <Text
                  fontSize={24}
                  fontWeight="800"
                  marginTop={4}
                  color={colors.textPrimary}
                >
                  Tạo tài khoản mới
                </Text>
                <Text
                  fontSize={13}
                  color={colors.textSecondary}
                  textAlign="center"
                >
                  Bắt đầu hành trình chinh phục từ vựng mỗi ngày từ con số 0
                </Text>
              </YStack>

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

              {/* Form nhập thông tin đăng ký */}
              <YStack gap={14}>
                <YStack gap={6}>
                  <Text fontWeight="700" fontSize={13} color={colors.textPrimary}>
                    Họ và tên
                  </Text>
                  <Input
                    size="lg"
                    placeholder="VD: Lê Hoàng Nam"
                    value={name}
                    onChangeText={setName}
                    backgroundColor={colors.inputBg}
                    color={colors.textPrimary}
                    borderColor={colors.borderColor}
                    borderRadius={10}
                  />
                </YStack>

                <YStack gap={6}>
                  <Text fontWeight="700" fontSize={13} color={colors.textPrimary}>
                    Địa chỉ Email
                  </Text>
                  <Input
                    size="lg"
                    placeholder="VD: nam.le@student.edu.vn"
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
                    Mật khẩu (tối thiểu 6 ký tự)
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

                <YStack gap={6}>
                  <Text fontWeight="700" fontSize={13} color={colors.textPrimary}>
                    Xác nhận mật khẩu
                  </Text>
                  <Input
                    size="lg"
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    backgroundColor={colors.inputBg}
                    color={colors.textPrimary}
                    borderColor={colors.borderColor}
                    borderRadius={10}
                  />
                </YStack>
              </YStack>

              <Button
                size="lg"
                backgroundColor={BRAND_COLORS.crimson}
                borderRadius={12}
                marginTop={4}
                onPress={handleRegister}
                disabled={registerMutation.isPending}
              >
                <Text color="white" fontWeight="800" fontSize={16}>
                  {registerMutation.isPending
                    ? 'Đang tạo tài khoản...'
                    : 'Hoàn tất Đăng ký'}
                </Text>
              </Button>

              <XStack justifyContent="center" alignItems="center" gap={6}>
                <Text fontSize={14} color={colors.textSecondary}>
                  Đã có tài khoản?
                </Text>
                <Link href="/login" asChild>
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
                      Đăng nhập
                    </Text>
                  </Button>
                </Link>
              </XStack>
            </YStack>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
