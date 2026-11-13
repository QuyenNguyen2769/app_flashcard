import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Text, XStack, YStack } from 'tamagui';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';
import {
  useRecordQuizMutation,
  useSpacedRepetitionMutation,
} from '@/hooks/useFlashcardQueries';

interface QuizResultAnswer {
  cardId: string;
  deckId: string;
  term: string;
  definition: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

function parseResults(raw: string | string[] | undefined): QuizResultAnswer[] | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    if (
      parsed.some(
        (answer) =>
          typeof answer !== 'object' ||
          answer === null ||
          typeof answer.cardId !== 'string' ||
          typeof answer.deckId !== 'string' ||
          typeof answer.term !== 'string' ||
          typeof answer.definition !== 'string' ||
          typeof answer.userAnswer !== 'string' ||
          typeof answer.correctAnswer !== 'string' ||
          typeof answer.isCorrect !== 'boolean'
      )
    ) {
      return null;
    }
    return parsed as QuizResultAnswer[];
  } catch {
    return null;
  }
}

export default function QuizResultScreen() {
  const { id, results: rawResults } = useLocalSearchParams<{
    id: string;
    results?: string;
  }>();
  const deckId = typeof id === 'string' ? id : '';
  const { user, colors } = useAuth();
  const { width, height } = useWindowDimensions();
  const isWide = width >= 768 || width > height;
  const resultAnswers = useMemo(() => parseResults(rawResults), [rawResults]);
  const correctCount = resultAnswers?.filter((answer) => answer.isCorrect).length ?? 0;
  const totalCount = resultAnswers?.length ?? 0;
  const percentage = totalCount ? Math.round((correctCount / totalCount) * 100) : 0;
  const wrongAnswers = resultAnswers?.filter((answer) => !answer.isCorrect) ?? [];
  const updateCard = useSpacedRepetitionMutation();
  const saveQuiz = useRecordQuizMutation();
  const saveStarted = useRef(false);
  const savedCardKeys = useRef(new Set<string>());
  const progressSaved = useRef(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [displayedScore, setDisplayedScore] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!resultAnswers || !totalCount) return;
    let score = 0;
    const interval = setInterval(() => {
      score = Math.min(score + Math.max(1, Math.ceil(percentage / 30)), percentage);
      setDisplayedScore(score);
      if (score >= percentage) clearInterval(interval);
    }, 22);
    return () => clearInterval(interval);
  }, [percentage, resultAnswers, totalCount]);

  useEffect(() => {
    if (!resultAnswers || !totalCount || saveStarted.current) return;
    if (!user) {
      setSaveError('Bạn cần đăng nhập để lưu tiến độ bài kiểm tra.');
      return;
    }
    saveStarted.current = true;
    setIsSaving(true);
    setSaveError('');
    void (async () => {
      try {
        for (const answer of resultAnswers) {
          const cardKey = `${answer.deckId}:${answer.cardId}`;
          if (savedCardKeys.current.has(cardKey)) continue;
          await updateCard.mutateAsync({
            deckId: answer.deckId,
            cardId: answer.cardId,
            isKnown: answer.isCorrect,
          });
          savedCardKeys.current.add(cardKey);
        }
        if (!progressSaved.current) {
          await saveQuiz.mutateAsync({
            userId: user.id,
            scorePercent: percentage,
            studiedCount: totalCount,
            correctCount,
            wrongCount: totalCount - correctCount,
          });
          progressSaved.current = true;
        }
      } catch {
        setSaveError('Không lưu được toàn bộ kết quả. Hãy thử lưu lại.');
      } finally {
        setIsSaving(false);
      }
    })();
  }, [correctCount, percentage, resultAnswers, retryAttempt, saveQuiz, totalCount, updateCard, user]);

  if (!resultAnswers || !totalCount) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
        <YStack flex={1} alignItems="center" justifyContent="center" padding={24} gap={14}>
          <Text color={colors.textPrimary} fontSize={20} fontWeight="800">Không đọc được kết quả bài kiểm tra.</Text>
          <Button onPress={() => router.replace({ pathname: '/deck/[id]', params: { id: deckId } })}>
            <Text>Quay lại bộ từ</Text>
          </Button>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <YStack flex={1} padding={isWide ? 24 : 16} gap={16} maxWidth={1120} width="100%" alignSelf="center">
        <XStack alignItems="center" gap={12}>
          <Button size="md" circular onPress={() => router.replace({ pathname: '/deck/[id]', params: { id: deckId } })}>
            <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
          </Button>
          <Text fontSize={20} fontWeight="800" color={colors.textPrimary}>Kết quả trắc nghiệm</Text>
        </XStack>

        <XStack flex={1} flexDirection={isWide ? 'row' : 'column'} gap={16} alignItems="stretch">
          <YStack flex={isWide ? 0.8 : undefined} padding={24} borderRadius={20} backgroundColor={colors.cardBg} borderWidth={1} borderColor={colors.borderColor} alignItems="center" justifyContent="center" gap={10}>
            <Ionicons name="trophy" size={42} color={BRAND_COLORS.gold} />
            <Text fontSize={46} fontWeight="900" color={colors.brandAccent}>{displayedScore}%</Text>
            <Text fontSize={16} fontWeight="700" color={colors.textPrimary}>
              {correctCount} / {totalCount} câu đúng
            </Text>
            <Text fontSize={13} color={colors.textSecondary}>
              {percentage >= 80 ? 'Làm rất tốt!' : 'Hãy ôn lại các thẻ chưa đúng nhé.'}
            </Text>
            {isSaving ? (
              <XStack alignItems="center" gap={8}>
                <ActivityIndicator size="small" color={BRAND_COLORS.crimson} />
                <Text color={colors.textSecondary}>Đang lưu tiến độ...</Text>
              </XStack>
            ) : null}
            {saveError ? <Text color="$red10" textAlign="center">{saveError}</Text> : null}
            {saveError && user ? (
              <Button
                size="sm"
                backgroundColor={colors.subtleBg}
                onPress={() => {
                  saveStarted.current = false;
                  setRetryAttempt((attempt) => attempt + 1);
                }}
              >
                <Text color={colors.textPrimary}>Lưu lại tiến độ</Text>
              </Button>
            ) : null}
            <XStack gap={10} flexWrap="wrap" justifyContent="center" marginTop={8}>
              <Button backgroundColor={BRAND_COLORS.crimson} onPress={() => router.replace({ pathname: '/quiz/[id]', params: { id: deckId } })}>
                <Text color="white" fontWeight="800">Làm lại</Text>
              </Button>
              <Button backgroundColor={colors.subtleBg} onPress={() => router.replace({ pathname: '/deck/[id]', params: { id: deckId } })}>
                <Text color={colors.textPrimary} fontWeight="800">Về bộ từ</Text>
              </Button>
            </XStack>
          </YStack>

          <YStack flex={1} gap={10} minHeight={isWide ? 0 : 240}>
            <Text fontSize={17} fontWeight="800" color={colors.textPrimary}>Câu trả lời chưa đúng ({wrongAnswers.length})</Text>
            {wrongAnswers.length === 0 ? (
              <YStack padding={18} borderRadius={14} backgroundColor={colors.cardBg}>
                <Text color={colors.textSecondary}>Tuyệt vời, bạn đã trả lời đúng tất cả!</Text>
              </YStack>
            ) : (
              <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
                {wrongAnswers.map((answer, index) => (
                  <Animated.View key={`${answer.cardId}-${index}`} entering={FadeInDown.delay(index * 45).duration(220)}>
                    <YStack padding={14} borderRadius={14} borderWidth={1} borderColor={colors.borderColor} backgroundColor={colors.cardBg} gap={6}>
                      <Text fontWeight="800" color={colors.textPrimary}>{answer.term}</Text>
                      <Text color={BRAND_COLORS.crimson}>Bạn trả lời: {answer.userAnswer || '—'}</Text>
                      <Text color={colors.textSecondary}>Đáp án đúng: {answer.correctAnswer}</Text>
                    </YStack>
                  </Animated.View>
                ))}
              </ScrollView>
            )}
          </YStack>
        </XStack>
      </YStack>
    </SafeAreaView>
  );
}
