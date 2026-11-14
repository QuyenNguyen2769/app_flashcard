import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Text, XStack, YStack } from 'tamagui';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';
import { useDecksQuery, useProgressQuery } from '@/hooks/useFlashcardQueries';
import { ProgressEntry } from '@/types/flashcard';
import { formatLocalDate } from '@/utils/spacedRepetition';
import { calculateStreak } from '@/utils/streak';

function getWeekData(progress: ProgressEntry[], today = new Date()) {
  const entries = new Map(progress.map((entry) => [entry.date, entry]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - index));
    const key = formatLocalDate(date);
    return {
      date: key,
      label: new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(date),
      studied: entries.get(key)?.studiedCount ?? 0,
    };
  });
}

export default function StatsScreen() {
  const { user, colors } = useAuth();
  const { width, height } = useWindowDimensions();
  const isWide = width >= 768 || width > height;
  const decksQuery = useDecksQuery();
  const progressQuery = useProgressQuery(user?.id);
  const progress: ProgressEntry[] = progressQuery.data?.map((entry) => ({
    date: entry.date,
    studiedCount: entry.cardsStudied,
    correct: entry.correct,
    wrong: entry.wrong,
    quizScore: entry.quizScore ?? 0,
  })) ?? user?.progressHistory ?? [];
  const weekData = useMemo(() => getWeekData(progress), [progress]);
  const maxStudied = Math.max(1, ...weekData.map((item) => item.studied));
  const learnedCount = decksQuery.data.reduce(
    (total, deck) => total + deck.cards.filter((card) => card.isLearned).length,
    0
  );
  const correctAnswers = progress.reduce((sum, item) => sum + (item.correct ?? 0), 0);
  const wrongAnswers = progress.reduce((sum, item) => sum + (item.wrong ?? 0), 0);
  const answeredCount = correctAnswers + wrongAnswers;
  const scoredEntries = progress.filter((item) => item.quizScore > 0);
  const accuracy = answeredCount
    ? Math.round((correctAnswers / answeredCount) * 100)
    : scoredEntries.length
      ? Math.round(scoredEntries.reduce((sum, item) => sum + item.quizScore, 0) / scoredEntries.length)
      : 0;
  const streak = calculateStreak(progress, new Date());
  const isLoading = decksQuery.isLoading || progressQuery.isLoading;
  const isError = decksQuery.isError || progressQuery.isError;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
        <YStack flex={1} alignItems="center" justifyContent="center" gap={12}>
          <ActivityIndicator size="large" color={BRAND_COLORS.crimson} />
          <Text color={colors.textSecondary}>Đang tải thống kê...</Text>
        </YStack>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
        <YStack flex={1} alignItems="center" justifyContent="center" padding={24} gap={12}>
          <Text color={colors.textPrimary}>Không tải được dữ liệu thống kê.</Text>
          <Button onPress={() => { decksQuery.refetch(); progressQuery.refetch(); }}>Thử lại</Button>
        </YStack>
      </SafeAreaView>
    );
  }

  const metricCard = (title: string, value: string, icon: keyof typeof Ionicons.glyphMap) => (
    <YStack flex={1} minWidth={135} padding={16} borderRadius={16} backgroundColor={colors.cardBg} borderWidth={1} borderColor={colors.borderColor} gap={9}>
      <Ionicons name={icon} size={20} color={BRAND_COLORS.crimson} />
      <Text fontSize={23} fontWeight="900" color={colors.textPrimary}>{value}</Text>
      <Text fontSize={12} color={colors.textSecondary}>{title}</Text>
    </YStack>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: isWide ? 24 : 18, paddingBottom: 32 }}
      >
      <YStack gap={18} maxWidth={1120} width="100%" alignSelf="center">
        <XStack alignItems="center" justifyContent="space-between" gap={12}>
          <YStack flex={1} gap={4}>
            <Text fontSize={26} fontWeight="900" color={colors.textPrimary}>Thống kê học tập</Text>
            <Text color={colors.textSecondary}>Theo dõi tiến độ và duy trì thói quen mỗi ngày.</Text>
          </YStack>
          <Button size="sm" backgroundColor={colors.subtleBg} onPress={() => router.push('/settings')}>
            <Ionicons name="person-outline" size={16} color={colors.textPrimary} />
            <Text color={colors.textPrimary} marginLeft={6}>Hồ sơ</Text>
          </Button>
        </XStack>
        {decksQuery.data.length === 0 && progress.length === 0 ? (
          <YStack padding={16} borderRadius={14} backgroundColor={colors.subtleBg}>
            <Text color={colors.textSecondary}>Bắt đầu học để xem thống kê của bạn tại đây.</Text>
          </YStack>
        ) : null}
        <XStack flexDirection={isWide ? 'row' : 'column'} gap={16} alignItems="stretch">
          <YStack flex={isWide ? 1 : undefined} width={isWide ? undefined : '100%'} gap={14}>
            <XStack gap={12} flexWrap="wrap">
              {metricCard('Từ đã thuộc', String(learnedCount), 'book')}
              {metricCard('Độ chính xác', `${accuracy}%`, 'checkmark-circle')}
            </XStack>
            <Animated.View entering={FadeInDown.duration(320)}>
              <YStack padding={18} borderRadius={18} backgroundColor={colors.cardBg} borderWidth={1} borderColor={colors.borderColor} gap={12}>
                <XStack alignItems="center" gap={10}>
                  <Ionicons name="flame" size={22} color={BRAND_COLORS.goldDark} />
                  <Text fontSize={17} fontWeight="800" color={colors.textPrimary}>Chuỗi học hiện tại</Text>
                </XStack>
                <XStack alignItems="baseline" gap={8}>
                  <Text fontSize={40} fontWeight="900" color={colors.brandAccent}>{streak}</Text>
                  <Text color={colors.textSecondary}>ngày liên tiếp</Text>
                </XStack>
                <Text fontSize={12} color={colors.textMuted}>Chỉ tính những ngày có học ít nhất một thẻ.</Text>
              </YStack>
            </Animated.View>
          </YStack>
          <YStack
            flex={isWide ? 1 : undefined}
            width={isWide ? undefined : '100%'}
            minHeight={260}
            padding={18}
            borderRadius={18}
            backgroundColor={colors.cardBg}
            borderWidth={1}
            borderColor={colors.borderColor}
            gap={14}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text flexShrink={1} fontSize={17} fontWeight="800" color={colors.textPrimary}>Thẻ đã học · 7 ngày</Text>
              <Ionicons name="bar-chart" size={20} color={BRAND_COLORS.crimson} />
            </XStack>
            <XStack height={150} alignItems="stretch" justifyContent="space-around" gap={8}>
              {weekData.map((day, index) => {
                const barHeight = day.studied ? Math.max(8, (day.studied / maxStudied) * 100) : 4;
                return (
                  <YStack
                    key={day.date}
                    flex={1}
                    minWidth={0}
                    alignItems="center"
                    justifyContent="flex-end"
                    gap={6}
                  >
                    <Text minHeight={14} fontSize={10} color={colors.textMuted}>
                      {day.studied}
                    </Text>
                    <YStack
                      height={104}
                      width="100%"
                      alignItems="center"
                      justifyContent="flex-end"
                    >
                      <Animated.View entering={FadeInDown.delay(index * 45).duration(260)}>
                        <YStack
                          width={isWide ? 34 : 26}
                          height={barHeight}
                          borderRadius={7}
                          backgroundColor={day.studied ? BRAND_COLORS.gold : colors.subtleBg}
                        />
                      </Animated.View>
                    </YStack>
                    <Text minHeight={14} fontSize={10} color={colors.textSecondary}>
                      {day.label}
                    </Text>
                  </YStack>
                );
              })}
            </XStack>
            <Text fontSize={11} color={colors.textMuted}>Tổng số thẻ học trong tuần: {weekData.reduce((sum, day) => sum + day.studied, 0)}</Text>
          </YStack>
        </XStack>
      </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
