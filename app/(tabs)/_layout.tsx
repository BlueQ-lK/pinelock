import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export default function TabLayout() {
  const { theme } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: theme.accent, // Default Swiss Red
        tabBarInactiveTintColor: '#D1D5DB', // Gray-300
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center gap-1">
              <Ionicons name={focused ? "grid" : "grid-outline"} size={24} color={color} />
              {focused && <View className="w-1 h-1 rounded-full" style={{ backgroundColor: theme.accent }} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="streak"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center gap-1">
              <Ionicons name={focused ? "flame" : "flame-outline"} size={24} color={color} />
              {focused && <View className="w-1 h-1 rounded-full" style={{ backgroundColor: theme.accent }} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="distractions"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center gap-1">
              <Ionicons name={focused ? "time" : "time-outline"} size={26} color={color} />
              {focused && <View className="w-1 h-1 rounded-full" style={{ backgroundColor: theme.accent }} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center gap-1">
              <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
              {focused && <View className="w-1 h-1 rounded-full" style={{ backgroundColor: theme.accent }} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
