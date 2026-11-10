import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  createDeckApi,
  deleteDeckApi,
  getDeckByIdApi,
  getDecksApi,
  getUsersApi,
  loginApi,
  registerApi,
  RegisterPayload,
  toggleCardLearnedApi,
  updateDeckApi,
} from '@/services/api';
import { Deck, ReviewCardWithDeck } from '@/types/flashcard';

export const QUERY_KEYS = {
  users: ['users'] as const,
  decks: ['decks'] as const,
  deckDetail: (id: string) => ['decks', id] as const,
};

// Áp trạng thái đã thuộc (learnedCardIds) của riêng từng User lên danh sách thẻ
function applyUserProgressToDeck(deck: Deck, learnedCardIds: string[]): Deck {
  const learnedSet = new Set(learnedCardIds);
  return {
    ...deck,
    cards: (deck.cards || []).map((card) => {
      const isLearned = learnedSet.has(card.id);
      return {
        ...card,
        isLearned,
        needReview: !isLearned,
      };
    }),
  };
}

// 1. Lấy danh sách tất cả bộ từ (Tự động đồng bộ tiến độ theo đúng tài khoản đang đăng nhập)
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

// 2. Lấy chi tiết 1 bộ từ theo ID (Đồng bộ tiến độ theo đúng tài khoản đang đăng nhập)
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

// 6. Mutation đánh dấu Đã thuộc / Cần ôn cho 1 thẻ từ (Cập nhật cho riêng User hiện tại + gọi API)
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

// 7. Các Mutation tạo / sửa / xóa bộ từ
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

export function useDeleteDeckMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deckId: string) => deleteDeckApi(deckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.decks });
    },
  });
}

// Hàm tiện ích tính toán tiến độ tổng hợp và danh sách từ cần ôn hôm nay
export function computeStudyOverview(decks: Deck[] = []) {
  let totalCards = 0;
  let learnedCards = 0;
  const reviewCards: ReviewCardWithDeck[] = [];

  for (const deck of decks) {
    const cards = deck.cards || [];
    for (const card of cards) {
      totalCards += 1;
      if (card.isLearned) {
        learnedCards += 1;
      } else {
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
    reviewCount: reviewCards.length,
    progressPercent,
    reviewCards,
  };
}
