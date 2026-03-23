import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { Milestone } from '../types';
import { loadStreakData, StreakData } from '../utils/streakUtils';

export interface AppData {
    goal: string;
    motivation: string;
    milestoneStack: Milestone[];
    activeMilestone?: Milestone;
    streakData: StreakData | null;
    focusSessionCount: number;
    isFocusActive: boolean;
}

export function useAppData() {
    const [data, setData] = useState<AppData>({
        goal: 'Loading...',
        motivation: '',
        milestoneStack: [],
        activeMilestone: undefined,
        streakData: null,
        focusSessionCount: 0,
        isFocusActive: false,
    });
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            // Parallel load to eliminate waterfalls
            const [
                goalStr, motivationStr, stackStr, activeStr,
                focusStart, focusHistoryStr, streak
            ] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.MAIN_GOAL),
                AsyncStorage.getItem(STORAGE_KEYS.MOTIVATION),
                AsyncStorage.getItem(STORAGE_KEYS.MILESTONE_STACK),
                AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_MILESTONE),
                AsyncStorage.getItem(STORAGE_KEYS.FOCUS_START_TIME),
                AsyncStorage.getItem(STORAGE_KEYS.FOCUS_SESSION_HISTORY),
                loadStreakData()
            ]);

            const calculateDaysLeft = (milestone: Milestone): Milestone => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const deadline = new Date(milestone.deadline);
                deadline.setHours(0, 0, 0, 0);
                const diffTime = deadline.getTime() - today.getTime();
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return { ...milestone, daysLeft: Math.max(0, daysLeft) };
            };

            let parsedStack: Milestone[] = [];
            if (stackStr) {
                const stack: Milestone[] = JSON.parse(stackStr);
                parsedStack = stack.filter(m => !m.isArchived).map(calculateDaysLeft);
            }

            let parsedActive: Milestone | undefined;
            if (activeStr) {
                const active = JSON.parse(activeStr);
                if (!active.isArchived) parsedActive = calculateDaysLeft(active);
            }

            let sessionCount = 0;
            if (focusHistoryStr) {
                const focusHistory = JSON.parse(focusHistoryStr);
                sessionCount = focusHistory.length;
            }

            setData({
                goal: goalStr || 'Loading...',
                motivation: motivationStr || '',
                milestoneStack: parsedStack,
                activeMilestone: parsedActive,
                streakData: streak,
                focusSessionCount: sessionCount,
                isFocusActive: !!focusStart,
            });
        } catch (e) {
            console.error('Failed to load app data', e);
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, []);

    return { data, isLoading, loadData };
}
