import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ArrivalTabIcon } from '@/components/ArrivalTabIcon';
import '../global.css';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#54CCFF',
        tabBarInactiveTintColor: '#8E96A3',
      }}
    >
      <Tabs.Screen
        name="seller"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Мои товары',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="arrival"
        options={{
          title: 'Приемка',
          tabBarIcon: ({ color, size }) => <ArrivalTabIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Продажи',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
