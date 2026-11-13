import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, Input, Text, XStack, YStack } from 'tamagui';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';
import {
  useDeckDetailQuery,
  useToggleCardLearnedMutation,
} from '@/hooks/useFlashcardQueries';
import { CardItem } from '@/types/flashcard';
import { goBackSafely } from '@/utils/navigation';

interface DeckDetailContentProps {
  deckId: string;
  isSplitView?: boolean;
  onBack?: () => void;
}

// ============================================================================
// MÀN HÌNH 6: CHI TIẾT BỘ TỪ (DANH SÁCH THẺ TỪ TRONG BỘ)
// ============================================================================
export function DeckDetailContent({
  deckId,
  isSplitView = false,
  onBack,
}: DeckDetailContentProps) {
  const { colors } = useAuth();
  const {
    data: deck,
    isLoading,
    refetch,
    isRefetching,
  } = useDeckDetailQuery(deckId);
  const toggleLearnedMutation = useToggleCardLearnedMutation();

  const [filterMode, setFilterMode] = useState<'all' | 'review' | 'learned'>(
    'all'
  );
  const [searchCard, setSearchCard] = useState('');
  const [flippedCardIds, setFlippedCardIds] = useState<Record<string, boolean>>(
    {}
  );

  // Animation thanh tiến độ của bộ từ bằng Reanimated
  const progressWidth = useSharedValue(0);

  const cards = deck?.cards || [];
  const learnedCount = cards.filter((c) => c.isLearned).length;
  const percent =
    cards.length > 0 ? Math.round((learnedCount / cards.length) * 100) : 0;

  useEffect(() => {
    progressWidth.value = withTiming(percent, { duration: 700 });
  }, [percent, deckId, progressWidth]);

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  if (isLoading && !deck) {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        padding={24}
        backgroundColor={colors.pageBg}
      >
        <ActivityIndicator size="large" color={BRAND_COLORS.crimson} />
        <Text marginTop={12} color={colors.textSecondary}>
          Đang tải danh sách thẻ...
        </Text>
      </YStack>
    );
  }

  if (!deck) {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        padding={24}
        backgroundColor={colors.pageBg}
      >
        <Ionicons name="folder-open-outline" size={48} color="#94A3B8" />
        <Text
          marginTop={12}
          fontSize={16}
          fontWeight="600"
          color={colors.textPrimary}
        >
          Không tìm thấy bộ từ
        </Text>
      </YStack>
    );
  }

  const filteredCards = cards.filter((card) => {
    const matchesFilter =
      filterMode === 'all'
        ? true
        : filterMode === 'learned'
        ? card.isLearned
        : !card.isLearned || card.needReview;

    const q = searchCard.trim().toLowerCase();
    const matchesSearch =
      !q ||
      card.term.toLowerCase().includes(q) ||
      card.definition.toLowerCase().includes(q) ||
      (card.example && card.example.toLowerCase().includes(q));

    return matchesFilter && matchesSearch;
  });

  const handleFlipPreview = (cardId: string) => {
    setFlippedCardIds((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.pageBg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <YStack gap={14}>
        {/* Thanh tiêu đề trên cùng */}
        <XStack alignItems="center" justifyContent="space-between" gap={8}>
          <XStack alignItems="center" gap={10} flex={1}>
            {!isSplitView && (
              <Pressable
                onPress={onBack || (() => goBackSafely('/(tabs)/decks'))}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
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
            )}
            <YStack flex={1}>
              <XStack alignItems="center" gap={8}>
                <YStack
                  backgroundColor={colors.brandBadgeBg}
                  paddingHorizontal={10}
                  paddingVertical={3}
                  borderRadius={8}
                >
                  <Text
                    fontSize={11}
                    fontWeight="800"
                    color={colors.brandBadgeText}
                  >
                    {deck.category}
                  </Text>
                </YStack>
              </XStack>
              <Text
                fontSize={22}
                fontWeight="800"
                marginTop={4}
                color={colors.textPrimary}
              >
                {deck.title}
              </Text>
            </YStack>
          </XStack>

          <Button
            size="sm"
            backgroundColor={colors.subtleBg}
            borderRadius={10}
            onPress={() => refetch()}
            disabled={isRefetching}
          >
            <Ionicons name="refresh" size={16} color={colors.brandAccent} />
          </Button>
        </XStack>

        {/* Mô tả bộ từ */}
        <Text fontSize={14} color={colors.textSecondary}>
          {deck.description}
        </Text>

        {/* Thẻ thống kê tiến độ của bộ từ (Nền Xanh Đen #0F1629 + Thanh tiến độ Vàng #FEC341) */}
        <YStack
          backgroundColor={BRAND_COLORS.navy}
          borderColor={BRAND_COLORS.gold}
          borderWidth={1.5}
          borderRadius={16}
          padding={16}
          gap={8}
        >
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontWeight="700" fontSize={14} color={BRAND_COLORS.white}>
              Tiến độ thuộc bộ từ này
            </Text>
            <Text fontWeight="800" fontSize={15} color={BRAND_COLORS.gold}>
              {learnedCount}/{cards.length} thẻ ({percent}%)
            </Text>
          </XStack>

          <YStack
            height={10}
            backgroundColor="rgba(255,255,255,0.16)"
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

          <XStack justifyContent="space-between" marginTop={4}>
            <Text fontSize={12} color="#34D399" fontWeight="700">
              ✓ Đã thuộc: {learnedCount} từ
            </Text>
            <Text fontSize={12} color={BRAND_COLORS.gold} fontWeight="700">
              ● Cần ôn tập: {cards.length - learnedCount} từ
            </Text>
          </XStack>
        </YStack>

        {/* Các nút chức năng: Học Flashcard (#9B0000), Làm Quiz (#0F1629 + #FEC341), Chỉnh sửa */}
        <XStack gap={10} flexWrap="wrap">
          <Button
            flex={1}
            minWidth={130}
            backgroundColor={BRAND_COLORS.crimson}
            color="white"
            fontWeight="700"
            borderRadius={10}
            onPress={() =>
              router.push({
                pathname: '/study/[id]',
                params: { id: deck.id },
              })
            }
          >
            <Ionicons name="albums" size={17} color={BRAND_COLORS.white} />
            <Text color={BRAND_COLORS.white} fontWeight="800" marginLeft={6}>
              Học Flashcard
            </Text>
          </Button>

          <Button
            flex={1}
            minWidth={120}
            backgroundColor={BRAND_COLORS.navy}
            borderWidth={1.5}
            borderColor={BRAND_COLORS.gold}
            fontWeight="700"
            borderRadius={10}
            onPress={() =>
              router.push({
                pathname: '/quiz/[id]',
                params: { id: deck.id },
              })
            }
          >
            <Ionicons name="help-circle" size={18} color={BRAND_COLORS.gold} />
            <Text color={BRAND_COLORS.gold} fontWeight="800" marginLeft={6}>
              Làm Quiz
            </Text>
          </Button>

          <Button
            backgroundColor={colors.subtleBg}
            borderWidth={1}
            borderColor={colors.borderColor}
            borderRadius={10}
            onPress={() =>
              router.push({
                pathname: '/deck-form',
                params: { deckId: deck.id },
              })
            }
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={colors.textPrimary}
            />
            <Text fontWeight="700" marginLeft={4} color={colors.textPrimary}>
              Chỉnh sửa
            </Text>
          </Button>
        </XStack>

        {/* Thanh tìm kiếm & Bộ lọc thẻ từ trong bộ */}
        <YStack gap={10} marginTop={4}>
          <Input
            placeholder="Tìm từ vựng, nghĩa hoặc câu ví dụ..."
            value={searchCard}
            onChangeText={setSearchCard}
            backgroundColor={colors.inputBg}
            color={colors.textPrimary}
            borderColor={colors.borderColor}
            borderRadius={10}
          />

          <XStack gap={8}>
            {(
              [
                { key: 'all', label: `Tất cả • ${cards.length}` },
                {
                  key: 'review',
                  label: `Cần ôn • ${cards.length - learnedCount}`,
                },
                { key: 'learned', label: `Đã thuộc • ${learnedCount}` },
              ] as const
            ).map((tab) => {
              const active = filterMode === tab.key;
              return (
                <Button
                  key={tab.key}
                  size="sm"
                  flex={1}
                  borderRadius={10}
                  backgroundColor={
                    active ? BRAND_COLORS.crimson : colors.subtleBg
                  }
                  onPress={() => setFilterMode(tab.key)}
                >
                  <Text
                    fontSize={12}
                    fontWeight="800"
                    color={active ? BRAND_COLORS.white : colors.textPrimary}
                  >
                    {tab.label}
                  </Text>
                </Button>
              );
            })}
          </XStack>
        </YStack>

        {/* Danh sách các thẻ từ (Cards) */}
        <YStack gap={10} marginTop={4}>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontWeight="800" fontSize={15} color={colors.textPrimary}>
              Danh sách thẻ từ • {filteredCards.length} thẻ
            </Text>
            <Text fontSize={12} color={colors.textSecondary}>
              Chạm vào thẻ để xem nhanh ví dụ
            </Text>
          </XStack>

          {filteredCards.length === 0 ? (
            <YStack
              padding={24}
              alignItems="center"
              backgroundColor={colors.cardBg}
              borderRadius={14}
            >
              <Ionicons name="search-outline" size={32} color="#94A3B8" />
              <Text marginTop={8} color={colors.textSecondary}>
                Không có thẻ từ nào khớp bộ lọc.
              </Text>
            </YStack>
          ) : (
            filteredCards.map((card: CardItem, index: number) => {
              const isFlipped = Boolean(flippedCardIds[card.id]);
              return (
                <Animated.View
                  key={card.id}
                  entering={FadeInDown.delay(index * 50).duration(300)}
                >
                  <Pressable onPress={() => handleFlipPreview(card.id)}>
                    <YStack
                      padding={14}
                      borderRadius={14}
                      borderWidth={1.5}
                      borderColor={
                        card.isLearned
                          ? 'rgba(16, 185, 129, 0.45)'
                          : colors.reviewCardBorder
                      }
                      backgroundColor={
                        isFlipped
                          ? colors.goldBadgeBg
                          : colors.cardBg
                      }
                      gap={8}
                    >
                      <XStack
                        justifyContent="space-between"
                        alignItems="flex-start"
                        gap={8}
                      >
                        <YStack flex={1}>
                          <XStack alignItems="center" gap={8} flexWrap="wrap">
                            <Text
                              fontSize={18}
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
                              <Text fontSize={13} color={colors.textSecondary}>
                                {card.phonetic}
                              </Text>
                            ) : null}
                          </XStack>

                          <Text
                            fontSize={15}
                            fontWeight="700"
                            marginTop={4}
                            color={colors.textPrimary}
                          >
                            {card.definition}
                          </Text>
                        </YStack>

                        {/* Nút đánh dấu Đã thuộc / Cần ôn */}
                        <Button
                          size="xs"
                          borderRadius={8}
                          backgroundColor={
                            card.isLearned
                              ? colors.isDark
                                ? 'rgba(16, 185, 129, 0.2)'
                                : '#DCFCE7'
                              : BRAND_COLORS.gold
                          }
                          onPress={(e) => {
                            e.stopPropagation();
                            toggleLearnedMutation.mutate({
                              deckId: deck.id,
                              cardId: card.id,
                            });
                          }}
                        >
                          <Ionicons
                            name={
                              card.isLearned
                                ? 'checkmark-circle'
                                : 'time-outline'
                            }
                            size={15}
                            color={
                              card.isLearned
                                ? colors.isDark
                                  ? '#34D399'
                                  : '#15803D'
                                : BRAND_COLORS.obsidian
                            }
                          />
                          <Text
                            fontSize={11}
                            fontWeight="800"
                            color={
                              card.isLearned
                                ? colors.isDark
                                  ? '#34D399'
                                  : '#15803D'
                                : BRAND_COLORS.obsidian
                            }
                            marginLeft={4}
                          >
                            {card.isLearned ? 'Đã thuộc' : 'Cần ôn'}
                          </Text>
                        </Button>
                      </XStack>

                      {/* Câu ví dụ */}
                      {card.example ? (
                        <YStack
                          marginTop={4}
                          padding={10}
                          borderRadius={10}
                          backgroundColor={colors.subtleBg}
                        >
                          <Text
                            fontSize={12}
                            fontStyle="italic"
                            color={colors.textSecondary}
                          >
                            💡 Ví dụ: &ldquo;{card.example}&rdquo;
                          </Text>
                        </YStack>
                      ) : null}
                    </YStack>
                  </Pressable>
                </Animated.View>
              );
            })
          )}
        </YStack>
      </YStack>
    </ScrollView>
  );
}
