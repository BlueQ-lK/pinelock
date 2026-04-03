import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '../../../contexts/ThemeContext';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext(Navigator);

export default function TabsLayout() {
    const { theme } = useTheme();

    return (
        <MaterialTopTabs
            id="milestone-generator-tabs"
            screenOptions={{
                tabBarLabelStyle: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
                tabBarStyle: { 
                    backgroundColor: theme.background, 
                    elevation: 0, 
                    shadowOpacity: 0, 
                    borderBottomWidth: 1, 
                    borderBottomColor: theme.border 
                },
                tabBarIndicatorStyle: { backgroundColor: theme.accent, height: 3 },
                tabBarActiveTintColor: theme.text,
                tabBarInactiveTintColor: theme.textSecondary,
            }}
        >
            <MaterialTopTabs.Screen name="index" options={{ title: 'STRATEGY AI' }} />
            <MaterialTopTabs.Screen name="manual" options={{ title: 'MANUAL' }} />
            <MaterialTopTabs.Screen name="staged" options={{ title: 'STAGED INTEL' }} />
        </MaterialTopTabs>
    );
}
