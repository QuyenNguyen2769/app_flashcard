# Project context

React Native app (Expo, TypeScript) for vocabulary flashcard learning.
Stack: Expo, Tamagui (UI), TanStack Query + Axios (data), React Native Reanimated + Gesture Handler (animation), expo-router or React Navigation (follow whatever the project already uses).
Backend: MockAPI.io with resources: users, decks, cards, progress.

# Data models

User { id, email, name, password }
Deck { id, userId, name, description, topic, createdAt }
Card { id, deckId, word, meaning, phonetic, example, level (0-5), nextReview (ISO date), favorite (boolean) }
Progress { id, userId, date (YYYY-MM-DD), cardsStudied, correct, wrong }

# Conventions

- All UI text in Vietnamese. Code, variable names and comments in English.
- Use Tamagui components for all UI; no inline hardcoded colors, use theme tokens.
- All API calls go through src/api/\* using one shared Axios instance. Never call axios inside components.
- Use TanStack Query hooks (useQuery/useMutation) in src/hooks/\*, invalidate queries after mutations.
- Every screen must handle loading, error and empty states.
- Every screen must be responsive: use useWindowDimensions; in landscape or width >= 768 use a two-column layout.
- Add short comments on non-obvious logic (the student must be able to explain the code).
- Do not add new libraries without telling me first.
