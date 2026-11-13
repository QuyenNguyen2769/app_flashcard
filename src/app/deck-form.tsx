import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Input, Text, TextArea, XStack, YStack } from 'tamagui';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';
import {
  useCreateDeckMutation,
  useDeckDetailQuery,
  useDeleteDeckMutation,
  useUpdateDeckMutation,
} from '@/hooks/useFlashcardQueries';
import { aiGenerateCardDetails } from '@/services/aiService';
import { formatDateString } from '@/services/spacedRepetition';
import { CardItem } from '@/types/flashcard';
import { goBackSafely } from '@/utils/navigation';

const CATEGORY_SUGGESTIONS = [
  'TOEIC',
  'IT English',
  'IELTS',
  'Giao tiếp',
  'Du lịch',
  'Kinh doanh',
  'Học thuật',
];

// ============================================================================
// MÀN HÌNH 7: THÊM / SỬA BỘ TỪ VÀ THẺ TỪ
// Đáp ứng: Chức năng 2 (Quản lý bộ từ), Chức năng 3 (Quản lý thẻ từ), Chức năng 10 (AI gợi ý nghĩa & ví dụ)
// ============================================================================
export default function DeckFormScreen() {
  const { colors, user } = useAuth();
  const { width, height } = useWindowDimensions();
  const isWideLayout = width >= 768;
  const { deckId } = useLocalSearchParams<{ deckId?: string }>();
  const isEditing = Boolean(deckId);

  const { data: existingDeck, isLoading: isLoadingDeck } = useDeckDetailQuery(
    deckId
  );
  const createMutation = useCreateDeckMutation();
  const updateMutation = useUpdateDeckMutation();
  const deleteMutation = useDeleteDeckMutation();

  // Thông tin bộ từ
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  // Danh sách thẻ từ trong bộ
  const [cards, setCards] = useState<CardItem[]>([]);

  // Thẻ từ đang chỉnh sửa hoặc đang thêm mới
  const [isEditingCardModal, setIsEditingCardModal] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardTerm, setCardTerm] = useState('');
  const aiGeneratedForTerm = useRef('');
  const aiRequestId = useRef(0);
  const [cardPhonetic, setCardPhonetic] = useState('');
  const [cardDefinition, setCardDefinition] = useState('');
  const [cardExample, setCardExample] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isEditing) {
      setTitle('');
      setCategory('');
      setDescription('');
      setCards([]);
      return;
    }

    if (existingDeck) {
      setTitle(existingDeck.title || '');
      setCategory(existingDeck.category || 'TOEIC');
      setDescription(existingDeck.description || '');
      setCards(existingDeck.cards || []);
    }
  }, [existingDeck, isEditing]);

  // AI tự động sinh nghĩa và câu ví dụ cho thẻ từ (Chức năng 10)
  const handleAiSuggestCard = async () => {
    if (!cardTerm.trim()) {
      setAiError('Vui lòng nhập từ vựng tiếng Anh trước khi gọi AI.');
      return;
    }
    const requestId = ++aiRequestId.current;
    const requestedTerm = cardTerm.trim();
    setAiError('');
    setIsAiGenerating(true);
    try {
      const result = await aiGenerateCardDetails(requestedTerm, category);
      if (requestId !== aiRequestId.current) return;
      setCardPhonetic(result.phonetic);
      setCardDefinition(result.definition);
      setCardExample(result.example);
      aiGeneratedForTerm.current = requestedTerm.normalize('NFKC').toLocaleLowerCase();
    } catch (error) {
      if (requestId === aiRequestId.current) {
        setAiError(
          error instanceof Error ? error.message : 'Không thể sinh nghĩa từ AI lúc này.'
        );
      }
    } finally {
      if (requestId === aiRequestId.current) setIsAiGenerating(false);
    }
  };

  const handleOpenAddCard = () => {
    aiRequestId.current += 1;
    setIsAiGenerating(false);
    setFieldErrors({});
    setEditingCardId(null);
    aiGeneratedForTerm.current = '';
    setCardTerm('');
    setCardPhonetic('');
    setCardDefinition('');
    setCardExample('');
    setAiError('');
    setIsEditingCardModal(true);
  };

  const handleOpenEditCard = (card: CardItem) => {
    aiRequestId.current += 1;
    setIsAiGenerating(false);
    setFieldErrors({});
    setEditingCardId(card.id);
    aiGeneratedForTerm.current = '';
    setCardTerm(card.term);
    setCardPhonetic(card.phonetic || '');
    setCardDefinition(card.definition);
    setCardExample(card.example || '');
    setAiError('');
    setIsEditingCardModal(true);
  };

  const handleSaveCard = () => {
    const errors: Record<string, string> = {};
    if (!cardTerm.trim()) errors.cardTerm = 'Vui lòng nhập từ vựng.';
    if (!cardDefinition.trim()) errors.cardDefinition = 'Vui lòng nhập nghĩa.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    if (editingCardId) {
      // Sửa thẻ có sẵn
      setCards((prev) =>
        prev.map((c) =>
          c.id === editingCardId
            ? {
                ...c,
                term: cardTerm.trim(),
                phonetic: cardPhonetic.trim() || undefined,
                definition: cardDefinition.trim(),
                example: cardExample.trim() || undefined,
              }
            : c
        )
      );
    } else {
      // Thêm thẻ mới
      const newCard: CardItem = {
        id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        term: cardTerm.trim(),
        phonetic: cardPhonetic.trim() || undefined,
        definition: cardDefinition.trim(),
        example: cardExample.trim() || undefined,
        isLearned: false,
        needReview: true,
        leitnerLevel: 0,
        nextReviewDate: formatDateString(new Date()),
      };
      setCards((prev) => [...prev, newCard]);
    }

    setFieldErrors((previous) => ({ ...previous, cards: '' }));
    setIsEditingCardModal(false);
  };

  const handleDeleteCard = (cardId: string) => {
    Alert.alert('Xóa thẻ từ', 'Bạn có chắc chắn muốn xóa thẻ này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => setCards((prev) => prev.filter((c) => c.id !== cardId)),
      },
    ]);
  };

  const handleSaveDeck = async () => {
    setErrorMsg('');
    const errors: Record<string, string> = {};
    if (!title.trim()) {
      errors.title = 'Vui lòng nhập tên bộ từ.';
    }
    if (cards.length === 0) {
      errors.cards = 'Bộ từ cần có ít nhất 1 thẻ từ.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      if (isEditing && deckId) {
        await updateMutation.mutateAsync({
          deckId,
          payload: {
            title: title.trim(),
            category: category.trim(),
            description: description.trim(),
            cards,
          },
        });
      } else {
        await createMutation.mutateAsync({
          userId: user?.id || '1',
          title: title.trim(),
          category: category.trim(),
          description: description.trim(),
          cards,
          isFavorite: false,
        });
      }
      router.replace('/(tabs)/decks');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể lưu bộ từ. Vui lòng thử lại!');
    }
  };

  const handleDeleteDeck = () => {
    if (!deckId) return;
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa bộ từ "${title}"? Thao tác này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa ngay',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(deckId);
              router.replace('/(tabs)/decks');
            } catch {
              Alert.alert('Lỗi', 'Không thể xóa bộ từ lúc này.');
            }
          },
        },
      ]
    );
  };

  if (isEditing && isLoadingDeck && !existingDeck) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
        <YStack flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color={BRAND_COLORS.crimson} />
          <Text marginTop={12} color={colors.textSecondary}>
            Đang tải dữ liệu bộ từ...
          </Text>
        </YStack>
      </SafeAreaView>
    );
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <YStack flex={1}>
          {/* Header */}
          <XStack
            paddingHorizontal={16}
            paddingVertical={12}
            borderBottomWidth={1}
            borderColor={colors.borderColor}
            backgroundColor={colors.cardBg}
            justifyContent="space-between"
            alignItems="center"
          >
            <XStack alignItems="center" gap={10}>
              <Pressable
                onPress={() => goBackSafely('/(tabs)/decks')}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.subtleBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  color={colors.brandAccent}
                />
              </Pressable>
              <Text fontSize={20} fontWeight="800" color={colors.textPrimary}>
                {isEditing ? 'Chỉnh sửa bộ từ' : 'Thêm bộ từ mới'}
              </Text>
            </XStack>

            {isEditing && (
              <Button
                size="sm"
                backgroundColor="transparent"
                onPress={handleDeleteDeck}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </Button>
            )}
          </XStack>

          <ScrollView
            style={{ flex: 1, backgroundColor: colors.pageBg }}
            contentContainerStyle={{ padding: 18, paddingBottom: 50 }}
            keyboardShouldPersistTaps="handled"
          >
            <YStack gap={18} maxWidth={1120} width="100%" alignSelf="center">
              {/* Lỗi cảnh báo nếu có */}
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

              <XStack
                gap={18}
                width="100%"
                alignItems="flex-start"
                flexDirection={isWideLayout ? 'row' : 'column'}
              >
                {/* Phần 1: Thông tin bộ từ */}
                <YStack
                  flex={isWideLayout ? 1 : undefined}
                  width={isWideLayout ? undefined : '100%'}
                  padding={18}
                  borderRadius={18}
                  borderWidth={1.5}
                  borderColor={colors.borderColor}
                  backgroundColor={colors.cardBg}
                  gap={14}
                >
                <Text fontSize={16} fontWeight="800" color={colors.brandAccent}>
                  1. Thông tin bộ từ vựng
                </Text>

                <YStack gap={6}>
                  <Text fontWeight="700" fontSize={13} color={colors.textPrimary}>
                    Tên bộ từ *
                  </Text>
                  <Input
                    size="md"
                    placeholder="VD: Từ vựng Phỏng vấn IT, 600 từ TOEIC..."
                    value={title}
                    onChangeText={(value) => {
                      setTitle(value);
                      setFieldErrors((previous) => ({ ...previous, title: '' }));
                    }}
                    backgroundColor={colors.inputBg}
                    color={colors.textPrimary}
                    borderColor={colors.borderColor}
                    borderRadius={10}
                  />
                  {fieldErrors.title ? (
                    <Text color="$red10" fontSize={12}>{fieldErrors.title}</Text>
                  ) : null}
                </YStack>

                <YStack gap={6}>
                  <Text fontWeight="700" fontSize={13} color={colors.textPrimary}>
                    Chủ đề (Category)
                  </Text>
                  <Input
                    size="md"
                    placeholder="Nhập hoặc chọn chủ đề bên dưới"
                    value={category}
                    onChangeText={setCategory}
                    backgroundColor={colors.inputBg}
                    color={colors.textPrimary}
                    borderColor={colors.borderColor}
                    borderRadius={10}
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, paddingTop: 4 }}
                  >
                    {CATEGORY_SUGGESTIONS.map((cat) => (
                      <Button
                        key={cat}
                        size="xs"
                        borderRadius={999}
                        backgroundColor={
                          category === cat ? BRAND_COLORS.crimson : colors.subtleBg
                        }
                        onPress={() => setCategory(cat)}
                      >
                        <Text
                          fontSize={11}
                          fontWeight="700"
                          color={
                            category === cat
                              ? BRAND_COLORS.white
                              : colors.textPrimary
                          }
                        >
                          {cat}
                        </Text>
                      </Button>
                    ))}
                  </ScrollView>
                </YStack>

                <YStack gap={6}>
                  <Text fontWeight="700" fontSize={13} color={colors.textPrimary}>
                    Mô tả bộ từ
                  </Text>
                  <TextArea
                    size="md"
                    placeholder="Mô tả mục tiêu học tập, đối tượng phù hợp..."
                    value={description}
                    onChangeText={setDescription}
                    backgroundColor={colors.inputBg}
                    color={colors.textPrimary}
                    borderColor={colors.borderColor}
                    borderRadius={10}
                    rows={3}
                  />
                </YStack>
              </YStack>

              {/* Phần 2: Danh sách thẻ từ */}
              <YStack
                flex={isWideLayout ? 1 : undefined}
                width={isWideLayout ? undefined : '100%'}
                padding={18}
                borderRadius={18}
                borderWidth={1.5}
                borderColor={colors.borderColor}
                backgroundColor={colors.cardBg}
                gap={14}
              >
                <XStack
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  gap={8}
                >
                  <XStack alignItems="center" gap={8}>
                    <Text
                      fontSize={16}
                      fontWeight="800"
                      color={colors.brandAccent}
                    >
                      2. Danh sách thẻ từ ({cards.length})
                    </Text>
                  </XStack>

                  <Button
                    size="sm"
                    backgroundColor={BRAND_COLORS.crimson}
                    borderRadius={10}
                    onPress={handleOpenAddCard}
                  >
                    <Ionicons name="add" size={18} color="white" />
                    <Text color="white" fontWeight="800" marginLeft={4}>
                      Thêm thẻ từ
                    </Text>
                  </Button>
                </XStack>

                {cards.length === 0 ? (
                  <YStack
                    padding={24}
                    alignItems="center"
                    borderRadius={12}
                    backgroundColor={colors.subtleBg}
                    gap={8}
                  >
                    <Ionicons
                      name="layers-outline"
                      size={36}
                      color={colors.textSecondary}
                    />
                    <Text
                      fontSize={14}
                      fontWeight="600"
                      color={colors.textSecondary}
                    >
                      Chưa có thẻ từ nào trong bộ này
                    </Text>
                    <Text fontSize={12} color={colors.textMuted} textAlign="center">
                      Bấm &ldquo;Thêm thẻ từ&rdquo; để tự tạo hoặc sử dụng AI để tự động
                      điền nghĩa và ví dụ!
                    </Text>
                  </YStack>
                ) : (
                  cards.map((card, idx) => (
                    <Animated.View
                      key={card.id}
                      entering={FadeInDown.delay(idx * 30).duration(200)}
                    >
                      <YStack
                        padding={14}
                        borderRadius={14}
                        borderWidth={1}
                        borderColor={colors.borderColor}
                        backgroundColor={colors.subtleBg}
                        gap={6}
                      >
                        <XStack
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <XStack alignItems="center" gap={8} flex={1}>
                            <Text
                              fontSize={16}
                              fontWeight="800"
                              color={
                                colors.isDark
                                  ? BRAND_COLORS.gold
                                  : BRAND_COLORS.crimson
                              }
                            >
                              {card.term}
                            </Text>
                            {card.phonetic ? (
                              <Text fontSize={12} color={colors.textSecondary}>
                                {card.phonetic}
                              </Text>
                            ) : null}
                          </XStack>

                          <XStack gap={6}>
                            <Button
                              size="xs"
                              circular
                              backgroundColor={colors.cardBg}
                              borderWidth={1}
                              borderColor={colors.borderColor}
                              onPress={() => handleOpenEditCard(card)}
                            >
                              <Ionicons
                                name="create-outline"
                                size={14}
                                color={colors.textPrimary}
                              />
                            </Button>
                            <Button
                              size="xs"
                              circular
                              backgroundColor={colors.cardBg}
                              borderWidth={1}
                              borderColor={colors.borderColor}
                              onPress={() => handleDeleteCard(card.id)}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={14}
                                color="#EF4444"
                              />
                            </Button>
                          </XStack>
                        </XStack>

                        <Text
                          fontSize={13}
                          fontWeight="600"
                          color={colors.textPrimary}
                        >
                          {card.definition}
                        </Text>

                        {card.example ? (
                          <Text
                            fontSize={12}
                            color={colors.textSecondary}
                            fontStyle="italic"
                          >
                            &ldquo;{card.example}&rdquo;
                          </Text>
                        ) : null}
                      </YStack>
                    </Animated.View>
                  ))
                )}
                {fieldErrors.cards ? (
                  <Text color="$red10" fontSize={12}>{fieldErrors.cards}</Text>
                ) : null}
              </YStack>
              </XStack>

              {/* Nút hoàn tất lưu bộ từ */}
              <Button
                width={isWideLayout ? '100%' : undefined}
                size="lg"
                backgroundColor={BRAND_COLORS.crimson}
                borderRadius={14}
                onPress={handleSaveDeck}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="white"
                    />
                    <Text
                      color="white"
                      fontWeight="800"
                      fontSize={16}
                      marginLeft={8}
                    >
                      {isEditing ? 'Lưu thay đổi bộ từ' : 'Hoàn tất & Tạo bộ từ'}
                    </Text>
                  </>
                )}
              </Button>
            </YStack>
          </ScrollView>

          {/* Card editor scrolls independently on short landscape screens. */}
          {isEditingCardModal && (
            <YStack
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.6)"
              justifyContent="center"
              alignItems="center"
              padding={16}
              zIndex={999}
            >
              <ScrollView
                style={{ width: '100%', maxHeight: height - 32 }}
                contentContainerStyle={{ alignItems: 'center', paddingVertical: 8 }}
                keyboardShouldPersistTaps="handled"
              >
                <YStack
                  maxWidth={520}
                  width="100%"
                  backgroundColor={colors.cardBg}
                  borderRadius={20}
                  borderWidth={1.5}
                  borderColor={colors.borderColor}
                  padding={20}
                  gap={14}
                >
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize={18} fontWeight="800" color={colors.textPrimary}>
                      {editingCardId ? 'Chỉnh sửa thẻ từ' : 'Thêm thẻ từ mới'}
                    </Text>
                    <Button
                      size="xs"
                      circular
                      backgroundColor={colors.subtleBg}
                      onPress={() => setIsEditingCardModal(false)}
                    >
                      <Ionicons name="close" size={18} color={colors.textPrimary} />
                    </Button>
                  </XStack>

                  <Button
                    size="sm"
                    backgroundColor={BRAND_COLORS.navy}
                    borderWidth={1.5}
                    borderColor={BRAND_COLORS.gold}
                    borderRadius={10}
                    onPress={handleAiSuggestCard}
                    disabled={isAiGenerating}
                  >
                    {isAiGenerating ? (
                      <ActivityIndicator size="small" color={BRAND_COLORS.gold} />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={16} color={BRAND_COLORS.gold} />
                        <Text color={BRAND_COLORS.gold} fontWeight="800" fontSize={12} marginLeft={6}>
                          AI tạo nghĩa và ví dụ
                        </Text>
                      </>
                    )}
                  </Button>
                  {aiError ? (
                    <YStack
                      width="100%"
                      padding={10}
                      borderRadius={10}
                      backgroundColor={colors.subtleBg}
                      borderWidth={1}
                      borderColor={colors.borderColor}
                      gap={4}
                    >
                      <Text
                        width="100%"
                        flexShrink={1}
                        color="$red10"
                        fontSize={12}
                        lineHeight={18}
                      >
                        {aiError}
                      </Text>
                      {aiError.startsWith('Chưa cấu hình dịch vụ AI') ? (
                        <Text
                          width="100%"
                          flexShrink={1}
                          color={colors.textSecondary}
                          fontSize={12}
                          lineHeight={18}
                        >
                          Tạo file .env từ .env.example, điền URL và API key, sau đó khởi động lại Expo.
                        </Text>
                      ) : null}
                    </YStack>
                  ) : null}

                  <YStack gap={6}>
                    <Text fontWeight="700" fontSize={12} color={colors.textPrimary}>Từ vựng tiếng Anh *</Text>
                    <Input
                      size="md"
                      placeholder="VD: Innovation, Resilience..."
                      value={cardTerm}
                      onChangeText={(value) => {
                        setCardTerm(value);
                        aiRequestId.current += 1;
                        setIsAiGenerating(false);
                        if (
                          aiGeneratedForTerm.current &&
                          value.normalize('NFKC').trim().toLocaleLowerCase() !==
                            aiGeneratedForTerm.current
                        ) {
                          setCardPhonetic('');
                          setCardDefinition('');
                          setCardExample('');
                          aiGeneratedForTerm.current = '';
                        }
                        setAiError('');
                        setFieldErrors((previous) => ({ ...previous, cardTerm: '' }));
                      }}
                      backgroundColor={colors.inputBg}
                      color={colors.textPrimary}
                      borderColor={colors.borderColor}
                      borderRadius={10}
                    />
                    {fieldErrors.cardTerm ? <Text color="$red10" fontSize={12}>{fieldErrors.cardTerm}</Text> : null}
                  </YStack>

                  <YStack gap={6}>
                    <Text fontWeight="700" fontSize={12} color={colors.textPrimary}>Phiên âm IPA (Tùy chọn)</Text>
                    <Input
                      size="md"
                      placeholder="VD: /ˌɪnəˈveɪʃn/"
                      value={cardPhonetic}
                      onChangeText={setCardPhonetic}
                      backgroundColor={colors.inputBg}
                      color={colors.textPrimary}
                      borderColor={colors.borderColor}
                      borderRadius={10}
                    />
                  </YStack>

                  <YStack gap={6}>
                    <Text fontWeight="700" fontSize={12} color={colors.textPrimary}>Nghĩa tiếng Việt *</Text>
                    <Input
                      size="md"
                      placeholder="VD: Sự đổi mới, sáng tạo..."
                      value={cardDefinition}
                      onChangeText={(value) => {
                        setCardDefinition(value);
                        setFieldErrors((previous) => ({ ...previous, cardDefinition: '' }));
                      }}
                      backgroundColor={colors.inputBg}
                      color={colors.textPrimary}
                      borderColor={colors.borderColor}
                      borderRadius={10}
                    />
                    {fieldErrors.cardDefinition ? <Text color="$red10" fontSize={12}>{fieldErrors.cardDefinition}</Text> : null}
                  </YStack>

                  <YStack gap={6}>
                    <Text fontWeight="700" fontSize={12} color={colors.textPrimary}>Câu ví dụ minh họa</Text>
                    <TextArea
                      size="md"
                      placeholder="VD: Continuous innovation drives tech growth..."
                      value={cardExample}
                      onChangeText={setCardExample}
                      backgroundColor={colors.inputBg}
                      color={colors.textPrimary}
                      borderColor={colors.borderColor}
                      borderRadius={10}
                      rows={2}
                    />
                  </YStack>

                  <XStack gap={10} marginTop={4}>
                    <Button
                      flex={1}
                      size="md"
                      borderRadius={10}
                      backgroundColor={colors.subtleBg}
                      onPress={() => setIsEditingCardModal(false)}
                    >
                      <Text fontWeight="700" color={colors.textPrimary}>Hủy bỏ</Text>
                    </Button>
                    <Button
                      flex={2}
                      size="md"
                      borderRadius={10}
                      backgroundColor={BRAND_COLORS.crimson}
                      onPress={handleSaveCard}
                    >
                      <Text color="white" fontWeight="800">Lưu thẻ này</Text>
                    </Button>
                  </XStack>
                </YStack>
              </ScrollView>
            </YStack>
          )}
        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
