// Layout для табов

import { Tabs } from 'expo-router';
import { WalkingBagIcon } from '../../components/WalkingBagIcon';
import React from 'react';

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
          title: 'Кабинет',
          tabBarIcon: ({ color, size }) => (
            <WalkingBagIcon size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}