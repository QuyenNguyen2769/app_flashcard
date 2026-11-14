import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  createDeckApi,
  deleteDeckApi,
  getDeckByIdApi,
  getDecksApi,
  getProgressApi,
  getUsersApi,
  loginApi,
  recordQuizResultApi,
  recordStudyProgressApi,
  registerApi,
  RegisterPayload,
  toggleCardFavoriteApi,
  toggleCardLearnedApi,
  toggleDeckFavoriteApi,
  updateCardSpacedRepetitionApi,
  updateDeckApi,
  updateUserProfileApi,
} from '@/services/api';
import { isCardDueForReview } from '@/services/spacedRepetition';
import { Deck, ReviewCardWithDeck } from '@/types/flashcard';

export const QUERY_KEYS = {
  users: ['users'] as const,
  progress: (userId: string) => ['progress', userId] as const,
  decks: ['decks'] as const,
  deckDetail: (id: string) => ['decks', id] as const,
};

// Áp trạng thái đã thuộc (learnedCardIds) của riêng từng User lên danh sách thẻ
function applyUserProgressToDeck(deck: Deck, learnedCardIds: string[]): Deck {
  const learnedSet = new Set(learnedCardIds);
  return {
    ...deck,
    cards: (deck.cards || []).map((card) => {
      // Nếu có trong learnedSet thì coi như learned
      const isLearned = learnedSet.has(card.id) || Boolean(card.isLearned);
      const needReview = isCardDueForReview({ ...card, isLearned });
      return {
        ...card,
        isLearned,
        needReview,
      };
    }),
  };
}

// 1. Lấy danh sách tất cả bộ từ
export function useDecksQuery() {
  const { learnedCardIds } = useAuth();
  const query = useQuery({
    queryKey: QUERY_KEYS.decks,
    queryFn: getDecksApi,
    staleTime: 1000 * 60 * 2,
  });

  const userDecks = useMemo(() => {
    if (!query.data) return [];
    return query.data.map((d) => applyUserProgressToDeck(d, learnedCardIds));
  }, [query.data, learnedCardIds]);

  return {
    ...query,
    data: userDecks,
  };
}

// 2. Lấy chi tiết 1 bộ từ theo ID
export function useDeckDetailQuery(deckId?: string) {
  const { learnedCardIds } = useAuth();
  const query = useQuery({
    queryKey: QUERY_KEYS.deckDetail(deckId || '1'),
    queryFn: () => getDeckByIdApi(deckId || '1'),
    enabled: Boolean(deckId),
  });

  const userDeck = useMemo(() => {
    if (!query.data) return undefined;
    return applyUserProgressToDeck(query.data, learnedCardIds);
  }, [query.data, learnedCardIds]);

  return {
    ...query,
    data: userDeck,
  };
}

// 3. Lấy danh sách người dùng
export function useUsersQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: getUsersApi,
  });
}

export function useProgressQuery(userId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.progress(userId || ''),
    queryFn: () => getProgressApi(userId || ''),
    enabled: Boolean(userId),
  });
}

// 4. Mutation Đăng nhập
export function useLoginMutation() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginApi(email, password),
  });
}

// 5. Mutation Đăng ký tài khoản mới
export function useRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterPayload) => registerApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

// 6. Mutation đánh dấu Đã thuộc / Cần ôn cho 1 thẻ từ
export function useToggleCardLearnedMutation() {
  const queryClient = useQueryClient();
  const { toggleUserCardLearned } = useAuth();

  return useMutation({
    mutationFn: async (params: { deckId: string; cardId: string }) => {
      await toggleUserCardLearned(params.cardId);
      return toggleCardLearnedApi(params);
    },
    onSuccess: (updatedDeck) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.decks });
      queryClient.setQueryData(
        QUERY_KEYS.deckDetail(updatedDeck.id),
        updatedDeck
      );
    },
  });
}

// 7. Mutation Spaced Repetition (Lặp lại ngắt quãng khi học thẻ)
export function useSpacedRepetitionMutation() {
  const queryClient = useQueryClient();
  const { toggleUserCardLearned, learnedCardIds } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      deckId: string;
      cardId: string;
      isKnown: boolean;
    }) => {
      const isAlreadyLearned = learnedCardIds.includes(params.cardId);
      if (params.isKnown && !isAlreadyLearned) {
        await toggleUserCardLearned(params.cardId);
      } else if (!params.isKnown && isAlreadyLearned) {
        await toggleUserCardLearned(params.cardId);
      }
      return updateCardSpacedRepetitionApi(params);
    },
    onSuccess: (updatedDeck) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.decks });
      queryClient.setQueryData(
        QUERY_KEYS.deckDetail(updatedDeck.id),
        updatedDeck
      );
    },
  });
}

// 8. Mutation Yêu thích bộ từ
export function useToggleDeckFavoriteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deckId: string) => toggleDeckFavoriteApi(deckId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.decks });
      queryClient.setQueryData(QUERY_KEYS.deckDetail(updated.id), updated);
    },
  });
}

// 9. Mutation Yêu thích thẻ từ
export function useToggleCardFavoriteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deckId, cardId }: { deckId: string; cardId: string }) =>
      toggleCardFavoriteApi(deckId, cardId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.decks });
      queryClient.setQueryData(QUERY_KEYS.deckDetail(updated.id), updated);
    },
  });
}

// 10. Mutation tạo bộ từ
export function useCreateDeckMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Deck, 'id' | 'createdAt'>) =>
      createDeckApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.decks });
    },
  });
}

// 11. Mutation sửa bộ từ
export function useUpdateDeckMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      deckId,
      payload,
    }: {
      deckId: string;
      payload: Partial<Deck>;
    }) => updateDeckApi(deckId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.decks });
      queryClient.setQueryData(QUERY_KEYS.deckDetail(updated.id), updated);
    },
  });
}

// 12. Mutation xóa bộ từ
export function useDeleteDeckMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deckId: string) => deleteDeckApi(deckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.decks });
    },
  });
}

// 13. Mutation lưu kết quả Quiz vào User history
export function useRecordQuizMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      userId: string;
      scorePercent: number;
      studiedCount?: number;
      correctCount?: number;
      wrongCount?: number;
    }) => recordQuizResultApi(params),
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.progress(params.userId) });
    },
  });
}

export function useRecordStudyProgressMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { userId: string; isCorrect: boolean }) =>
      recordStudyProgressApi(params),
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.progress(params.userId) });
    },
  });
}

export function useUpdateUserProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { userId: string; name: string }) =>
      updateUserProfileApi(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

// Hàm tiện ích tính toán tiến độ tổng hợp và danh sách từ cần ôn hôm nay
export function computeStudyOverview(decks: Deck[] = []) {
  let totalCards = 0;
  let learnedCards = 0;
  let favoriteDecksCount = 0;
  let favoriteCardsCount = 0;
  const reviewCards: ReviewCardWithDeck[] = [];

  for (const deck of decks) {
    if (deck.isFavorite) favoriteDecksCount++;
    const cards = deck.cards || [];
    for (const card of cards) {
      totalCards += 1;
      if (card.isFavorite) favoriteCardsCount++;
      if (card.isLearned) {
        learnedCards += 1;
      }
      if (card.needReview || !card.isLearned) {
        reviewCards.push({
          ...card,
          deckId: deck.id,
          deckTitle: deck.title,
          category: deck.category,
        });
      }
    }
  }

  const progressPercent =
    totalCards > 0 ? Math.round((learnedCards / totalCards) * 100) : 0;

  return {
    totalDecks: decks.length,
    totalCards,
    learnedCards,
    favoriteDecksCount,
    favoriteCardsCount,
    reviewCount: reviewCards.length,
    progressPercent,
    reviewCards,
  };
}
