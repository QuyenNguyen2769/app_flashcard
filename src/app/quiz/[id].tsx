import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Input, Text, XStack, YStack } from 'tamagui';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';
import { useDeckDetailQuery } from '@/hooks/useFlashcardQueries';
import { CardItem } from '@/types/flashcard';
import { goBackSafely } from '@/utils/navigation';

type QuizMode = 'multiple_choice' | 'type_word';

interface QuizQuestion {
  card: CardItem;
  mode: QuizMode;
  options: string[];
}

interface QuizAnswer {
  cardId: string;
  deckId: string;
  term: string;
  definition: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

function shuffle<T>(values: T[]): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const deckId = typeof id === 'string' ? id : '';
  const { colors } = useAuth();
  const { width, height } = useWindowDimensions();
  const isWide = width >= 768 || width > height;
  const { data: deck, isLoading, isError, refetch } = useDeckDetailQuery(deckId);
  const [mode, setMode] = useState<QuizMode>('multiple_choice');
  const [questionCount, setQuestionCount] = useState('10');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [setupError, setSetupError] = useState('');

  const currentQuestion = questions[questionIndex];
  const score = answers.filter((answer) => answer.isCorrect).length;
  const progress = questions.length ? questionIndex / questions.length : 0;
  const questionPool = useMemo(() => deck?.cards ?? [], [deck?.cards]);

  const startQuiz = () => {
    setSetupError('');
    const requestedCount = Number(questionCount);
    if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 30) {
      setSetupError('Số câu hỏi phải từ 1 đến 30.');
      return;
    }

    const generated: QuizQuestion[] = questionPool.map((card) => {
      if (mode === 'type_word') return { card, mode, options: [] };
      const wrongMeanings = Array.from(
        new Set(
          shuffle(
            questionPool
              .filter((other) => other.id !== card.id && other.definition.trim() !== card.definition.trim())
              .map((other) => other.definition)
          )
        )
      ).slice(0, 3);
      return {
        card,
        mode,
        options: shuffle([card.definition, ...wrongMeanings]),
      };
    });

    const usableQuestions =
      mode === 'multiple_choice'
        ? generated.filter((question) => question.options.length === 4)
        : generated;
    if (usableQuestions.length === 0) {
      setSetupError('Trắc nghiệm cần ít nhất 4 thẻ có nghĩa khác nhau. Hãy thêm thẻ hoặc chọn chế độ gõ từ.');
      return;
    }

    setQuestions(shuffle(usableQuestions).slice(0, Math.min(requestedCount, usableQuestions.length)));
    setAnswers([]);
    setQuestionIndex(0);
    setFeedback(null);
    setTypedAnswer('');
    setSelectedAnswer('');
  };

  const submitAnswer = () => {
    if (!currentQuestion || feedback) return;
    const card = currentQuestion.card;
    const response = mode === 'multiple_choice' ? selectedAnswer : typedAnswer.trim();
    if (!response) {
      setSetupError('Hãy chọn hoặc nhập câu trả lời trước.');
      return;
    }
    const correctAnswer = mode === 'multiple_choice' ? card.definition : card.term;
    const isCorrect = response.trim().toLocaleLowerCase() === correctAnswer.trim().toLocaleLowerCase();
    setSetupError('');
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setAnswers((previous) => [
      ...previous,
      {
        cardId: card.id,
        deckId,
        term: card.term,
        definition: card.definition,
        userAnswer: response,
        correctAnswer,
        isCorrect,
      },
    ]);
  };

  const goToNext = () => {
    if (questionIndex + 1 >= questions.length) {
      const resultAnswers = [
        ...answers,
      ];
      router.replace({
        pathname: '/quiz-result/[id]',
        params: {
          id: deckId,
          results: JSON.stringify(resultAnswers),
        },
      });
      return;
    }
    setQuestionIndex((value) => value + 1);
    setFeedback(null);
    setTypedAnswer('');
    setSelectedAnswer('');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
        <YStack flex={1} alignItems="center" justifyContent="center" gap={12}>
          <ActivityIndicator size="large" color={BRAND_COLORS.crimson} />
          <Text color={colors.textSecondary}>Đang tải câu hỏi...</Text>
        </YStack>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
        <YStack flex={1} padding={24} justifyContent="center" alignItems="center" gap={12}>
          <Text color={colors.textPrimary}>Không tải được dữ liệu bộ từ.</Text>
          <Button onPress={() => refetch()}>Thử lại</Button>
          <Button onPress={() => goBackSafely({ pathname: '/deck/[id]', params: { id: deckId } })}>Quay lại</Button>
        </YStack>
      </SafeAreaView>
    );
  }

  const header = (
    <XStack alignItems="center" gap={12}>
      <Button size="md" circular onPress={() => goBackSafely({ pathname: '/deck/[id]', params: { id: deckId } })}>
        <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
      </Button>
      <YStack flex={1}>
        <Text fontSize={20} fontWeight="800" color={colors.textPrimary}>Trắc nghiệm</Text>
        <Text color={colors.textSecondary}>{deck?.title}</Text>
      </YStack>
      {currentQuestion ? <Text color={colors.textSecondary}>{questionIndex + 1}/{questions.length}</Text> : null}
    </XStack>
  );

  if (!deck || deck.cards.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
        <YStack flex={1} padding={24} justifyContent="center" gap={18} maxWidth={640} width="100%" alignSelf="center">
          {header}
          <YStack padding={24} borderRadius={18} backgroundColor={colors.cardBg} alignItems="center" gap={12}>
            <Text color={colors.textPrimary}>Bộ từ chưa có thẻ để tạo câu hỏi.</Text>
            <Button onPress={() => goBackSafely({ pathname: '/deck/[id]', params: { id: deckId } })}>Quay lại bộ từ</Button>
          </YStack>
        </YStack>
      </SafeAreaView>
    );
  }

  if (!currentQuestion) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
        <YStack flex={1} padding={20} gap={18} maxWidth={880} width="100%" alignSelf="center">
          {header}
          <XStack flexDirection={isWide ? 'row' : 'column'} gap={16} alignItems="stretch">
            <YStack flex={1} padding={20} borderRadius={18} backgroundColor={colors.cardBg} borderWidth={1} borderColor={colors.borderColor} gap={16}>
              <Text fontSize={19} fontWeight="800" color={colors.textPrimary}>Thiết lập bài kiểm tra</Text>
              <Text color={colors.textSecondary}>Chọn hình thức câu hỏi</Text>
              <XStack gap={10} flexWrap="wrap">
                <Button flex={1} backgroundColor={mode === 'multiple_choice' ? BRAND_COLORS.crimson : colors.subtleBg} onPress={() => setMode('multiple_choice')}>
                  <Text color={mode === 'multiple_choice' ? 'white' : colors.textPrimary}>Trắc nghiệm</Text>
                </Button>
                <Button flex={1} backgroundColor={mode === 'type_word' ? BRAND_COLORS.crimson : colors.subtleBg} onPress={() => setMode('type_word')}>
                  <Text color={mode === 'type_word' ? 'white' : colors.textPrimary}>Gõ từ</Text>
                </Button>
              </XStack>
              <Text color={colors.textSecondary}>Số câu hỏi (tối đa 30)</Text>
              <Input value={questionCount} onChangeText={setQuestionCount} keyboardType="number-pad" backgroundColor={colors.inputBg} color={colors.textPrimary} borderColor={colors.borderColor} />
              {setupError ? <Text color="$red10">{setupError}</Text> : null}
              <Button backgroundColor={BRAND_COLORS.crimson} onPress={startQuiz}>
                <Text color="white" fontWeight="800">Bắt đầu</Text>
              </Button>
            </YStack>
            <YStack flex={1} padding={20} borderRadius={18} backgroundColor={colors.subtleBg} gap={8} justifyContent="center">
              <Text fontSize={16} fontWeight="800" color={colors.textPrimary}>Bộ từ có {deck.cards.length} thẻ</Text>
              <Text color={colors.textSecondary}>Điểm hiện tại: {score}</Text>
              <Text color={colors.textSecondary}>Chế độ trắc nghiệm cần tối thiểu 4 nghĩa phân biệt.</Text>
            </YStack>
          </XStack>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <YStack flex={1} padding={isWide ? 24 : 16} gap={16} maxWidth={1100} width="100%" alignSelf="center">
        {header}
        <YStack height={8} borderRadius={999} backgroundColor={colors.subtleBg} overflow="hidden">
          <Animated.View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: BRAND_COLORS.gold }} />
        </YStack>
        <XStack flex={1} flexDirection={isWide ? 'row' : 'column'} gap={18} alignItems="stretch">
          <YStack flex={1} padding={20} borderRadius={20} backgroundColor={colors.cardBg} borderColor={colors.borderColor} borderWidth={1} justifyContent="center" gap={14}>
            <Text color={colors.brandAccent} fontSize={12} fontWeight="800">{mode === 'multiple_choice' ? 'CHỌN NGHĨA ĐÚNG' : 'GÕ TỪ VỰNG'}</Text>
            <Text color={colors.textPrimary} fontSize={isWide ? 26 : 22} fontWeight="800">
              {mode === 'multiple_choice' ? currentQuestion.card.term : currentQuestion.card.definition}
            </Text>
            {currentQuestion.card.phonetic ? <Text color={colors.textSecondary}>{currentQuestion.card.phonetic}</Text> : null}
            {mode === 'type_word' ? (
              <Input value={typedAnswer} onChangeText={setTypedAnswer} autoCapitalize="none" placeholder="Nhập từ tiếng Anh..." backgroundColor={colors.inputBg} color={colors.textPrimary} borderColor={colors.borderColor} />
            ) : null}
          </YStack>
          <YStack flex={1} gap={10} justifyContent="center">
            {mode === 'multiple_choice'
              ? currentQuestion.options.map((option) => (
                  <Button
                    key={option}
                    size="lg"
                    justifyContent="flex-start"
                    backgroundColor={selectedAnswer === option ? colors.goldBadgeBg : colors.cardBg}
                    borderWidth={1}
                    borderColor={selectedAnswer === option ? BRAND_COLORS.gold : colors.borderColor}
                    disabled={Boolean(feedback)}
                    onPress={() => setSelectedAnswer(option)}
                  >
                    <Text color={colors.textPrimary} textAlign="left">{option}</Text>
                  </Button>
                ))
              : null}
            {feedback ? (
              <Animated.View entering={FadeInDown.duration(220)}>
                <YStack padding={12} borderRadius={12} backgroundColor={feedback === 'correct' ? BRAND_COLORS.emeraldSoft : colors.brandBadgeBg}>
                <Text fontWeight="800" color={feedback === 'correct' ? BRAND_COLORS.emerald : colors.brandBadgeText}>
                    {feedback === 'correct' ? 'Chính xác!' : `Chưa đúng. Đáp án: ${currentQuestion.card.term}`}
                  </Text>
                </YStack>
              </Animated.View>
            ) : null}
            <Button backgroundColor={BRAND_COLORS.crimson} onPress={feedback ? goToNext : submitAnswer}>
              <Text color="white" fontWeight="800">{feedback ? questionIndex + 1 === questions.length ? 'Xem kết quả' : 'Câu tiếp theo' : 'Trả lời'}</Text>
            </Button>
            {setupError ? <Text color="$red10">{setupError}</Text> : null}
          </YStack>
        </XStack>
      </YStack>
    </SafeAreaView>
  );
}
