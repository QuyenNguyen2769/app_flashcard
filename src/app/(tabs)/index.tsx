import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, Text, XStack, YStack } from 'tamagui';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';
import {
  computeStudyOverview,
  useDecksQuery,
  useToggleCardLearnedMutation,
} from '@/hooks/useFlashcardQueries';

// ============================================================================
// MÀN HÌNH 4: TRANG CHỦ (TIẾN ĐỘ HÔM NAY & TỪ CẦN ÔN)
// ============================================================================
export default function HomeScreen() {
  const { user, themeMode, colors, toggleThemeMode } = useAuth();
  const { width } = useWindowDimensions();
  const isTabletOrLandscape = width >= 760;

  const {
    data: decks = [],
    isLoading,
    refetch,
    isRefetching,
  } = useDecksQuery();
  const toggleLearnedMutation = useToggleCardLearnedMutation();

  const overview = computeStudyOverview(decks);

  // Thanh tiến độ học hôm nay chạy mượt bằng Reanimated
  const dailyGoal = user?.dailyGoal || 20;
  const todayStudied = overview.learnedCards;
  const dailyPercent = Math.min(
    100,
    Math.round((todayStudied / dailyGoal) * 100)
  );

  const progressAnim = useSharedValue(0);

  useEffect(() => {
    progressAnim.value = withTiming(dailyPercent, { duration: 800 });
  }, [dailyPercent, progressAnim]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value}%`,
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.pageBg }}
        contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <YStack gap={20} maxWidth={1080} width="100%" alignSelf="center">
          {/* Header: Lời chào + Streak Vàng Hoàng Kim + Nút đổi Theme */}
          <XStack justifyContent="space-between" alignItems="center" gap={10}>
            <YStack flex={1}>
              <Text fontSize={24} fontWeight="800" color={colors.textPrimary}>
                Xin chào, {user?.name || 'Nguyễn Văn A'} 👋
              </Text>
              <Text fontSize={13} color={colors.textSecondary} marginTop={2}>
                {overview.reviewCount > 0
                  ? `Hôm nay bạn có ${overview.reviewCount} từ vựng cần ôn tập!`
                  : 'Tuyệt vời! Bạn đã hoàn thành hết từ vựng cần ôn!'}
              </Text>
            </YStack>

            <XStack alignItems="center" gap={10}>
              {/* Huy hiệu Streak phối màu Vàng (#FEC341) & Đỏ Đô (#9B0000) */}
              <XStack
                backgroundColor={BRAND_COLORS.gold}
                paddingHorizontal={12}
                paddingVertical={8}
                borderRadius={12}
                alignItems="center"
                gap={6}
              >
                <Ionicons name="flame" size={18} color={BRAND_COLORS.crimson} />
                <Text
                  fontWeight="800"
                  color={BRAND_COLORS.obsidian}
                  fontSize={14}
                >
                  {user?.streak || 1} ngày
                </Text>
              </XStack>

              {/* Nút đổi Theme Sáng/Tối */}
              <Button
                size="md"
                circular
                backgroundColor={colors.cardBg}
                borderWidth={1.5}
                borderColor={colors.borderColor}
                onPress={toggleThemeMode}
              >
                <Ionicons
                  name={themeMode === 'dark' ? 'sunny' : 'moon'}
                  size={18}
                  color={
                    themeMode === 'dark'
                      ? BRAND_COLORS.gold
                      : BRAND_COLORS.navy
                  }
                />
              </Button>
            </XStack>
          </XStack>

          {/* Thẻ Tiến Độ Hôm Nay: Nền Xanh Đen (#0F1629) + Điểm nhấn Đỏ Đô (#9B0000) + Thanh tiến độ Vàng (#FEC341) */}
          <Animated.View entering={FadeInDown.duration(350)}>
            <YStack
              backgroundColor={BRAND_COLORS.navy}
              borderWidth={1.5}
              borderColor={
                colors.isDark ? BRAND_COLORS.gold : BRAND_COLORS.crimson
              }
              padding={22}
              borderRadius={22}
              gap={16}
            >
              <XStack justifyContent="space-between" alignItems="center">
                <YStack>
                  <XStack alignItems="center" gap={6}>
                    <YStack
                      width={8}
                      height={8}
                      borderRadius={4}
                      backgroundColor={BRAND_COLORS.gold}
                    />
                    <Text
                      color={BRAND_COLORS.gold}
                      fontSize={12}
                      fontWeight="800"
                    >
                      TIẾN ĐỘ HỌC HÔM NAY
                    </Text>
                  </XStack>
                  <Text
                    color={BRAND_COLORS.white}
                    fontSize={24}
                    fontWeight="800"
                    marginTop={6}
                  >
                    {todayStudied} / {dailyGoal} từ đã thuộc
                  </Text>
                </YStack>

                <YStack
                  backgroundColor={BRAND_COLORS.crimson}
                  borderWidth={1.5}
                  borderColor={BRAND_COLORS.gold}
                  paddingHorizontal={16}
                  paddingVertical={8}
                  borderRadius={14}
                  alignItems="center"
                >
                  <Text
                    color={BRAND_COLORS.gold}
                    fontSize={20}
                    fontWeight="800"
                  >
                    {dailyPercent}%
                  </Text>
                  <Text
                    color={BRAND_COLORS.white}
                    fontSize={10}
                    fontWeight="700"
                  >
                    Mục tiêu ngày
                  </Text>
                </YStack>
              </XStack>

              {/* Thanh tiến độ Reanimated màu Vàng Hoàng Kim (#FEC341) */}
              <YStack
                height={12}
                backgroundColor="rgba(255, 255, 255, 0.14)"
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
                    animatedBarStyle,
                  ]}
                />
              </YStack>

              {/* 3 chỉ số tổng quan */}
              <XStack
                justifyContent="space-between"
                paddingTop={12}
                borderTopWidth={1}
                borderColor="rgba(255,255,255,0.12)"
              >
                <YStack>
                  <Text color="#94A3B8" fontSize={11} fontWeight="600">
                    Tổng bộ từ
                  </Text>
                  <Text
                    color={BRAND_COLORS.white}
                    fontWeight="800"
                    fontSize={16}
                  >
                    {overview.totalDecks} bộ
                  </Text>
                </YStack>
                <YStack>
                  <Text color="#94A3B8" fontSize={11} fontWeight="600">
                    Tổng số thẻ
                  </Text>
                  <Text
                    color={BRAND_COLORS.white}
                    fontWeight="800"
                    fontSize={16}
                  >
                    {overview.totalCards} thẻ
                  </Text>
                </YStack>
                <YStack>
                  <Text color="#94A3B8" fontSize={11} fontWeight="600">
                    Cần ôn hôm nay
                  </Text>
                  <Text
                    color={BRAND_COLORS.gold}
                    fontWeight="800"
                    fontSize={16}
                  >
                    {overview.reviewCount} từ
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          </Animated.View>

          {/* Phím tắt điều hướng nhanh */}
          <XStack gap={12} flexWrap="wrap">
            <Button
              flex={1}
              minWidth={140}
              size="lg"
              backgroundColor={BRAND_COLORS.crimson}
              borderRadius={14}
              onPress={() => router.push('/(tabs)/decks')}
            >
              <Ionicons name="albums" size={18} color={BRAND_COLORS.white} />
              <Text color={BRAND_COLORS.white} fontWeight="800" marginLeft={8}>
                Danh sách bộ từ
              </Text>
            </Button>

            <Button
              flex={1}
              minWidth={140}
              size="lg"
              backgroundColor={BRAND_COLORS.navy}
              borderWidth={1.5}
              borderColor={BRAND_COLORS.gold}
              borderRadius={14}
              onPress={() => router.push('/(tabs)/ai-create')}
            >
              <Ionicons name="sparkles" size={18} color={BRAND_COLORS.gold} />
              <Text color={BRAND_COLORS.gold} fontWeight="800" marginLeft={8}>
                AI Tạo bộ từ
              </Text>
            </Button>
          </XStack>

          {/* Khu vực chính: Nếu màn hình rộng >= 760px thì chia 2 cột ngang, nếu điện thoại dọc thì xếp dọc */}
          <XStack
            flexDirection={isTabletOrLandscape ? 'row' : 'column'}
            gap={24}
            alignItems="stretch"
          >
            {/* Cột 1: Danh sách TỪ CẦN ÔN TẬP HÔM NAY */}
            <YStack
              width={isTabletOrLandscape ? '50%' : '100%'}
              flexShrink={1}
              gap={12}
            >
              <XStack justifyContent="space-between" alignItems="center">
                <XStack alignItems="center" gap={8}>
                  <Ionicons
                    name="alarm"
                    size={20}
                    color={colors.brandAccent}
                  />
                  <Text
                    fontSize={18}
                    fontWeight="800"
                    color={colors.textPrimary}
                  >
                    Từ cần ôn hôm nay
                  </Text>
                  <YStack
                    backgroundColor={colors.goldBadgeBg}
                    paddingHorizontal={8}
                    paddingVertical={2}
                    borderRadius={999}
                  >
                    <Text
                      fontSize={11}
                      fontWeight="800"
                      color={colors.goldBadgeText}
                    >
                      {overview.reviewCards.length} từ
                    </Text>
                  </YStack>
                </XStack>
                <Text
                  fontSize={12}
                  color={colors.brandAccent}
                  fontWeight="700"
                >
                  Bấm ✓ khi đã thuộc
                </Text>
              </XStack>

              {isLoading ? (
                <YStack padding={24} alignItems="center">
                  <ActivityIndicator size="large" color={BRAND_COLORS.crimson} />
                  <Text marginTop={8} color={colors.textSecondary}>
                    Đang tải dữ liệu...
                  </Text>
                </YStack>
              ) : overview.reviewCards.length === 0 ? (
                <YStack
                  padding={24}
                  borderRadius={16}
                  backgroundColor={colors.cardBg}
                  borderWidth={1.5}
                  borderColor={BRAND_COLORS.gold}
                  alignItems="center"
                  gap={8}
                >
                  <Ionicons
                    name="trophy"
                    size={40}
                    color={BRAND_COLORS.gold}
                  />
                  <Text
                    fontWeight="800"
                    color={colors.textPrimary}
                    fontSize={16}
                  >
                    Tuyệt vời! Bạn đã ôn hết từ vựng hôm nay!
                  </Text>
                </YStack>
              ) : (
                overview.reviewCards.slice(0, 6).map((item, idx) => (
                  <Animated.View
                    key={`${item.deckId}-${item.id}`}
                    entering={FadeInDown.delay(idx * 50).duration(300)}
                  >
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/deck/[id]',
                          params: { id: item.deckId },
                        })
                      }
                    >
                      <YStack
                        padding={14}
                        borderRadius={16}
                        borderWidth={1.5}
                        borderColor={colors.reviewCardBorder}
                        backgroundColor={colors.reviewCardBg}
                        gap={6}
                      >
                        <XStack
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <XStack alignItems="center" gap={8} flex={1}>
                            <Text
                              fontSize={18}
                              fontWeight="800"
                              color={
                                colors.isDark
                                  ? BRAND_COLORS.gold
                                  : BRAND_COLORS.crimson
                              }
                            >
                              {item.term}
                            </Text>
                            {item.phonetic ? (
                              <Text fontSize={12} color={colors.textSecondary}>
                                {item.phonetic}
                              </Text>
                            ) : null}
                          </XStack>

                          <Button
                            size="xs"
                            backgroundColor={
                              colors.isDark
                                ? 'rgba(16, 185, 129, 0.2)'
                                : '#DCFCE7'
                            }
                            borderRadius={8}
                            onPress={(e) => {
                              e.stopPropagation();
                              toggleLearnedMutation.mutate({
                                deckId: item.deckId,
                                cardId: item.id,
                              });
                            }}
                          >
                            <Ionicons
                              name="checkmark-circle"
                              size={14}
                              color={colors.isDark ? '#34D399' : '#15803D'}
                            />
                            <Text
                              fontSize={11}
                              fontWeight="700"
                              color={colors.isDark ? '#34D399' : '#15803D'}
                              marginLeft={4}
                            >
                              Đã thuộc
                            </Text>
                          </Button>
                        </XStack>

                        <Text
                          fontSize={14}
                          fontWeight="700"
                          color={colors.textPrimary}
                        >
                          {item.definition}
                        </Text>

                        {item.example ? (
                          <Text
                            fontSize={12}
                            color={colors.textSecondary}
                            fontStyle="italic"
                          >
                            &ldquo;{item.example}&rdquo;
                          </Text>
                        ) : null}

                        <XStack
                          justifyContent="space-between"
                          alignItems="center"
                          marginTop={4}
                        >
                          <Text
                            fontSize={11}
                            color={colors.brandAccent}
                            fontWeight="800"
                          >
                            Bộ từ: {item.deckTitle}
                          </Text>
                          <Text fontSize={11} color={colors.textMuted}>
                            Xem chi tiết →
                          </Text>
                        </XStack>
                      </YStack>
                    </Pressable>
                  </Animated.View>
                ))
              )}
            </YStack>

            {/* Cột 2: Các bộ từ đang học */}
            <YStack
              width={isTabletOrLandscape ? '50%' : '100%'}
              flexShrink={1}
              gap={12}
            >
              <XStack justifyContent="space-between" alignItems="center">
                <XStack alignItems="center" gap={8}>
                  <Ionicons
                    name="library"
                    size={20}
                    color={
                      colors.isDark ? BRAND_COLORS.gold : BRAND_COLORS.navy
                    }
                  />
                  <Text
                    fontSize={18}
                    fontWeight="800"
                    color={colors.textPrimary}
                  >
                    Bộ từ vựng của bạn
                  </Text>
                  <YStack
                    backgroundColor={colors.brandBadgeBg}
                    paddingHorizontal={8}
                    paddingVertical={2}
                    borderRadius={999}
                  >
                    <Text
                      fontSize={11}
                      fontWeight="800"
                      color={colors.brandBadgeText}
                    >
                      {decks.length} bộ
                    </Text>
                  </YStack>
                </XStack>
                <Button
                  size="xs"
                  backgroundColor="transparent"
                  onPress={() => router.push('/(tabs)/decks')}
                >
                  <Text
                    color={colors.brandAccent}
                    fontWeight="800"
                    fontSize={13}
                  >
                    Xem tất cả →
                  </Text>
                </Button>
              </XStack>

              {decks.map((deck) => {
                const total = deck.cards?.length || 0;
                const learned =
                  deck.cards?.filter((c) => c.isLearned).length || 0;
                const pct = total > 0 ? Math.round((learned / total) * 100) : 0;

                return (
                  <Pressable
                    key={deck.id}
                    onPress={() =>
                      router.push({
                        pathname: '/deck/[id]',
                        params: { id: deck.id },
                      })
                    }
                  >
                    <YStack
                      padding={16}
                      borderRadius={16}
                      borderWidth={1.5}
                      borderColor={colors.borderColor}
                      backgroundColor={colors.cardBg}
                      gap={8}
                    >
                      <XStack
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <YStack
                          backgroundColor={colors.brandBadgeBg}
                          paddingHorizontal={10}
                          paddingVertical={4}
                          borderRadius={6}
                        >
                          <Text
                            fontSize={11}
                            fontWeight="800"
                            color={colors.brandBadgeText}
                          >
                            {deck.category}
                          </Text>
                        </YStack>
                        <Text
                          fontSize={12}
                          fontWeight="800"
                          color={
                            colors.isDark
                              ? BRAND_COLORS.gold
                              : BRAND_COLORS.crimson
                          }
                        >
                          Đã thuộc {learned}/{total} thẻ • {pct}%
                        </Text>
                      </XStack>

                      <Text
                        fontSize={16}
                        fontWeight="800"
                        color={colors.textPrimary}
                      >
                        {deck.title}
                      </Text>

                      <Text
                        fontSize={13}
                        color={colors.textSecondary}
                        numberOfLines={2}
                      >
                        {deck.description}
                      </Text>
                    </YStack>
                  </Pressable>
                );
              })}
            </YStack>
          </XStack>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
