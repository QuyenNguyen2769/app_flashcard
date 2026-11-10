import axios from 'axios';
import { CardItem, Deck, User } from '@/types/flashcard';
import { INITIAL_DECKS, INITIAL_USERS } from './mockData';

// ============================================================================
// CẤU HÌNH AXIOS GỌI MOCKAPI.IO (Đáp ứng yêu cầu: "Dùng Axios để get API")
// ============================================================================
export const API_BASE_URL = 'https://6af0244ab9925b27ce17349c.mockapi.io';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Bộ nhớ đệm dự phòng trường hợp mất mạng khi thuyết trình
let fallbackUsers: User[] = [...INITIAL_USERS];
let fallbackDecks: Deck[] = [...INITIAL_DECKS];

// Chuẩn hóa dữ liệu Deck trả về từ MockAPI (đảm bảo luôn có mảng cards)
function normalizeDeck(raw: any, index = 0): Deck {
  const defaultDeck = INITIAL_DECKS[index % INITIAL_DECKS.length];
  return {
    id: String(raw?.id ?? defaultDeck.id),
    userId: String(raw?.userId ?? '1'),
    title: raw?.title || defaultDeck.title,
    description: raw?.description || defaultDeck.description,
    category: raw?.category || defaultDeck.category,
    createdAt: raw?.createdAt || new Date().toISOString(),
    cards: Array.isArray(raw?.cards) ? raw.cards : defaultDeck.cards,
  };
}

// Chuẩn hóa dữ liệu User trả về từ MockAPI
function normalizeUser(raw: any): User {
  return {
    id: String(raw?.id ?? '1'),
    name: raw?.name || 'Sinh viên',
    email: raw?.email || 'sinhvien@gmail.com',
    password: raw?.password || '123456',
    avatar: raw?.avatar || 'https://i.pravatar.cc/150?img=11',
    streak: typeof raw?.streak === 'number' ? raw.streak : 5,
    dailyGoal: typeof raw?.dailyGoal === 'number' ? raw.dailyGoal : 20,
    todayStudied: typeof raw?.todayStudied === 'number' ? raw.todayStudied : 14,
    progressHistory: Array.isArray(raw?.progressHistory)
      ? raw.progressHistory
      : INITIAL_USERS[0].progressHistory,
  };
}

// ----------------------------------------------------------------------------
// 1. API NGƯỜI DÙNG (USERS - Dùng cho Màn 2: Đăng nhập, Màn 3: Đăng ký, Màn 4: Trang chủ)
// ----------------------------------------------------------------------------

export async function getUsersApi(): Promise<User[]> {
  try {
    const response = await apiClient.get<User[]>('/users');
    if (Array.isArray(response.data) && response.data.length > 0) {
      const normalized = response.data.map(normalizeUser);
      fallbackUsers = normalized;
      return normalized;
    }
    return fallbackUsers;
  } catch {
    return fallbackUsers;
  }
}

export async function loginApi(email: string, password: string): Promise<User> {
  const trimmedEmail = email.trim().toLowerCase();
  const users = await getUsersApi();

  const foundUser = users.find(
    (u) =>
      u.email.toLowerCase() === trimmedEmail &&
      (u.password === password || !u.password)
  );

  if (!foundUser) {
    throw new Error('Email hoặc mật khẩu không chính xác!');
  }

  return foundUser;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export async function registerApi(payload: RegisterPayload): Promise<User> {
  const users = await getUsersApi();
  const exists = users.some(
    (u) => u.email.toLowerCase() === payload.email.trim().toLowerCase()
  );

  if (exists) {
    throw new Error('Email này đã được đăng ký. Vui lòng dùng email khác!');
  }

  const newUserPayload: Omit<User, 'id'> = {
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    avatar: `https://i.pravatar.cc/150?u=${ encodeURIComponent(payload.email.trim()) }`,
    streak: 1,
    dailyGoal: 20,
    todayStudied: 0,
    progressHistory: [
      {
        date: new Date().toISOString().split('T')[0],
        studiedCount: 0,
        quizScore: 0,
      },
    ],
  };

  try {
    const response = await apiClient.post<User>('/users', newUserPayload);
    const created = normalizeUser(response.data);
    fallbackUsers = [...fallbackUsers, created];
    return created;
  } catch {
    const created: User = {
      ...newUserPayload,
      id: String(Date.now()),
    };
    fallbackUsers = [...fallbackUsers, created];
    return created;
  }
}

// ----------------------------------------------------------------------------
// 2. API BỘ TỪ & THẺ TỪ (DECKS & CARDS - Dùng cho Màn 4, 5, 6 và 7 -> 12)
// ----------------------------------------------------------------------------

export async function getDecksApi(): Promise<Deck[]> {
  try {
    const response = await apiClient.get<Deck[]>('/decks');
    if (Array.isArray(response.data) && response.data.length > 0) {
      const normalized = response.data.map((item, idx) => normalizeDeck(item, idx));
      fallbackDecks = normalized;
      return normalized;
    }
    return fallbackDecks;
  } catch {
    return fallbackDecks;
  }
}

export async function getDeckByIdApi(deckId: string): Promise<Deck> {
  try {
    const response = await apiClient.get<Deck>(`/decks/${deckId}`);
    if (response.data && response.data.id) {
      return normalizeDeck(response.data);
    }
  } catch {
    // Fallback tìm trong danh sách hiện có
  }
  const found = fallbackDecks.find((d) => d.id === deckId) || fallbackDecks[0];
  return found;
}

// Cập nhật trạng thái Đã thuộc / Cần ôn của 1 thẻ từ trong bộ từ (dùng cho Màn 4 & Màn 6)
export async function toggleCardLearnedApi(params: {
  deckId: string;
  cardId: string;
}): Promise<Deck> {
  const currentDeck = await getDeckByIdApi(params.deckId);
  const updatedCards: CardItem[] = currentDeck.cards.map((card) => {
    if (card.id === params.cardId) {
      const nextLearned = !card.isLearned;
      return {
        ...card,
        isLearned: nextLearned,
        needReview: !nextLearned,
      };
    }
    return card;
  });

  const updatedDeck: Deck = {
    ...currentDeck,
    cards: updatedCards,
  };

  fallbackDecks = fallbackDecks.map((d) =>
    d.id === params.deckId ? updatedDeck : d
  );

  try {
    const response = await apiClient.put<Deck>(
      `/decks/${params.deckId}`,
      updatedDeck
    );
    return normalizeDeck(response.data);
  } catch {
    return updatedDeck;
  }
}

// Các hàm API hỗ trợ sẵn cho bạn cùng nhóm (Màn 7: Thêm/sửa bộ từ, Màn 12: AI tạo bộ từ)
export async function createDeckApi(
  payload: Omit<Deck, 'id' | 'createdAt'>
): Promise<Deck> {
  const body = {
    ...payload,
    createdAt: new Date().toISOString(),
  };
  try {
    const response = await apiClient.post<Deck>('/decks', body);
    const created = normalizeDeck(response.data);
    fallbackDecks = [created, ...fallbackDecks];
    return created;
  } catch {
    const created: Deck = {
      ...body,
      id: String(Date.now()),
    };
    fallbackDecks = [created, ...fallbackDecks];
    return created;
  }
}

export async function updateDeckApi(
  deckId: string,
  payload: Partial<Deck>
): Promise<Deck> {
  const current = await getDeckByIdApi(deckId);
  const merged = { ...current, ...payload };
  fallbackDecks = fallbackDecks.map((d) => (d.id === deckId ? merged : d));
  try {
    const response = await apiClient.put<Deck>(`/decks/${deckId}`, merged);
    return normalizeDeck(response.data);
  } catch {
    return merged;
  }
}

export async function deleteDeckApi(deckId: string): Promise<void> {
  fallbackDecks = fallbackDecks.filter((d) => d.id !== deckId);
  try {
    await apiClient.delete(`/decks/${deckId}`);
  } catch {
    // Đã xóa trong fallback
  }
}
