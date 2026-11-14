import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { CardItem, Deck, Progress, User } from '@/types/flashcard';
import { INITIAL_DECKS, INITIAL_USERS } from './mockData';
import { isCardDueForReview } from './spacedRepetition';
import { formatLocalDate, reviewCard } from '@/utils/spacedRepetition';

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

const STORAGE_KEY_DECKS = '@flashcard_persisted_decks';
const STORAGE_KEY_USERS = '@flashcard_persisted_users';

// Bộ nhớ đệm dự phòng trường hợp mất mạng khi thuyết trình
let fallbackUsers: User[] = [...INITIAL_USERS];
let fallbackDecks: Deck[] = [...INITIAL_DECKS];
let isStorageLoaded = false;

async function ensureStorageLoaded() {
  if (isStorageLoaded) return;
  try {
    const [savedDecks, savedUsers] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_DECKS),
      AsyncStorage.getItem(STORAGE_KEY_USERS),
    ]);
    if (savedDecks) {
      fallbackDecks = JSON.parse(savedDecks);
    }
    if (savedUsers) {
      fallbackUsers = JSON.parse(savedUsers);
    }
  } catch {
    // Không ảnh hưởng
  } finally {
    isStorageLoaded = true;
  }
}

async function persistFallbackDecks() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(fallbackDecks));
  } catch {}
}

async function persistFallbackUsers() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(fallbackUsers));
  } catch {}
}

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
    isFavorite: Boolean(raw?.isFavorite),
    cards: Array.isArray(raw?.cards)
      ? raw.cards.map((c: any, cIdx: number) => ({
          id: String(c?.id || `c_${cIdx}`),
          term: String(c?.term || ''),
          phonetic: c?.phonetic || '',
          definition: String(c?.definition || ''),
          example: c?.example || '',
          isLearned: Boolean(c?.isLearned),
          needReview: c?.needReview !== undefined ? Boolean(c.needReview) : !c?.isLearned,
          isFavorite: Boolean(c?.isFavorite),
          leitnerLevel: typeof c?.leitnerLevel === 'number' ? c.leitnerLevel : (c?.isLearned ? 3 : 0),
          nextReviewDate: c?.nextReviewDate || '',
          lastReviewedDate: c?.lastReviewedDate || '',
        }))
      : defaultDeck.cards,
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
// 1. API NGƯỜI DÙNG (USERS - Màn 2, Màn 3, Màn 4, Màn 11, Màn 13)
// ----------------------------------------------------------------------------

export async function getUsersApi(): Promise<User[]> {
  await ensureStorageLoaded();
  try {
    const response = await apiClient.get<User[]>('/users');
    if (Array.isArray(response.data) && response.data.length > 0) {
      const normalized = response.data.map(normalizeUser);
      fallbackUsers = normalized;
      await persistFallbackUsers();
      return normalized;
    }
    return fallbackUsers;
  } catch {
    return fallbackUsers;
  }
}

export async function getProgressApi(userId: string): Promise<Progress[]> {
  await ensureStorageLoaded();
  const user = fallbackUsers.find((item) => item.id === userId);
  const localRecords = (user?.progressHistory ?? []).map((entry) => ({
    id: `${userId}-${entry.date}`,
    userId,
    date: entry.date,
    cardsStudied: entry.studiedCount,
    correct: entry.correct ?? 0,
    wrong: entry.wrong ?? 0,
    quizScore: entry.quizScore,
  }));
  try {
    const response = await apiClient.get<Progress[]>('/progress', {
      params: { userId },
    });
    if (Array.isArray(response.data)) {
      const records = response.data
        .filter((entry) => String(entry.userId) === userId)
        .map((entry) => ({
          ...entry,
          id: String(entry.id),
          userId: String(entry.userId),
          cardsStudied: Number(entry.cardsStudied) || 0,
          correct: Number(entry.correct) || 0,
          wrong: Number(entry.wrong) || 0,
          quizScore: Number(entry.quizScore) || 0,
        }));
      if (records.length) {
        const byDate = new Map(localRecords.map((entry) => [entry.date, entry]));
        records.forEach((entry) => byDate.set(entry.date, entry));
        return Array.from(byDate.values());
      }
    }
  } catch {
    // Keep using the locally persisted history when the optional resource is unavailable.
  }
  return localRecords;
}

async function syncProgressResource(params: {
  userId: string;
  date: string;
  cardsStudied: number;
  correct: number;
  wrong: number;
  quizScore?: number;
}) {
  try {
    const response = await apiClient.get<Progress[]>('/progress', {
      params: { userId: params.userId, date: params.date },
    });
    const existing = Array.isArray(response.data)
      ? response.data.find(
          (entry) =>
            String(entry.userId) === params.userId && entry.date === params.date
        )
      : undefined;
    if (existing) {
      await apiClient.put(`/progress/${existing.id}`, {
        ...existing,
        cardsStudied: Number(existing.cardsStudied || 0) + params.cardsStudied,
        correct: Number(existing.correct || 0) + params.correct,
        wrong: Number(existing.wrong || 0) + params.wrong,
        quizScore: Math.max(Number(existing.quizScore || 0), params.quizScore || 0),
      });
    } else {
      const user = fallbackUsers.find((item) => item.id === params.userId);
      const entry = user?.progressHistory.find((item) => item.date === params.date);
      await apiClient.post('/progress', {
        userId: params.userId,
        date: params.date,
        cardsStudied: entry?.studiedCount ?? params.cardsStudied,
        correct: entry?.correct ?? params.correct,
        wrong: entry?.wrong ?? params.wrong,
        quizScore: Math.max(entry?.quizScore ?? 0, params.quizScore ?? 0),
      });
    }
  } catch {
    // User progress history remains the offline-compatible source of truth.
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
    avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(payload.email.trim())}`,
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
    await persistFallbackUsers();
    return created;
  } catch {
    const created: User = {
      ...newUserPayload,
      id: String(Date.now()),
    };
    fallbackUsers = [...fallbackUsers, created];
    await persistFallbackUsers();
    return created;
  }
}

// ----------------------------------------------------------------------------
// 2. API BỘ TỪ & THẺ TỪ (DECKS & CARDS - Chức năng 2, 3, 5, 8)
// ----------------------------------------------------------------------------

export async function getDecksApi(): Promise<Deck[]> {
  await ensureStorageLoaded();
  try {
    const response = await apiClient.get<Deck[]>('/decks');
    if (Array.isArray(response.data) && response.data.length > 0) {
      const normalized = response.data.map((item, idx) => normalizeDeck(item, idx));
      fallbackDecks = normalized;
      await persistFallbackDecks();
      return normalized;
    }
    return fallbackDecks;
  } catch {
    return fallbackDecks;
  }
}

export async function getDeckByIdApi(deckId: string): Promise<Deck> {
  await ensureStorageLoaded();
  try {
    const response = await apiClient.get<Deck>(`/decks/${deckId}`);
    if (response.data && response.data.id) {
      return normalizeDeck(response.data);
    }
  } catch {}
  const found = fallbackDecks.find((d) => d.id === deckId) || fallbackDecks[0];
  return found;
}

// Cập nhật trạng thái Đã thuộc / Cần ôn của 1 thẻ từ
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
        leitnerLevel: nextLearned ? 2 : 1,
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
  await persistFallbackDecks();

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

// Cập nhật thẻ theo thuật toán Lặp Lại Ngắt Quãng (Spaced Repetition / Leitner)
export async function updateCardSpacedRepetitionApi(params: {
  deckId: string;
  cardId: string;
  isKnown: boolean;
}): Promise<Deck> {
  const currentDeck = await getDeckByIdApi(params.deckId);
  const updatedCards: CardItem[] = currentDeck.cards.map((card) => {
    if (card.id === params.cardId) {
      const srs = reviewCard(card, params.isKnown, new Date());
      return {
        ...card,
        isLearned: srs.isLearned,
        needReview: srs.needReview,
        leitnerLevel: srs.level,
        nextReviewDate: srs.nextReviewDate,
        lastReviewedDate: srs.lastReviewedDate,
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
  await persistFallbackDecks();

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

// Bật / tắt yêu thích bộ từ (Chức năng 8)
export async function toggleDeckFavoriteApi(deckId: string): Promise<Deck> {
  const currentDeck = await getDeckByIdApi(deckId);
  const updatedDeck: Deck = {
    ...currentDeck,
    isFavorite: !currentDeck.isFavorite,
  };

  fallbackDecks = fallbackDecks.map((d) =>
    d.id === deckId ? updatedDeck : d
  );
  await persistFallbackDecks();

  try {
    const response = await apiClient.put<Deck>(`/decks/${deckId}`, updatedDeck);
    return normalizeDeck(response.data);
  } catch {
    return updatedDeck;
  }
}

// Bật / tắt yêu thích thẻ từ (Chức năng 8)
export async function toggleCardFavoriteApi(
  deckId: string,
  cardId: string
): Promise<Deck> {
  const currentDeck = await getDeckByIdApi(deckId);
  const updatedCards = currentDeck.cards.map((c) =>
    c.id === cardId ? { ...c, isFavorite: !c.isFavorite } : c
  );

  const updatedDeck: Deck = {
    ...currentDeck,
    cards: updatedCards,
  };

  fallbackDecks = fallbackDecks.map((d) =>
    d.id === deckId ? updatedDeck : d
  );
  await persistFallbackDecks();

  try {
    const response = await apiClient.put<Deck>(`/decks/${deckId}`, updatedDeck);
    return normalizeDeck(response.data);
  } catch {
    return updatedDeck;
  }
}

// Tạo bộ từ mới (Chức năng 2 & Chức năng 9)
export async function createDeckApi(
  payload: Omit<Deck, 'id' | 'createdAt'>
): Promise<Deck> {
  await ensureStorageLoaded();
  const body = {
    ...payload,
    createdAt: new Date().toISOString(),
  };
  try {
    const response = await apiClient.post<Deck>('/decks', body);
    const created = normalizeDeck(response.data);
    fallbackDecks = [created, ...fallbackDecks];
    await persistFallbackDecks();
    return created;
  } catch {
    const created: Deck = {
      ...body,
      id: String(Date.now()),
    };
    fallbackDecks = [created, ...fallbackDecks];
    await persistFallbackDecks();
    return created;
  }
}

// Cập nhật bộ từ (Chức năng 2 & Chức năng 3)
export async function updateDeckApi(
  deckId: string,
  payload: Partial<Deck>
): Promise<Deck> {
  await ensureStorageLoaded();
  const current = await getDeckByIdApi(deckId);
  const merged = { ...current, ...payload };
  fallbackDecks = fallbackDecks.map((d) => (d.id === deckId ? merged : d));
  await persistFallbackDecks();
  try {
    const response = await apiClient.put<Deck>(`/decks/${deckId}`, merged);
    return normalizeDeck(response.data);
  } catch {
    return merged;
  }
}

// Xóa bộ từ (Chức năng 2)
export async function deleteDeckApi(deckId: string): Promise<void> {
  await ensureStorageLoaded();
  fallbackDecks = fallbackDecks.filter((d) => d.id !== deckId);
  await persistFallbackDecks();
  try {
    await apiClient.delete(`/decks/${deckId}`);
  } catch {}
}

// Ghi nhận điểm số Quiz vào lịch sử người dùng (Chức năng 6, 7 & Màn 10, 11)
export async function recordQuizResultApi(params: {
  userId: string;
  scorePercent: number;
  studiedCount?: number;
  correctCount?: number;
  wrongCount?: number;
}): Promise<User> {
  await ensureStorageLoaded();
  const todayStr = formatLocalDate(new Date());
  const user = fallbackUsers.find((u) => u.id === params.userId) || fallbackUsers[0];

  const history = [...(user.progressHistory || [])];
  const existingToday = history.find((h) => h.date === todayStr);

  if (existingToday) {
    existingToday.quizScore = Math.max(existingToday.quizScore, params.scorePercent);
    if (params.studiedCount) {
      existingToday.studiedCount += params.studiedCount;
    }
    existingToday.correct = (existingToday.correct ?? 0) + (params.correctCount ?? 0);
    existingToday.wrong = (existingToday.wrong ?? 0) + (params.wrongCount ?? 0);
  } else {
    history.push({
      date: todayStr,
      studiedCount: params.studiedCount ?? 0,
      quizScore: params.scorePercent,
      correct: params.correctCount ?? 0,
      wrong: params.wrongCount ?? 0,
    });
  }

  const updatedUser: User = {
    ...user,
    progressHistory: history,
  };

  fallbackUsers = fallbackUsers.map((u) =>
    u.id === user.id ? updatedUser : u
  );
  await persistFallbackUsers();
  await syncProgressResource({
    userId: user.id,
    date: todayStr,
    cardsStudied: params.studiedCount ?? 0,
    correct: params.correctCount ?? 0,
    wrong: params.wrongCount ?? 0,
    quizScore: params.scorePercent,
  });

  try {
    const response = await apiClient.put<User>(`/users/${user.id}`, updatedUser);
    return normalizeUser(response.data);
  } catch {
    return updatedUser;
  }
}

export async function recordStudyProgressApi(params: {
  userId: string;
  isCorrect: boolean;
}): Promise<User> {
  await ensureStorageLoaded();
  const today = formatLocalDate(new Date());
  const user = fallbackUsers.find((item) => item.id === params.userId);
  if (!user) {
    throw new Error('Không tìm thấy người dùng để lưu tiến độ học.');
  }

  const history = (user.progressHistory || []).map((entry) => ({ ...entry }));
  const todayEntry = history.find((entry) => entry.date === today);
  if (todayEntry) {
    todayEntry.studiedCount += 1;
    todayEntry.correct = (todayEntry.correct ?? 0) + Number(params.isCorrect);
    todayEntry.wrong = (todayEntry.wrong ?? 0) + Number(!params.isCorrect);
  } else {
    history.push({
      date: today,
      studiedCount: 1,
      quizScore: 0,
      correct: Number(params.isCorrect),
      wrong: Number(!params.isCorrect),
    });
  }

  const updatedUser = { ...user, progressHistory: history };
  fallbackUsers = fallbackUsers.map((item) =>
    item.id === user.id ? updatedUser : item
  );
  await persistFallbackUsers();
  await syncProgressResource({
    userId: user.id,
    date: today,
    cardsStudied: 1,
    correct: Number(params.isCorrect),
    wrong: Number(!params.isCorrect),
  });

  try {
    const response = await apiClient.put<User>(`/users/${user.id}`, updatedUser);
    return normalizeUser(response.data);
  } catch {
    return updatedUser;
  }
}

export async function updateUserProfileApi(params: {
  userId: string;
  name: string;
}): Promise<User> {
  await ensureStorageLoaded();
  const user = fallbackUsers.find((item) => item.id === params.userId);
  if (!user) {
    throw new Error('Không tìm thấy tài khoản để cập nhật.');
  }
  const updatedUser = { ...user, name: params.name.trim() };
  fallbackUsers = fallbackUsers.map((item) =>
    item.id === user.id ? updatedUser : item
  );
  await persistFallbackUsers();

  try {
    const response = await apiClient.put<User>(`/users/${user.id}`, updatedUser);
    const normalized = normalizeUser(response.data);
    fallbackUsers = fallbackUsers.map((item) =>
      item.id === user.id ? normalized : item
    );
    await persistFallbackUsers();
    return normalized;
  } catch {
    return updatedUser;
  }
}
