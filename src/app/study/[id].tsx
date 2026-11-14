import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Button, Text, XStack, YStack } from 'tamagui';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';
import {
  useDeckDetailQuery,
  useDecksQuery,
  useRecordStudyProgressMutation,
  useSpacedRepetitionMutation,
} from '@/hooks/useFlashcardQueries';
import { isDueForReview } from '@/utils/spacedRepetition';
import { CardItem, ReviewCardWithDeck } from '@/types/flashcard';
import { goBackSafely } from '@/utils/navigation';

type StudyCard = CardItem & Pick<ReviewCardWithDeck, 'deckId' | 'deckTitle' | 'category'>;

export default function StudyScreen() {
  const { id, due } = useLocalSearchParams<{ id: string; due?: string }>();
  const deckId = typeof id === 'string' ? id : '';
  const dueOnly = due === 'true';
  const { user, colors } = useAuth();
  const { width, height } = useWindowDimensions();
  const isWide = width >= 768 || width > height;
  const deckQuery = useDeckDetailQuery(deckId);
  const decksQuery = useDecksQuery();
  const updateCard = useSpacedRepetitionMutation();
  const saveProgress = useRecordStudyProgressMutation();
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const flipProgress = useSharedValue(0);
  const translateX = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  const studyCards = useMemo<StudyCard[]>(() => {
    if (dueOnly) {
      return decksQuery.data.flatMap((deck) =>
        deck.cards
          .filter((card) => isDueForReview(card, new Date()))
          .map((card) => ({
            ...card,
            deckId: deck.id,
            deckTitle: deck.title,
            category: deck.category,
          }))
      );
    }
    return (deckQuery.data?.cards ?? []).map((card) => ({
      ...card,
      deckId: deckQuery.data!.id,
      deckTitle: deckQuery.data!.title,
      category: deckQuery.data!.category,
    }));
  }, [deckQuery.data, decksQuery.data, dueOnly]);

  const currentCard = studyCards[index];
  const progress = studyCards.length ? Math.min(index / studyCards.length, 1) : 0;
  useEffect(() => {
    progressWidth.value = withTiming(progress * 100, { duration: 280 });
  }, [progress, progressWidth]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const handleAnswer = (isKnown: boolean) => {
    if (isSaving || !currentCard) return;
    setIsSaving(true);
    setErrorMessage('');
    void (async () => {
      try {
        await updateCard.mutateAsync({
          deckId: currentCard.deckId,
          cardId: currentCard.id,
          isKnown,
        });
        if (user) {
          try {
            await saveProgress.mutateAsync({
              userId: user.id,
              isCorrect: isKnown,
            });
          } catch {
            setErrorMessage('Đã lưu thẻ nhưng chưa lưu được tiến độ hôm nay.');
          }
        }
        if (isKnown) setCorrect((value) => value + 1);
        else setWrong((value) => value + 1);
        setIndex((value) => value + 1);
        setIsFlipped(false);
        flipProgress.value = withTiming(0, { duration: 180 });
      } catch {
        setErrorMessage('Không thể lưu kết quả thẻ. Vui lòng thử lại.');
      } finally {
        translateX.value = 0;
        setIsSaving(false);
      }
    })();
  };

  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-80, 80],
    onUpdate: (event) => {
      translateX.value = event.translationX;
    },
    onDeactivate: (event) => {
      const isKnown = event.translationX > 90;
      const isUnknown = event.translationX < -90;
      if (isKnown || isUnknown) {
        const target = isKnown ? width + 100 : -width - 100;
        translateX.value = withTiming(target, { duration: 220 }, (finished) => {
          if (finished) runOnJS(handleAnswer)(isKnown);
        });
      } else {
        translateX.value = withSpring(0);
      }
    },
  });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${interpolate(translateX.value, [-width, width], [-12, 12], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const frontAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flipProgress.value, [0, 180], [0, 180])}deg` },
    ],
    opacity: interpolate(flipProgress.value, [0, 85, 95, 180], [1, 1, 0, 0]),
  }));
  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flipProgress.value, [0, 180], [180, 360])}deg` },
    ],
    opacity: interpolate(flipProgress.value, [0, 85, 95, 180], [0, 0, 1, 1]),
  }));

  const toggleFlip = () => {
    const next = !isFlipped;
    setIsFlipped(next);
    flipProgress.value = withTiming(next ? 180 : 0, { duration: 360 });
  };

  const isLoading = dueOnly ? decksQuery.isLoading : deckQuery.isLoading;
  const loadError = dueOnly ? decksQuery.isError : deckQuery.isError;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
        <YStack flex={1} alignItems="center" justifyContent="center" gap={12}>
          <ActivityIndicator size="large" color={BRAND_COLORS.crimson} />
          <Text color={colors.textSecondary}>Đang tải thẻ học...</Text>
        </YStack>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
        <YStack flex={1} padding={24} justifyContent="center" alignItems="center" gap={14}>
          <Text color={colors.textPrimary} textAlign="center">Không tải được thẻ học.</Text>
          <Button onPress={() => (dueOnly ? decksQuery.refetch() : deckQuery.refetch())}>Thử lại</Button>
          <Button onPress={() => goBackSafely({ pathname: '/deck/[id]', params: { id: deckId } })}>Quay lại</Button>
        </YStack>
      </SafeAreaView>
    );
  }

  const header = (
    <XStack alignItems="center" justifyContent="space-between" gap={12}>
      <Button size="md" circular onPress={() => goBackSafely({ pathname: '/deck/[id]', params: { id: deckId } })}>
        <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
      </Button>
      <YStack flex={1}>
        <Text fontSize={18} fontWeight="800" color={colors.textPrimary}>
          {dueOnly ? 'Ôn tập đến hạn' : 'Học flashcard'}
        </Text>
        <Text fontSize={12} color={colors.textSecondary}>
          {currentCard?.deckTitle ?? 'Hoàn thành phiên học'}
        </Text>
      </YStack>
      <Text fontSize={13} fontWeight="700" color={colors.textSecondary}>
        {Math.min(index, studyCards.length)} / {studyCards.length}
      </Text>
    </XStack>
  );

  if (studyCards.length === 0 || index >= studyCards.length) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
        <YStack flex={1} padding={24} justifyContent="center" gap={20} maxWidth={640} width="100%" alignSelf="center">
          {header}
          <YStack backgroundColor={colors.cardBg} borderColor={colors.borderColor} borderWidth={1} borderRadius={20} padding={24} alignItems="center" gap={12}>
            <Ionicons name="trophy" size={42} color={BRAND_COLORS.gold} />
            <Text fontSize={23} fontWeight="800" color={colors.textPrimary}>
              {studyCards.length === 0 ? 'Không có thẻ cần ôn' : 'Hoàn thành phiên học!'}
            </Text>
            <Text color={colors.textSecondary}>Đã biết: {correct} · Cần ôn lại: {wrong}</Text>
            <Button backgroundColor={BRAND_COLORS.crimson} onPress={() => goBackSafely({ pathname: '/deck/[id]', params: { id: deckId } })}>
              <Text color="white" fontWeight="700">Quay lại</Text>
            </Button>
          </YStack>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <YStack flex={1} padding={isWide ? 24 : 16} gap={16} maxWidth={1100} width="100%" alignSelf="center">
        {header}
        <YStack height={8} borderRadius={999} backgroundColor={colors.subtleBg} overflow="hidden">
          <Animated.View
            style={[{
              height: '100%',
              backgroundColor: BRAND_COLORS.gold,
            }, progressBarStyle]}
          />
        </YStack>
        <XStack flex={1} gap={24} alignItems="center" justifyContent="center" flexDirection={isWide ? 'row' : 'column'}>
          <YStack flex={1} width="100%" maxWidth={isWide ? 620 : 560} gap={14}>
            <GestureDetector gesture={pan}>
              <Animated.View
                style={[
                  {
                    height: isWide ? Math.min(height * 0.48, 360) : Math.min(height * 0.48, 420),
                    minHeight: 210,
                    position: 'relative',
                  },
                  cardAnimatedStyle,
                ]}
              >
                <Animated.View style={[{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }, frontAnimatedStyle]}>
                  <YStack flex={1} backgroundColor={colors.cardBg} borderColor={colors.borderColor} borderWidth={1} borderRadius={24} alignItems="center" justifyContent="center" padding={24} gap={12}>
                    <Text color={colors.brandAccent} fontSize={12} fontWeight="800">{currentCard.category}</Text>
                    <Text color={colors.textPrimary} fontSize={34} fontWeight="800" textAlign="center">{currentCard.term}</Text>
                    <Text color={colors.textSecondary} fontSize={17}>{currentCard.phonetic || 'Chưa có phiên âm'}</Text>
                    <Text color={colors.textMuted} fontSize={12}>Chạm nút bên dưới để lật thẻ</Text>
                  </YStack>
                </Animated.View>
                <Animated.View style={[{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }, backAnimatedStyle]}>
                  <YStack flex={1} backgroundColor={colors.cardBg} borderColor={colors.borderColor} borderWidth={1} borderRadius={24} alignItems="center" justifyContent="center" padding={24} gap={14}>
                    <Text color={colors.brandAccent} fontSize={12} fontWeight="800">NGHĨA</Text>
                    <Text color={colors.textPrimary} fontSize={24} fontWeight="800" textAlign="center">{currentCard.definition}</Text>
                    {currentCard.example ? <Text color={colors.textSecondary} fontSize={16} textAlign="center" fontStyle="italic">{currentCard.example}</Text> : null}
                  </YStack>
                </Animated.View>
              </Animated.View>
            </GestureDetector>
            <Button alignSelf="center" size="md" backgroundColor={colors.subtleBg} onPress={toggleFlip}>
              <Ionicons name="sync-outline" size={17} color={colors.textPrimary} />
              <Text color={colors.textPrimary} marginLeft={8}>Lật thẻ</Text>
            </Button>
          </YStack>
          <YStack width={isWide ? 240 : '100%'} gap={12}>
            <Text color={colors.textSecondary} textAlign="center">
              Vuốt sang phải nếu đã biết, sang trái nếu cần ôn lại.
            </Text>
            {errorMessage ? <Text color="$red10" textAlign="center">{errorMessage}</Text> : null}
            <XStack gap={10}>
              <Button flex={1} backgroundColor={colors.subtleBg} disabled={isSaving} onPress={() => handleAnswer(false)}>
                <Ionicons name="close" size={18} color={BRAND_COLORS.crimson} />
                <Text color={colors.textPrimary} marginLeft={6}>Chưa biết</Text>
              </Button>
              <Button flex={1} backgroundColor={BRAND_COLORS.crimson} disabled={isSaving} onPress={() => handleAnswer(true)}>
                <Ionicons name="checkmark" size={18} color="white" />
                <Text color="white" marginLeft={6}>Đã biết</Text>
              </Button>
            </XStack>
            {isSaving ? <Text color={colors.textMuted} textAlign="center">Đang lưu tiến độ...</Text> : null}
          </YStack>
        </XStack>
      </YStack>
    </SafeAreaView>
  );
}
