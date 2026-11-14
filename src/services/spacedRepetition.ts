import { CardItem } from '@/types/flashcard';
import { formatLocalDate, isDueForReview, reviewCard } from '@/utils/spacedRepetition';

// ============================================================================
// HỆ THỐNG LẶP LẠI NGẮT QUÃNG ĐƠN GIẢN (SPACED REPETITION - HỆ THỐNG LEITNER)
// Đáp ứng Chức năng 5: Ôn tập theo lịch (lặp lại ngắt quãng đơn giản)
// ============================================================================

export const LEITNER_INTERVALS_DAYS = [1, 3, 7, 14, 30]; // Số ngày ngắt quãng cho 5 hộp Leitner

export function formatDateString(date: Date): string {
  return formatLocalDate(date);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export interface ReviewResult {
  nextLevel: number;
  nextReviewDate: string;
  isLearned: boolean;
  needReview: boolean;
  lastReviewedDate: string;
}

/**
 * Tính toán cập nhật cấp độ hộp Leitner khi học thẻ:
 * - Nếu người học chọn "Đã thuộc / Biết": thăng cấp (1 -> 2 -> 3 -> 4 -> 5), ngày ôn tiếp theo lùi lại xa hơn.
 * - Nếu người học chọn "Chưa biết / Quên": đưa về hộp 1, yêu cầu ôn lại vào ngày mai (hoặc hôm nay).
 */
export function computeSpacedRepetitionStep(
  currentLevel: number = 1,
  isKnown: boolean
): ReviewResult {
  const result = reviewCard({ leitnerLevel: currentLevel }, isKnown, new Date());
  return {
    nextLevel: result.level,
    nextReviewDate: result.nextReviewDate,
    isLearned: result.isLearned,
    needReview: result.needReview,
    lastReviewedDate: result.lastReviewedDate,
  };
}

/**
 * Kiểm tra xem thẻ có đến hạn cần ôn hôm nay hay không
 */
export function isCardDueForReview(card: CardItem): boolean {
  if (!card.isLearned || card.needReview) return true;
  if (!card.nextReviewDate) return false;
  return isDueForReview(card, new Date());
}

export function getLeitnerLabel(level: number = 1): {
  text: string;
  color: string;
  boxNum: number;
} {
  switch (level) {
    case 1:
      return { text: 'Hộp 1 (Mới học)', color: '#EF4444', boxNum: 1 };
    case 2:
      return { text: 'Hộp 2 (Đang nhớ)', color: '#F59E0B', boxNum: 2 };
    case 3:
      return { text: 'Hộp 3 (Nhớ tốt)', color: '#3B82F6', boxNum: 3 };
    case 4:
      return { text: 'Hộp 4 (Vững chắc)', color: '#8B5CF6', boxNum: 4 };
    case 5:
      return { text: 'Hộp 5 (Thành thạo)', color: '#10B981', boxNum: 5 };
    default:
      return { text: 'Hộp 1 (Mới học)', color: '#EF4444', boxNum: 1 };
  }
}
