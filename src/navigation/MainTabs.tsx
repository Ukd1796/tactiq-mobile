import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, BookMarked, TrendingUp, Zap } from 'lucide-react-native';
import { colors } from '../lib/theme';

import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { PaperTradeScreen } from '../screens/paper/PaperTradeScreen';
import { LiveTradingScreen } from '../screens/live/LiveTradingScreen';
import { StrategiesNavigator } from './StrategiesStack';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter_500Medium' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ color }) => <LayoutDashboard size={20} color={color} /> }}
      />
      <Tab.Screen
        name="Strategies"
        component={StrategiesNavigator}
        options={{ tabBarIcon: ({ color }) => <BookMarked size={20} color={color} />, tabBarLabel: 'Strategies' }}
      />
      <Tab.Screen
        name="PaperTrade"
        component={PaperTradeScreen}
        options={{ tabBarIcon: ({ color }) => <TrendingUp size={20} color={color} />, tabBarLabel: 'Paper Trade' }}
      />
      <Tab.Screen
        name="Live"
        component={LiveTradingScreen}
        options={{ tabBarIcon: ({ color }) => <Zap size={20} color={color} /> }}
      />
    </Tab.Navigator>
  );
}
