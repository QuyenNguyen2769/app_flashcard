import { CardItem } from '@/types/flashcard';

export const REVIEW_INTERVALS_DAYS = [1, 2, 4, 7, 14, 30] as const;

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function reviewCard(
  card: Pick<CardItem, 'leitnerLevel'>,
  isKnown: boolean,
  today: Date
) {
  const currentLevel = Math.min(5, Math.max(0, card.leitnerLevel ?? 0));
  const level = isKnown ? Math.min(currentLevel + 1, 5) : 0;
  const reviewDate = new Date(today);
  reviewDate.setDate(
    reviewDate.getDate() + REVIEW_INTERVALS_DAYS[level]
  );

  return {
    level,
    nextReviewDate: formatLocalDate(reviewDate),
    lastReviewedDate: formatLocalDate(today),
    isLearned: isKnown,
    needReview: !isKnown,
  };
}

export function isDueForReview(
  card: Pick<CardItem, 'nextReviewDate'>,
  today: Date
): boolean {
  return Boolean(card.nextReviewDate && card.nextReviewDate <= formatLocalDate(today));
}
