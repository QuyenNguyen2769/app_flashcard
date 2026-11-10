import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Input, Text, XStack, YStack } from 'tamagui';
import { DeckDetailContent } from '@/components/DeckDetailContent';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';
import { useDecksQuery } from '@/hooks/useFlashcardQueries';
import { Deck } from '@/types/flashcard';

// ============================================================================
// MÀN HÌNH 5 (+ MÀN HÌNH 6 KHI XOAY NGANG / TABLET): DANH SÁCH BỘ TỪ
// ============================================================================
export default function DecksScreen() {
  const { colors } = useAuth();
  const { width, height } = useWindowDimensions();
  const isDeviceLandscapeOrTablet = width >= 700 || width > height;

  const [forceSplitPreview, setForceSplitPreview] = useState(false);
  const isSplitView = isDeviceLandscapeOrTablet || forceSplitPreview;

  const {
    data: decks = [],
    isLoading,
    refetch,
    isRefetching,
  } = useDecksQuery();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('1');

  useEffect(() => {
    if (decks.length > 0 && !decks.some((d) => d.id === selectedDeckId)) {
      setSelectedDeckId(decks[0].id);
    }
  }, [decks, selectedDeckId]);

  const categories = [
    'Tất cả',
    ...Array.from(new Set(decks.map((d) => d.category).filter(Boolean))),
  ];

  const filteredDecks = decks.filter((deck) => {
    const matchCategory =
      selectedCategory === 'Tất cả' || deck.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      deck.title.toLowerCase().includes(q) ||
      deck.description.toLowerCase().includes(q) ||
      deck.category.toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  const handleSelectDeck = (deck: Deck) => {
    setSelectedDeckId(deck.id);
    if (!isSplitView) {
      router.push({
        pathname: '/deck/[id]',
        params: { id: deck.id },
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <YStack flex={1} backgroundColor={colors.pageBg}>
        {/* Thanh Header */}
        <YStack
          paddingHorizontal={16}
          paddingTop={12}
          paddingBottom={12}
          borderBottomWidth={1}
          borderColor={colors.borderColor}
          backgroundColor={colors.cardBg}
          gap={10}
        >
          <XStack
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={8}
          >
            <XStack alignItems="center" gap={10}>
              <Text fontSize={22} fontWeight="800" color={colors.textPrimary}>
                Kho Bộ Từ Vựng
              </Text>
              <YStack
                backgroundColor={colors.brandBadgeBg}
                paddingHorizontal={10}
                paddingVertical={3}
                borderRadius={999}
              >
                <Text
                  fontSize={12}
                  fontWeight="800"
                  color={colors.brandBadgeText}
                >
                  {filteredDecks.length} bộ
                </Text>
              </YStack>
            </XStack>

            <XStack gap={8} alignItems="center">
              {/* Nút bật/tắt nhanh chế độ chia đôi màn hình */}
              <Button
                size="sm"
                borderRadius={10}
                backgroundColor={
                  isSplitView ? BRAND_COLORS.gold : colors.subtleBg
                }
                onPress={() => setForceSplitPreview(!forceSplitPreview)}
              >
                <Ionicons
                  name="tablet-landscape-outline"
                  size={16}
                  color={
                    isSplitView
                      ? BRAND_COLORS.obsidian
                      : colors.textSecondary
                  }
                />
                <Text
                  fontSize={12}
                  fontWeight="800"
                  color={
                    isSplitView ? BRAND_COLORS.obsidian : colors.textPrimary
                  }
                  marginLeft={6}
                >
                  {isSplitView ? 'Chế độ 2 cột' : 'Xem 2 cột'}
                </Text>
              </Button>

              {/* Nút thêm bộ từ */}
              <Button
                size="sm"
                backgroundColor={BRAND_COLORS.crimson}
                borderRadius={10}
                onPress={() => router.push('/deck-form')}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={17}
                  color={BRAND_COLORS.white}
                />
                <Text
                  color={BRAND_COLORS.white}
                  fontWeight="800"
                  fontSize={12}
                  marginLeft={6}
                >
                  Thêm bộ từ
                </Text>
              </Button>
            </XStack>
          </XStack>

          {/* Thanh Tìm kiếm & Lọc theo chủ đề */}
          <Input
            size="md"
            placeholder="Tìm kiếm bộ từ theo tên, mô tả hoặc chủ đề..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            backgroundColor={colors.inputBg}
            color={colors.textPrimary}
            borderColor={colors.borderColor}
            borderRadius={10}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <Button
                  key={cat}
                  size="xs"
                  borderRadius={999}
                  backgroundColor={
                    active ? BRAND_COLORS.crimson : colors.subtleBg
                  }
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    fontSize={12}
                    fontWeight="800"
                    color={active ? BRAND_COLORS.white : colors.textPrimary}
                  >
                    {cat}
                  </Text>
                </Button>
              );
            })}
          </ScrollView>
        </YStack>

        {/* PHẦN THÂN: TỰ ĐỘNG CHIA 2 CỘT KHI XOAY NGANG / TABLET (RESPONSIVE) */}
        <XStack flex={1}>
          {/* CỘT TRÁI (MÀN HÌNH 5): Danh sách các bộ từ */}
          <YStack
            flex={isSplitView ? 4.2 : 1}
            borderRightWidth={isSplitView ? 1 : 0}
            borderColor={colors.borderColor}
          >
            {isLoading ? (
              <YStack flex={1} justifyContent="center" alignItems="center">
                <ActivityIndicator size="large" color={BRAND_COLORS.crimson} />
                <Text marginTop={12} color={colors.textSecondary}>
                  Đang tải danh sách bộ từ...
                </Text>
              </YStack>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                  padding: 14,
                  gap: 12,
                  paddingBottom: 32,
                }}
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
                {filteredDecks.length === 0 ? (
                  <YStack
                    padding={28}
                    alignItems="center"
                    backgroundColor={colors.cardBg}
                    borderRadius={16}
                  >
                    <Ionicons
                      name="folder-open-outline"
                      size={40}
                      color="#94A3B8"
                    />
                    <Text
                      marginTop={8}
                      fontWeight="600"
                      color={colors.textSecondary}
                    >
                      Không tìm thấy bộ từ nào phù hợp
                    </Text>
                  </YStack>
                ) : (
                  filteredDecks.map((deck, idx) => {
                    const totalCards = deck.cards?.length || 0;
                    const learnedCards =
                      deck.cards?.filter((c) => c.isLearned).length || 0;
                    const pct =
                      totalCards > 0
                        ? Math.round((learnedCards / totalCards) * 100)
                        : 0;
                    const isSelected =
                      isSplitView && selectedDeckId === deck.id;

                    return (
                      <Animated.View
                        key={deck.id}
                        entering={FadeInDown.delay(idx * 60).duration(300)}
                      >
                        <Pressable onPress={() => handleSelectDeck(deck)}>
                          <YStack
                            padding={16}
                            borderRadius={16}
                            borderWidth={isSelected ? 2 : 1.5}
                            borderColor={
                              isSelected
                                ? BRAND_COLORS.crimson
                                : colors.borderColor
                            }
                            backgroundColor={
                              isSelected
                                ? colors.isDark
                                  ? '#1A1423'
                                  : '#FFF5F5'
                                : colors.cardBg
                            }
                            gap={8}
                          >
                            <XStack
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <YStack
                                backgroundColor={colors.brandBadgeBg}
                                paddingHorizontal={10}
                                paddingVertical={3}
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

                              <XStack alignItems="center" gap={4}>
                                <Ionicons
                                  name="layers"
                                  size={14}
                                  color={
                                    colors.isDark
                                      ? BRAND_COLORS.gold
                                      : BRAND_COLORS.navy
                                  }
                                />
                                <Text
                                  fontSize={12}
                                  fontWeight="800"
                                  color={
                                    colors.isDark
                                      ? BRAND_COLORS.gold
                                      : BRAND_COLORS.navy
                                  }
                                >
                                  {totalCards} thẻ
                                </Text>
                              </XStack>
                            </XStack>

                            <Text
                              fontSize={17}
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

                            {/* Thanh tiến độ nhỏ của từng bộ từ */}
                            <YStack gap={4} marginTop={4}>
                              <XStack justifyContent="space-between">
                                <Text
                                  fontSize={11}
                                  color={colors.textSecondary}
                                >
                                  Đã thuộc {learnedCards}/{totalCards} từ
                                </Text>
                                <Text
                                  fontSize={11}
                                  fontWeight="800"
                                  color={
                                    pct === 100
                                      ? '#10B981'
                                      : colors.brandAccent
                                  }
                                >
                                  {pct}%
                                </Text>
                              </XStack>
                              <YStack
                                height={7}
                                backgroundColor={colors.subtleBg}
                                borderRadius={999}
                                overflow="hidden"
                              >
                                <YStack
                                  height="100%"
                                  width={`${pct}%`}
                                  backgroundColor={
                                    pct === 100
                                      ? '#10B981'
                                      : BRAND_COLORS.gold
                                  }
                                />
                              </YStack>
                            </YStack>
                          </YStack>
                        </Pressable>
                      </Animated.View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </YStack>

          {/* CỘT PHẢI (MÀN HÌNH 6): Chỉ xuất hiện khi xoay ngang hoặc dùng Tablet/iPad */}
          {isSplitView && (
            <YStack flex={5.8} backgroundColor={colors.pageBg}>
              <DeckDetailContent deckId={selectedDeckId} isSplitView />
            </YStack>
          )}
        </XStack>
      </YStack>
    </SafeAreaView>
  );
}
