import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Text, TextArea, XStack, YStack } from 'tamagui';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';
import { useCreateDeckMutation } from '@/hooks/useFlashcardQueries';
import {
  GeneratedWord,
  LearningLevel,
  generateVocabulary,
} from '@/services/aiService';
import { formatLocalDate } from '@/utils/spacedRepetition';

const LEVELS: { value: LearningLevel; label: string }[] = [
  { value: 'beginner', label: 'Cơ bản' },
  { value: 'intermediate', label: 'Trung cấp' },
  { value: 'advanced', label: 'Nâng cao' },
];

export default function AICreateScreen() {
  const { colors, user } = useAuth();
  const { width, height } = useWindowDimensions();
  const isWide = width >= 768 || width > height;
  const createMutation = useCreateDeckMutation();
  const [topic, setTopic] = useState('');
  const [wordCount, setWordCount] = useState('8');
  const [level, setLevel] = useState<LearningLevel>('beginner');
  const [preview, setPreview] = useState<GeneratedWord[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const generate = async () => {
    const count = Number(wordCount);
    if (!topic.trim()) {
      setErrorMessage('Vui lòng nhập chủ đề.');
      return;
    }
    if (!Number.isInteger(count) || count < 5 || count > 20) {
      setErrorMessage('Số lượng từ phải từ 5 đến 20.');
      return;
    }
    setErrorMessage('');
    setIsGenerating(true);
    try {
      const words = await generateVocabulary({
        topic: topic.trim(),
        count,
        level,
      });
      setPreview(words);
      setSelected(words.map(() => true));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tạo bộ từ bằng AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveDeck = async () => {
    const chosenWords = preview.filter((_, index) => selected[index]);
    if (!chosenWords.length) {
      setErrorMessage('Hãy chọn ít nhất một từ để lưu.');
      return;
    }
    setErrorMessage('');
    try {
      const today = formatLocalDate(new Date());
      const created = await createMutation.mutateAsync({
        userId: user?.id || '1',
        title: `Từ vựng: ${topic.trim()}`,
        description: `Bộ từ vựng mức ${level} được tạo cho chủ đề "${topic.trim()}".`,
        category: topic.trim().slice(0, 40),
        isFavorite: false,
        cards: chosenWords.map((item, index) => ({
          id: `ai_${Date.now()}_${index}`,
          term: item.word.trim(),
          definition: item.meaning.trim(),
          phonetic: item.phonetic.trim(),
          example: item.example.trim(),
          isLearned: false,
          needReview: true,
          leitnerLevel: 0,
          nextReviewDate: today,
        })),
      });
      router.replace({ pathname: '/deck/[id]', params: { id: created.id } });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu bộ từ.');
    }
  };

  const updatePreview = (index: number, patch: Partial<GeneratedWord>) => {
    setPreview((words) =>
      words.map((word, wordIndex) => (wordIndex === index ? { ...word, ...patch } : word))
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.pageBg }}
        contentContainerStyle={{ padding: isWide ? 24 : 18, paddingBottom: 36 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack gap={18} maxWidth={1120} width="100%" alignSelf="center">
          <XStack alignItems="center" gap={12}>
            <YStack width={50} height={50} borderRadius={16} backgroundColor={BRAND_COLORS.navy} borderWidth={1.5} borderColor={BRAND_COLORS.gold} alignItems="center" justifyContent="center">
              <Ionicons name="sparkles" size={25} color={BRAND_COLORS.gold} />
            </YStack>
            <YStack flex={1}>
              <Text fontSize={23} fontWeight="900" color={colors.textPrimary}>Tạo bộ từ bằng AI</Text>
              <Text fontSize={13} color={colors.textSecondary}>Tạo bản xem trước, chỉnh sửa rồi mới lưu.</Text>
            </YStack>
          </XStack>

          <XStack flexDirection={isWide ? 'row' : 'column'} gap={16} alignItems="stretch">
            <YStack flex={1} padding={18} borderRadius={18} borderWidth={1} borderColor={colors.borderColor} backgroundColor={colors.cardBg} gap={12}>
              <Text fontSize={16} fontWeight="800" color={colors.textPrimary}>Yêu cầu tạo từ vựng</Text>
              <Text color={colors.textSecondary}>Chủ đề</Text>
              <Input value={topic} onChangeText={setTopic} placeholder="Ví dụ: du lịch, công nghệ, môi trường..." backgroundColor={colors.inputBg} color={colors.textPrimary} borderColor={colors.borderColor} />
              <XStack gap={12}>
                <YStack flex={1} gap={6}>
                  <Text color={colors.textSecondary}>Số từ (5–20)</Text>
                  <Input value={wordCount} onChangeText={setWordCount} keyboardType="number-pad" backgroundColor={colors.inputBg} color={colors.textPrimary} borderColor={colors.borderColor} />
                </YStack>
              </XStack>
              <Text color={colors.textSecondary}>Trình độ</Text>
              <XStack gap={8} flexWrap="wrap">
                {LEVELS.map((item) => (
                  <Button
                    key={item.value}
                    flex={1}
                    backgroundColor={level === item.value ? BRAND_COLORS.crimson : colors.subtleBg}
                    onPress={() => setLevel(item.value)}
                  >
                    <Text color={level === item.value ? 'white' : colors.textPrimary}>{item.label}</Text>
                  </Button>
                ))}
              </XStack>
              <Button backgroundColor={BRAND_COLORS.crimson} disabled={isGenerating} onPress={generate}>
                {isGenerating ? (
                  <ActivityIndicator size="small" color={BRAND_COLORS.gold} />
                ) : (
                  <>
                    <Ionicons name="flash" size={18} color={BRAND_COLORS.gold} />
                    <Text color="white" fontWeight="800" marginLeft={8}>Tạo bản xem trước</Text>
                  </>
                )}
              </Button>
              {errorMessage ? (
                <YStack
                  width="100%"
                  padding={10}
                  borderRadius={10}
                  backgroundColor={colors.subtleBg}
                  borderWidth={1}
                  borderColor={colors.borderColor}
                  gap={4}
                >
                  <Text width="100%" flexShrink={1} color="$red10" fontSize={12} lineHeight={18}>
                    {errorMessage}
                  </Text>
                  {errorMessage.startsWith('Chưa cấu hình dịch vụ AI') ? (
                    <Text width="100%" flexShrink={1} color={colors.textSecondary} fontSize={12} lineHeight={18}>
                      Tạo file .env từ .env.example, điền URL và API key, sau đó khởi động lại Expo.
                    </Text>
                  ) : null}
                </YStack>
              ) : null}
              {isGenerating ? <Text fontSize={12} color={colors.textMuted}>Đang tạo từ vựng, yêu cầu sẽ dừng nếu quá 20 giây...</Text> : null}
            </YStack>

            {preview.length ? (
              <YStack flex={isWide ? 1.5 : undefined} gap={12}>
                <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={8}>
                  <Text fontSize={16} fontWeight="800" color={colors.textPrimary}>Xem trước ({selected.filter(Boolean).length}/{preview.length} đã chọn)</Text>
                  <Button size="sm" backgroundColor={BRAND_COLORS.crimson} disabled={createMutation.isPending} onPress={saveDeck}>
                    {createMutation.isPending ? <ActivityIndicator size="small" color="white" /> : <Text color="white" fontWeight="800">Lưu bộ từ</Text>}
                  </Button>
                </XStack>
                <XStack flexWrap="wrap" gap={10}>
                  {preview.map((word, index) => (
                    <YStack
                      key={`${word.word}-${index}`}
                      width={isWide ? '48%' : '100%'}
                      opacity={selected[index] ? 1 : 0.55}
                      padding={14}
                      borderRadius={15}
                      borderWidth={1}
                      borderColor={selected[index] ? colors.borderColor : colors.textMuted}
                      backgroundColor={colors.cardBg}
                      gap={8}
                    >
                      <XStack alignItems="center" justifyContent="space-between">
                        <Text color={colors.textSecondary} fontSize={12}>Thẻ {index + 1}</Text>
                        <Button
                          size="xs"
                          circular
                          backgroundColor={selected[index] ? colors.goldBadgeBg : colors.subtleBg}
                          onPress={() => setSelected((values) => values.map((value, valueIndex) => valueIndex === index ? !value : value))}
                        >
                          <Ionicons name={selected[index] ? 'checkmark' : 'add'} size={15} color={colors.textPrimary} />
                        </Button>
                      </XStack>
                      <Input value={word.word} onChangeText={(value) => updatePreview(index, { word: value })} placeholder="Từ vựng" backgroundColor={colors.inputBg} color={colors.textPrimary} borderColor={colors.borderColor} />
                      <Input value={word.phonetic} onChangeText={(value) => updatePreview(index, { phonetic: value })} placeholder="Phiên âm" backgroundColor={colors.inputBg} color={colors.textPrimary} borderColor={colors.borderColor} />
                      <TextArea value={word.meaning} onChangeText={(value) => updatePreview(index, { meaning: value })} placeholder="Nghĩa" backgroundColor={colors.inputBg} color={colors.textPrimary} borderColor={colors.borderColor} rows={2} />
                      <TextArea value={word.example} onChangeText={(value) => updatePreview(index, { example: value })} placeholder="Câu ví dụ" backgroundColor={colors.inputBg} color={colors.textPrimary} borderColor={colors.borderColor} rows={2} />
                    </YStack>
                  ))}
                </XStack>
              </YStack>
            ) : null}
          </XStack>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
