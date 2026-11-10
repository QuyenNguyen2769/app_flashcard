import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Button, Text, XStack, YStack } from 'tamagui';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';

interface OnboardingSlide {
  id: string;
  tag: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  circleBg: string;
  iconColor: string;
  borderColor: string;
  btnBg: string;
  btnText: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    tag: 'PHƯƠNG PHÁP SPACED REPETITION',
    title: 'Học Từ Vựng Thông Minh Với Flashcard',
    description:
      'Ghi nhớ từ vựng TOEIC, IELTS và Tiếng Anh CNTT gấp 3 lần nhờ phương pháp lặp lại ngắt quãng khoa học.',
    icon: 'book',
    circleBg: BRAND_COLORS.crimson,
    iconColor: BRAND_COLORS.gold,
    borderColor: BRAND_COLORS.gold,
    btnBg: BRAND_COLORS.crimson,
    btnText: BRAND_COLORS.white,
  },
  {
    id: '2',
    tag: 'TRỢ LÝ AI THÔNG MINH',
    title: 'Tự Động Tạo Bộ Từ & Câu Ví Dụ',
    description:
      'Chỉ cần nhập chủ đề, AI sẽ tự động sinh danh sách thẻ từ kèm phiên âm, giải nghĩa và bài tập trắc nghiệm Quiz.',
    icon: 'sparkles',
    circleBg: BRAND_COLORS.navy,
    iconColor: BRAND_COLORS.gold,
    borderColor: BRAND_COLORS.gold,
    btnBg: BRAND_COLORS.navy,
    btnText: BRAND_COLORS.gold,
  },
  {
    id: '3',
    tag: 'ĐỒNG BỘ ĐA THIẾT BỊ',
    title: 'Học Mọi Lúc Trên Điện Thoại & Tablet',
    description:
      'Đồng bộ dữ liệu đám mây qua REST API, theo dõi chuỗi ngày học (Streak) và hỗ trợ giao diện chia đôi màn hình khi xoay ngang.',
    icon: 'phone-portrait',
    circleBg: BRAND_COLORS.gold,
    iconColor: BRAND_COLORS.obsidian,
    borderColor: BRAND_COLORS.crimson,
    btnBg: BRAND_COLORS.crimson,
    btnText: BRAND_COLORS.white,
  },
];

export default function OnboardingScreen() {
  const { completeOnboarding, user, colors } = useAuth();
  const [step, setStep] = useState(0);

  const iconScale = useSharedValue(0.85);
  const floatY = useSharedValue(0);
  const progressRatio = useSharedValue((1 / SLIDES.length) * 100);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1200 }),
        withTiming(0, { duration: 1200 })
      ),
      -1,
      true
    );
  }, [floatY]);

  useEffect(() => {
    iconScale.value = 0.8;
    iconScale.value = withSpring(1, { damping: 10, stiffness: 120 });
    progressRatio.value = withTiming(((step + 1) / SLIDES.length) * 100, {
      duration: 350,
    });
  }, [step, iconScale, progressRatio]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }, { translateY: floatY.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressRatio.value}%`,
  }));

  const currentSlide = SLIDES[step];

  const handleFinish = async () => {
    await completeOnboarding();
    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/login');
    }
  };

  const handleNext = () => {
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <YStack
        flex={1}
        padding={24}
        justifyContent="space-between"
        alignItems="center"
        backgroundColor={colors.pageBg}
      >
        {/* Hàng trên: Logo + Nút Bỏ qua */}
        <XStack
          width="100%"
          maxWidth={720}
          justifyContent="space-between"
          alignItems="center"
        >
          <XStack alignItems="center" gap={10}>
            <YStack
              width={40}
              height={40}
              borderRadius={12}
              backgroundColor={BRAND_COLORS.crimson}
              borderWidth={1.5}
              borderColor={BRAND_COLORS.gold}
              alignItems="center"
              justifyContent="center"
            >
              <Ionicons name="school" size={20} color={BRAND_COLORS.gold} />
            </YStack>
            <Text fontSize={19} fontWeight="800" color={colors.textPrimary}>
              Flashcard AI
            </Text>
          </XStack>

          <Button size="sm" backgroundColor="transparent" onPress={handleFinish}>
            <Text fontWeight="700" color={colors.textSecondary} fontSize={14}>
              Bỏ qua
            </Text>
          </Button>
        </XStack>

        {/* Nội dung chính giữa: Icon Reanimated + Tiêu đề + Mô tả */}
        <YStack
          alignItems="center"
          gap={22}
          paddingHorizontal={16}
          maxWidth={540}
          width="100%"
        >
          <Animated.View style={iconAnimatedStyle}>
            <YStack
              width={140}
              height={140}
              borderRadius={70}
              backgroundColor={currentSlide.circleBg}
              alignItems="center"
              justifyContent="center"
              borderWidth={3}
              borderColor={currentSlide.borderColor}
            >
              <Ionicons
                name={currentSlide.icon}
                size={64}
                color={currentSlide.iconColor}
              />
            </YStack>
          </Animated.View>

          <Animated.View
            key={currentSlide.id}
            entering={FadeInDown.duration(350)}
            style={{ alignItems: 'center', width: '100%' }}
          >
            <YStack
              backgroundColor={colors.goldBadgeBg}
              borderWidth={1}
              borderColor={BRAND_COLORS.gold}
              paddingHorizontal={14}
              paddingVertical={6}
              borderRadius={999}
              marginBottom={14}
            >
              <Text
                fontSize={11}
                fontWeight="800"
                color={colors.goldBadgeText}
              >
                {currentSlide.tag}
              </Text>
            </YStack>

            <Text
              fontSize={28}
              fontWeight="800"
              textAlign="center"
              marginBottom={12}
              color={colors.textPrimary}
            >
              {currentSlide.title}
            </Text>

            <Text
              fontSize={16}
              textAlign="center"
              color={colors.textSecondary}
              maxWidth={460}
            >
              {currentSlide.description}
            </Text>
          </Animated.View>
        </YStack>

        {/* Phần dưới: Thanh tiến độ Reanimated + Nút điều hướng */}
        <YStack gap={16} width="100%" maxWidth={420}>
          <YStack gap={8} alignItems="center">
            <YStack
              width="100%"
              height={8}
              backgroundColor={colors.subtleBg}
              borderRadius={999}
              overflow="hidden"
            >
              <Animated.View
                style={[
                  {
                    height: '100%',
                    backgroundColor: BRAND_COLORS.gold,
                    borderRadius: 999,
                  },
                  progressAnimatedStyle,
                ]}
              />
            </YStack>
            <Text fontSize={12} color={colors.textSecondary} fontWeight="700">
              {step + 1} / {SLIDES.length}
            </Text>
          </YStack>

          <XStack gap={12}>
            {step > 0 && (
              <Button
                flex={1}
                size="lg"
                borderRadius={12}
                backgroundColor={colors.subtleBg}
                borderWidth={1}
                borderColor={colors.borderColor}
                onPress={() => setStep(step - 1)}
              >
                <Text fontWeight="700" color={colors.textPrimary}>
                  Quay lại
                </Text>
              </Button>
            )}

            <Button
              flex={2}
              size="lg"
              borderRadius={12}
              backgroundColor={currentSlide.btnBg}
              onPress={handleNext}
            >
              <Text color={currentSlide.btnText} fontWeight="800" fontSize={16}>
                {step === SLIDES.length - 1 ? 'Bắt đầu ngay' : 'Tiếp theo'}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={currentSlide.btnText}
                style={{ marginLeft: 6 }}
              />
            </Button>
          </XStack>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
