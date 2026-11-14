// Định nghĩa kiểu dữ liệu chuẩn cho toàn bộ ứng dụng Flashcard (Màn 1 -> 13)

export interface CardItem {
  id: string;
  term: string;        // Từ vựng tiếng Anh
  phonetic?: string;   // Phiên âm (VD: /ˈkɒntrækt/)
  definition: string;  // Nghĩa tiếng Việt
  example?: string;    // Câu ví dụ
  isLearned: boolean;  // Đã thuộc hay chưa
  needReview: boolean; // Cần ôn tập hôm nay hay không
  isFavorite?: boolean; // Yêu thích (Chức năng 8)
  leitnerLevel?: number; // Cấp độ lặp lại ngắt quãng (1 - 5) (Chức năng 5: Spaced Repetition)
  nextReviewDate?: string; // Ngày ôn tiếp theo (YYYY-MM-DD)
  lastReviewedDate?: string; // Ngày học gần nhất
}

export interface Deck {
  id: string;
  userId: string;
  title: string;       // Tên bộ từ
  description: string; // Mô tả bộ từ
  category: string;    // Chủ đề (TOEIC, IT English, IELTS, Giao tiếp...)
  createdAt: string;
  cards: CardItem[];   // Danh sách các thẻ từ nằm trong bộ từ
  isFavorite?: boolean; // Bộ từ yêu thích (Chức năng 8)
}

export interface ProgressEntry {
  date: string;        // Ngày học (YYYY-MM-DD)
  studiedCount: number;// Số từ đã học trong ngày
  quizScore: number;   // Điểm bài Quiz (%)
  correct?: number;
  wrong?: number;
}

export interface Progress {
  id: string;
  userId: string;
  date: string;
  cardsStudied: number;
  correct: number;
  wrong: number;
  quizScore?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar: string;
  streak: number;      // Số ngày học liên tiếp
  dailyGoal: number;   // Mục tiêu số từ mỗi ngày
  todayStudied: number;// Số từ đã học hôm nay
  progressHistory: ProgressEntry[];
}

export interface ReviewCardWithDeck extends CardItem {
  deckId: string;
  deckTitle: string;
  category: string;
}

export interface QuizQuestion {
  id: string;
  cardId: string;
  deckId: string;
  term: string;
  phonetic?: string;
  definition: string;
  example?: string;
  type: 'multiple_choice' | 'fill_in_blank';
  questionText: string;
  correctAnswer: string;
  options?: string[]; // 4 lựa chọn cho trắc nghiệm
  hint?: string;
}

export interface QuizAnswerRecord {
  questionId: string;
  term: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  definition: string;
}
