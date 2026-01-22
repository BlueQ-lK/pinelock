import { View, Text, Dimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { differenceInDays, endOfYear, startOfYear, addYears, addMonths, addDays, parseISO } from 'date-fns';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function YearProgressWidget() {
  const [progressData, setProgressData] = useState<{
    totalDays: number;
    daysPassed: number;
    daysLeft: number;
    year: number;
  } | null>(null);

  const loadProgress = async () => {
    const savedStart = await AsyncStorage.getItem('goalStartDate');
    const unit = await AsyncStorage.getItem('durationUnit');
    const valueStr = await AsyncStorage.getItem('durationValue');
    const value = parseInt(valueStr || '1', 10);

    const now = new Date();
    let start: Date;
    let end: Date;

    if (savedStart && unit && valueStr) {
      start = parseISO(savedStart);
      start.setHours(0, 0, 0, 0);

      if (unit === 'year') {
        end = addYears(start, value);
      } else if (unit === 'months') {
        end = addMonths(start, value);
      } else {
        end = addDays(start, value);
      }
      end.setHours(23, 59, 59, 999);
    } else {
      start = startOfYear(now);
      end = endOfYear(now);
    }

    const totalDays = differenceInDays(end, start) + 1;
    const daysPassed = Math.max(0, differenceInDays(now, start));
    const daysLeft = Math.max(0, differenceInDays(end, now));

    setProgressData({
      totalDays,
      daysPassed,
      daysLeft,
      year: start.getFullYear()
    });
  };

  useEffect(() => {
    loadProgress();
  }, []);

  if (!progressData) return null;

  const dots = Array.from({ length: progressData.totalDays }, (_, i) => i);

  return (
    <Animated.View
      entering={FadeIn.delay(300)}
      className="bg-gray-50 rounded-[32px] p-8 w-full aspect-[4/3] justify-between border border-gray-100"
    >
      <View className="flex-row flex-wrap gap-[6px] justify-center content-start">
        {dots.map((day) => (
          <View
            key={day}
            className={`w-[6px] h-[6px] rounded-full ${day < progressData.daysPassed ? 'bg-black opacity-20' : 'bg-gray-200'
              }`}
          />
        ))}
      </View>

      <View className="flex-row justify-between items-end mt-4">
        <Text className="text-gray-400 font-bold text-xs tracking-widest uppercase">
          {progressData.totalDays > 366 ? "GOAL PROGRESS" : `${progressData.year} PROGRESS`}
        </Text>
        <Text className="text-swiss-red font-black text-xl tracking-tighter">
          {progressData.daysLeft} DAYS LEFT
        </Text>
      </View>
    </Animated.View>
  );
}