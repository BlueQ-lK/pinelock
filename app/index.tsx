import { Redirect } from 'expo-router';
import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isGoalEnded } from '../utils/goalStatus';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [shouldRecap, setShouldRecap] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const onboarded = await AsyncStorage.getItem('hasOnboarded');
      if (onboarded !== null) {
        // If onboarded, check if goal has ended
        const goalEnded = await isGoalEnded();
        if (goalEnded) {
          setShouldRecap(true);
        }
        setHasOnboarded(true);
      }
    } catch (e) {
      console.error('Error checking status:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  if (!hasOnboarded) {
    return <Redirect href="/(onboarding)" />;
  }

  if (shouldRecap) {
    return <Redirect href="/recap" />;
  }

  return <Redirect href="/(tabs)" />;
}
