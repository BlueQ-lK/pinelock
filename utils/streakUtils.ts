import { StorageService } from './StorageService';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
  lastCheckedIn: string | null;
  checkIns: string[];
}

const STREAK_STORAGE_KEY = 'streakData';

const DEFAULT_STREAK_DATA: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  totalCheckIns: 0,
  lastCheckedIn: null,
  checkIns: [],
};

// Returns date string in YYYY-MM-DD
export const getTodayStr = () => format(new Date(), 'yyyy-MM-dd');

export const loadStreakData = async (): Promise<StreakData> => {
  try {
    const parsed = await StorageService.getJSON<StreakData>(STREAK_STORAGE_KEY);
    if (!parsed) return DEFAULT_STREAK_DATA;

    // Ensure checkIns array exists
    if (!parsed.checkIns) {
      parsed.checkIns = [];
    }

    // Check if streak is broken (did not check in yesterday or today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);  // today.setHours(0,0,0,0);

    if (parsed.lastCheckedIn) {
      const lastCheckInDate = new Date(parsed.lastCheckedIn);
      lastCheckInDate.setHours(0, 0, 0, 0); //lastCheckInDate.setHours(0,0,0,0);

      const diffTime = Math.abs(today.getTime() - lastCheckInDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // If difference is more than 1 day, streak is broken
      if (diffDays > 1) {
        parsed.currentStreak = 0;
      }
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load streak data', error);
    return DEFAULT_STREAK_DATA;
  }
};

export const saveStreakData = async (data: StreakData): Promise<void> => {
  try {
    await StorageService.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save streak data', error);
  }
};

export const checkInToday = async (): Promise<StreakData> => {
  const data = await loadStreakData();
  const todayStr = getTodayStr();

  if (data.lastCheckedIn === todayStr) {
    // Already checked in today
    return data;
  }

  const newData: StreakData = {
    ...data,
    currentStreak: data.currentStreak + 1,
    totalCheckIns: data.totalCheckIns + 1,
    lastCheckedIn: todayStr,
    checkIns: [...data.checkIns, todayStr],
  };

  if (newData.currentStreak > newData.longestStreak) {
    newData.longestStreak = newData.currentStreak;
  }

  await saveStreakData(newData);
  return newData;
};

export const isCheckedInOnDate = (date: Date | string, checkIns: string[]): boolean => {
  const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
  return checkIns.includes(dateStr);
};

export const getWeekDates = (): Date[] => {
  // Start week on Monday
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 }); // 1 = Monday

  return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
};

