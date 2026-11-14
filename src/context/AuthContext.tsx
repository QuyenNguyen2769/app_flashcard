import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User } from '@/types/flashcard';

const STORAGE_KEYS = {
  USER: '@flashcard_user',
  ONBOARDING: '@flashcard_onboarding_done',
  THEME: '@flashcard_theme_mode',
  USER_LEARNED_MAP: '@flashcard_user_learned_map',
};

// Dữ liệu thẻ đã thuộc mặc định cho 2 tài khoản Demo có sẵn
// Còn mọi tài khoản mới đăng ký sẽ bắt đầu từ mảng rỗng [] (0 từ đã thuộc!)
const DEFAULT_USER_LEARNED_CARDS: Record<string, string[]> = {
  'sinhvien@gmail.com': ['c1', 'c3', 'c5', 'c6', 'c7', 'c11', 'c12', 'c14'], // 8 từ
  'test@gmail.com': ['c1', 'c3', 'c6', 'c11', 'c14'], // 5 từ
};

// ============================================================================
// BẢNG MÀU THIẾT KẾ CHỦ ĐẠO (BRAND PALETTE)
// Kết hợp 4 màu người dùng chọn (#9B0000, #0F1629, #FEC341, #010101) + Trắng (#FFFFFF)
// ============================================================================
export const BRAND_COLORS = {
  crimson: '#9B0000',      // Đỏ Đô chủ đạo (Hình 1)
  crimsonLight: '#FEE2E2', // Đỏ phấn nhạt làm nền badge
  crimsonBright: '#EF4444',// Đỏ tươi hiển thị trên nền tối
  navy: '#0F1629',         // Xanh Đen Midnight (Hình 2)
  navyLight: '#1E293B',    // Xanh Đen nhạt hơn cho viền/nút phụ
  gold: '#FEC341',         // Vàng Hoàng Kim (Hình 3)
  goldDark: '#B45309',     // Vàng Hổ Phách đậm để chữ rõ nét trên nền trắng
  goldSoft: '#FFFBEB',     // Nền vàng kem dịu mắt
  obsidian: '#010101',     // Đen Tuyền (Hình 4)
  white: '#FFFFFF',        // Trắng tinh khôi
  emerald: '#10B981',      // Xanh lá bổ trợ cho trạng thái "Đã thuộc"
  emeraldSoft: '#DCFCE7',
};

export interface AppThemeColors {
  isDark: boolean;
  // 5 màu gốc thương hiệu
  crimson: string;
  navy: string;
  gold: string;
  obsidian: string;
  white: string;
  // Màu giao diện động theo chế độ Sáng / Tối
  pageBg: string;
  cardBg: string;
  subtleBg: string;
  heroBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  brandAccent: string;
  brandBadgeBg: string;
  brandBadgeText: string;
  goldBadgeBg: string;
  goldBadgeText: string;
  reviewCardBg: string;
  reviewCardBorder: string;
  inputBg: string;
}

interface AuthContextValue {
  user: User | null;
  hasSeenOnboarding: boolean;
  isLoadingAuth: boolean;
  themeMode: 'light' | 'dark';
  colors: AppThemeColors;
  learnedCardIds: string[];
  setSessionUser: (user: User, isNewRegistration?: boolean) => Promise<void>;
  toggleUserCardLearned: (cardId: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  toggleThemeMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [userLearnedMap, setUserLearnedMap] = useState<Record<string, string[]>>(
    DEFAULT_USER_LEARNED_CARDS
  );

  useEffect(() => {
    async function loadSavedState() {
      try {
        const [savedUserJson, savedOnboarding, savedTheme, savedLearnedJson] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.USER),
            AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING),
            AsyncStorage.getItem(STORAGE_KEYS.THEME),
            AsyncStorage.getItem(STORAGE_KEYS.USER_LEARNED_MAP),
          ]);

        if (savedLearnedJson) {
          const parsedMap = JSON.parse(savedLearnedJson);
          setUserLearnedMap({
            ...DEFAULT_USER_LEARNED_CARDS,
            ...parsedMap,
          });
        }
        if (savedUserJson) {
          setUser(JSON.parse(savedUserJson));
        }
        if (savedOnboarding === 'true') {
          setHasSeenOnboarding(true);
        }
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setThemeMode(savedTheme);
        }
      } catch {
        // Bỏ qua lỗi đọc bộ nhớ cục bộ
      } finally {
        setIsLoadingAuth(false);
      }
    }

    loadSavedState();
  }, []);

  const userKey = user?.email?.toLowerCase() || '';

  const learnedCardIds = useMemo(() => {
    if (!userKey) return [];
    return userLearnedMap[userKey] ?? [];
  }, [userKey, userLearnedMap]);

  const setSessionUser = async (nextUser: User, isNewRegistration = false) => {
    const emailKey = nextUser.email.toLowerCase();
    const updatedMap = { ...userLearnedMap };

    if (isNewRegistration) {
      updatedMap[emailKey] = [];
      setUserLearnedMap(updatedMap);
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_LEARNED_MAP,
        JSON.stringify(updatedMap)
      );
    } else if (!(emailKey in updatedMap)) {
      updatedMap[emailKey] = DEFAULT_USER_LEARNED_CARDS[emailKey] ?? [];
      setUserLearnedMap(updatedMap);
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_LEARNED_MAP,
        JSON.stringify(updatedMap)
      );
    }

    const syncedUser: User = {
      ...nextUser,
      todayStudied: updatedMap[emailKey]?.length ?? 0,
    };

    setUser(syncedUser);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(syncedUser));
  };

  const toggleUserCardLearned = async (cardId: string) => {
    if (!userKey) return;
    const currentList = userLearnedMap[userKey] ?? [];
    const exists = currentList.includes(cardId);
    const nextList = exists
      ? currentList.filter((id) => id !== cardId)
      : [...currentList, cardId];

    const nextMap = {
      ...userLearnedMap,
      [userKey]: nextList,
    };
    setUserLearnedMap(nextMap);
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER_LEARNED_MAP,
      JSON.stringify(nextMap)
    );

    if (user) {
      const updatedUser: User = {
        ...user,
        todayStudied: nextList.length,
      };
      setUser(updatedUser);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    }
  };

  const logout = async () => {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
      AsyncStorage.removeItem('@flashcard_token'),
    ]);
    setUser(null);
  };

  const completeOnboarding = async () => {
    setHasSeenOnboarding(true);
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
  };

  const resetOnboarding = async () => {
    setHasSeenOnboarding(false);
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING);
  };

  const toggleThemeMode = async () => {
    const next = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(next);
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, next);
  };

  const colors: AppThemeColors = useMemo(() => {
    const isDark = themeMode === 'dark';
    return {
      isDark,
      crimson: BRAND_COLORS.crimson,
      navy: BRAND_COLORS.navy,
      gold: BRAND_COLORS.gold,
      obsidian: BRAND_COLORS.obsidian,
      white: BRAND_COLORS.white,
      // Chế độ Tối dùng nền Đen Tuyền (#010101) + Thẻ Xanh Đen (#0F1629)
      // Chế độ Sáng dùng nền Trắng Xám nhẹ (#F7F8FA) + Thẻ Trắng Tinh (#FFFFFF)
      pageBg: isDark ? BRAND_COLORS.obsidian : '#F7F8FA',
      cardBg: isDark ? BRAND_COLORS.navy : BRAND_COLORS.white,
      subtleBg: isDark ? '#1A243B' : '#F1F5F9',
      heroBg: isDark ? '#151E36' : BRAND_COLORS.navy,
      borderColor: isDark ? '#23304E' : '#E2E8F0',
      textPrimary: isDark ? BRAND_COLORS.white : BRAND_COLORS.obsidian,
      textSecondary: isDark ? '#CBD5E1' : '#475569',
      textMuted: isDark ? '#94A3B8' : '#64748B',
      brandAccent: isDark ? '#FF6B6B' : BRAND_COLORS.crimson,
      brandBadgeBg: isDark ? 'rgba(155, 0, 0, 0.35)' : '#FEE2E2',
      brandBadgeText: isDark ? '#FCA5A5' : BRAND_COLORS.crimson,
      goldBadgeBg: isDark ? 'rgba(254, 195, 65, 0.18)' : '#FEF3C7',
      goldBadgeText: isDark ? BRAND_COLORS.gold : '#B45309',
      reviewCardBg: isDark ? '#141D33' : '#FFFDF7',
      reviewCardBorder: isDark ? 'rgba(254, 195, 65, 0.45)' : '#FDE68A',
      inputBg: isDark ? '#080C17' : BRAND_COLORS.white,
    };
  }, [themeMode]);

  return (
    <AuthContext.Provider
      value={{
        user,
        hasSeenOnboarding,
        isLoadingAuth,
        themeMode,
        colors,
        learnedCardIds,
        setSessionUser,
        toggleUserCardLearned,
        logout,
        completeOnboarding,
        resetOnboarding,
        toggleThemeMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider');
  }
  return ctx;
}
