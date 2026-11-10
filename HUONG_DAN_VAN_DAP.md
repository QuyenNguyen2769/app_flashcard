# 📘 CẨM NANG CHẠY APP & TRẢ LỜI VẤN ĐÁP (MÀN HÌNH 1 → 6)

Tài liệu này tóm tắt toàn bộ kiến trúc và câu trả lời mẫu cho phần việc của bạn (**Khởi tạo Base Project + Màn hình 1 → 6**) để bạn tự tin giải thích 100% trước thầy.

---

## 1. Cách chạy ứng dụng (Trên Web, Máy ảo hoặc Điện thoại thật)

Mở Terminal tại thư mục `t:\app_flashcard` và chạy:

```bash
npx expo start
```

- **Chạy trên điện thoại thật (Real Device)**: Tải ứng dụng **Expo Go** trên App Store / CH Play -> Quét mã QR hiện trên màn hình Terminal.
- **Chạy trên trình duyệt Web**: Nhấn phím `w` trên cửa sổ Terminal.
- **Chạy trên máy ảo Android**: Nhấn phím `a` trên cửa sổ Terminal.

---

## 2. Sơ đồ 6 màn hình bạn phụ trách

| STT | Tên màn hình | File code chính | Công nghệ nổi bật sử dụng |
| :--- | :--- | :--- | :--- |
| **Màn 1** | **Splash / Onboarding** | `src/app/onboarding.tsx` | **TamaGUI** (`YStack`, `XStack`, `Button`) + **Reanimated** (`useSharedValue`, `withSpring`, `withRepeat`, `FadeInDown`) |
| **Màn 2** | **Đăng nhập (Login)** | `src/app/login.tsx` | **TamaGUI** (`Input`, `Button`) + **TanStack Query** (`useLoginMutation`) + **Axios** (`GET /users`) + `AsyncStorage` |
| **Màn 3** | **Đăng ký (Register)** | `src/app/register.tsx` | **TamaGUI** Form + **TanStack Query** (`useRegisterMutation`) + **Axios** (`POST /users`) |
| **Màn 4** | **Trang chủ (Home)** | `src/app/(tabs)/index.tsx` | **TanStack Query** (`useDecksQuery`) + **Reanimated** (Thanh tiến độ học chạy mượt) + Đổi Theme Sáng/Tối |
| **Màn 5** | **Danh sách bộ từ** | `src/app/(tabs)/decks.tsx` | Tìm kiếm, lọc theo chủ đề + **Responsive Split-View** (Tự động chia 2 cột khi xoay ngang / Tablet) |
| **Màn 6** | **Chi tiết bộ từ (Danh sách thẻ)** | `src/components/DeckDetailContent.tsx` & `src/app/deck/[id].tsx` | Hiển thị thẻ từ, lật xem nhanh câu ví dụ, đánh dấu *Đã thuộc / Cần ôn* qua **Axios PUT** |

---

## 3. Bộ câu hỏi & Trả lời Vấn đáp với Thầy

### Câu hỏi 1: *"Em dùng Axios để gọi API ở đâu? Giải thích luồng hoạt động?"*
- **Mở file**: `src/services/api.ts`
- **Trả lời**:
  - Em khởi tạo một instance của Axios bằng `axios.create({ baseURL: 'https://6af0244ab9925b27ce17349c.mockapi.io' })` ở dòng 9.
  - Khi lấy danh sách bộ từ (`getDecksApi`), em dùng `apiClient.get('/decks')`.
  - Khi đăng ký tài khoản mới (`registerApi`), em dùng `apiClient.post('/users', newUserPayload)`.
  - Khi đánh dấu đã thuộc 1 thẻ từ (`toggleCardLearnedApi`), em dùng `apiClient.put('/decks/' + deckId, updatedDeck)` để cập nhật lại mảng `cards` trên MockAPI.

### Câu hỏi 2: *"Tại sao nhóm em chọn TanStack Query thay vì Redux Toolkit? Em dùng nó ở đâu?"*
- **Mở file**: `src/hooks/useFlashcardQueries.ts` và `src/app/_layout.tsx`
- **Trả lời**:
  - Ở `src/app/_layout.tsx`, em bọc toàn bộ ứng dụng trong `<QueryClientProvider client={queryClient}>`.
  - Em chọn **TanStack Query** vì dữ liệu của app Flashcard chủ yếu lấy từ Server (MockAPI). TanStack Query tự động quản lý trạng thái `isLoading`, tự động lưu bộ nhớ đệm (`cache`) bằng `queryKey` (`['decks']`, `['users']`), và khi em bấm nút *"Đã thuộc"* ở Màn 4 hoặc Màn 6 (`useToggleCardLearnedMutation`), hàm `queryClient.invalidateQueries({ queryKey: ['decks'] })` sẽ tự động làm mới dữ liệu ở cả Trang chủ lẫn Danh sách bộ từ mà không cần viết boilerplate dài như Redux.

### Câu hỏi 3: *"Em cấu hình và sử dụng TamaGUI như thế nào?"*
- **Mở file**: `src/tamagui.config.ts` và `src/app/_layout.tsx`
- **Trả lời**:
  - Em khởi tạo cấu hình TamaGUI bằng `createTamagui(defaultConfig)` trong `src/tamagui.config.ts`.
  - Trong `src/app/_layout.tsx`, em bọc ứng dụng bằng `<TamaguiProvider>` và `<Theme name={themeMode}>` (`light` hoặc `dark`).
  - Trong các màn hình 1 → 6, thay vì dùng `View` và `StyleSheet` truyền thống, em dùng các component của TamaGUI như `YStack` (xếp dọc), `XStack` (xếp ngang), `Button`, `Input`, `Text` giúp code ngắn gọn và tự động đổi màu nền/màu chữ khi bấm nút chuyển đổi giao diện Sáng/Tối (`toggleThemeMode`).

### Câu hỏi 4: *"Yêu cầu Responsive (khi quay ngang hoặc trên Tablet/iPad) em xử lý ở đâu?"*
- **Mở file**: `src/app/(tabs)/decks.tsx` (Dòng 24 - 28 và dòng 177 - 320) + `app.json` (Dòng 6)
- **Trả lời**:
  - Đầu tiên trong `app.json`, em đặt `"orientation": "default"` để cho phép ứng dụng xoay ngang theo thiết bị.
  - Trong `src/app/(tabs)/decks.tsx`, em dùng hook `useWindowDimensions()` của React Native để lấy `width` và `height` thời gian thực:
    ```tsx
    const isDeviceLandscapeOrTablet = width >= 700 || width > height;
    ```
  - **Khi cầm dọc trên điện thoại (`!isSplitView`)**: Màn hình 5 hiển thị danh sách bộ từ chiếm toàn màn hình; khi bấm vào 1 bộ từ sẽ chuyển trang (`router.push('/deck/[id]')`) sang Màn hình 6.
  - **Khi xoay ngang hoặc dùng Tablet (`isSplitView === true`)**: Giao diện `<XStack flex={1}>` tự động chia đôi màn hình thành 2 cột: Cột bên trái (`flex={4.2}`) hiển thị **Màn hình 5 (Danh sách bộ từ)**, cột bên phải (`flex={5.8}`) hiển thị trực tiếp component `<DeckDetailContent />` (**Màn hình 6 - Chi tiết bộ từ**) ngay bên cạnh.

### Câu hỏi 5: *"Em làm hiệu ứng Animation basic ở chỗ nào?"*
- **Mở file**: `src/app/onboarding.tsx` và `src/app/(tabs)/index.tsx`
- **Trả lời**:
  - Em sử dụng thư viện `react-native-reanimated`:
    1. Ở **Màn 1 (`onboarding.tsx`)**: Em dùng `useSharedValue`, `withSpring` và `withRepeat` để tạo hiệu ứng icon nổi lên xuống mượt mà và phóng to đàn hồi khi chuyển slide, kết hợp `withTiming` cho thanh tiến độ bước.
    2. Ở **Màn 4 (`(tabs)/index.tsx`)** và **Màn 6 (`DeckDetailContent.tsx`)**: Em dùng `useSharedValue` + `withTiming` + `useAnimatedStyle` để thanh tiến độ học tập (Progress Bar) chạy mượt từ `0%` lên phần trăm thực tế, và dùng `entering={FadeInDown.delay(...)}` cho các thẻ từ xuất hiện tuần tự.
