import { View, TouchableOpacity, StatusBar } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { TimeLeftStep } from '../../components/onboarding/TimeLeftStep';
import { GoalInputStep, DurationUnit } from '../../components/onboarding/GoalInputStep';
import { MotivationStep } from '../../components/onboarding/MotivationStep';
import { ContractStep } from '../../components/onboarding/ContractStep';

export default function OnboardingScreen() {
  const { theme, themeName } = useTheme();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<{
    goal: string;
    motivation: string;
    durationUnit: DurationUnit;
    durationValue: number;
  }>({
    goal: '',
    motivation: '',
    durationUnit: 'year',
    durationValue: 1,
  });
  const router = useRouter();

  const handleNext = (newData?: Partial<typeof data>) => {
    if (newData) {
      setData(prev => ({ ...prev, ...newData }));
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(prev => prev - 1);
    }
  };

  const handleEdit = (stepIndex: number) => {
    setStep(stepIndex);
  };

  const handleLockIn = async () => {
    try {
      await AsyncStorage.setItem('mainGoal', data.goal);
      await AsyncStorage.setItem('durationUnit', data.durationUnit);
      await AsyncStorage.setItem('durationValue', data.durationValue.toString());
      await AsyncStorage.setItem('motivation', data.motivation);
      await AsyncStorage.setItem('goalStartDate', new Date().toISOString());
      await AsyncStorage.setItem('hasOnboarded', 'true');

      // Small delay to let the animation finish
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);
    } catch (e) {
      console.error('Failed to save onboarding data', e);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar barStyle={themeName === 'dark' || themeName === 'catppuccin' ? 'light-content' : 'dark-content'} />
      {/* Navigation Header */}
      <View className="flex-row justify-between items-center px-6 py-2 z-10" style={{ backgroundColor: theme.background }}>
        <TouchableOpacity
          onPress={handleBack}
          disabled={step === 0}
          className={`p-2 -ml-2 rounded-full ${step === 0 ? 'opacity-0' : 'opacity-100'}`}
          style={{ backgroundColor: step === 0 ? 'transparent' : theme.surfaceAlt }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View className="flex-row gap-1.5 items-center">
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              className={`h-1.5 rounded-full`}
              style={{
                width: i === step ? 32 : i < step ? 16 : 8,
                backgroundColor: i === step ? theme.accent : i < step ? theme.text : theme.border
              }}
            />
          ))}
        </View>
      </View>

      <View className="flex-1">
        {step === 0 && <TimeLeftStep onNext={() => handleNext()} />}
        {step === 1 && (
          <GoalInputStep
            onNext={(goal, durationUnit, durationValue) => handleNext({ goal, durationUnit, durationValue })}
            initialValue={data.goal}
            initialDurationUnit={data.durationUnit}
            initialDurationValue={data.durationValue}
          />
        )}
        {step === 2 && <MotivationStep onNext={(motivation) => handleNext({ motivation })} initialValue={data.motivation} />}
        {step === 3 && (
          <ContractStep
            goal={data.goal}
            motivation={data.motivation}
            durationUnit={data.durationUnit}
            durationValue={data.durationValue}
            onLockIn={handleLockIn}
            onEditGoal={() => handleEdit(1)}
            onEditMotivation={() => handleEdit(2)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
