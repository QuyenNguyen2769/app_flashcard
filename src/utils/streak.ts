import { ProgressEntry } from '@/types/flashcard';
import { formatLocalDate } from '@/utils/spacedRepetition';

export function calculateStreak(
  progress: Pick<ProgressEntry, 'date' | 'studiedCount'>[],
  today: Date
): number {
  const activeDates = new Set(
    progress.filter((entry) => entry.studiedCount > 0).map((entry) => entry.date)
  );
  const cursor = new Date(today);
  if (!activeDates.has(formatLocalDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (activeDates.has(formatLocalDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
