// Định nghĩa kiểu dữ liệu chuẩn cho toàn bộ ứng dụng Flashcard (Màn 1 -> 13)

export interface CardItem {
  id: string;
  term: string;        // Từ vựng tiếng Anh
  phonetic?: string;   // Phiên âm (VD: /ˈkɒntrækt/)
  definition: string;  // Nghĩa tiếng Việt
  example?: string;    // Câu ví dụ
  isLearned: boolean;  // Đã thuộc hay chưa
  needReview: boolean; // Cần ôn tập hôm nay hay không
}

export interface Deck {
  id: string;
  userId: string;
  title: string;       // Tên bộ từ
  description: string; // Mô tả bộ từ
  category: string;    // Chủ đề (TOEIC, IT English, IELTS, Giao tiếp...)
  createdAt: string;
  cards: CardItem[];   // Danh sách các thẻ từ nằm trong bộ từ
}

export interface ProgressEntry {
  date: string;        // Ngày học (YYYY-MM-DD)
  studiedCount: number;// Số từ đã học trong ngày
  quizScore: number;   // Điểm bài Quiz (%)
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
