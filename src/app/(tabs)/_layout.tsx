import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { BRAND_COLORS, useAuth } from '@/context/AuthContext';

export default function TabsLayout() {
  const { themeMode } = useAuth();
  const isDark = themeMode === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Khi chế độ Tối: Tab đang chọn màu Vàng Hoàng Kim (#FEC341) trên nền Xanh Đen (#0F1629)
        // Khi chế độ Sáng: Tab đang chọn màu Đỏ Đô (#9B0000) trên nền Trắng (#FFFFFF)
        tabBarActiveTintColor: isDark ? BRAND_COLORS.gold : BRAND_COLORS.crimson,
        tabBarInactiveTintColor: isDark ? '#94A3B8' : '#64748B',
        tabBarStyle: {
          backgroundColor: isDark ? BRAND_COLORS.navy : BRAND_COLORS.white,
          borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home"
              size={size}
              color={typeof color === 'string' ? color : '#64748B'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="decks"
        options={{
          title: 'Bộ từ vựng',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="albums"
              size={size}
              color={typeof color === 'string' ? color : '#64748B'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-create"
        options={{
          title: 'AI Tạo thẻ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="sparkles"
              size={size}
              color={typeof color === 'string' ? color : '#64748B'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Thống kê',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="stats-chart"
              size={size}
              color={typeof color === 'string' ? color : '#64748B'}
            />
          ),
        }}
      />
    </Tabs>
  );
}
