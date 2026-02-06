import AsyncStorage from '@react-native-async-storage/async-storage';
import { Milestone } from '../types';

export interface RecapStats {
    goalTitle: string;
    motivation: string;
    durationUnit: 'year' | 'months' | 'days';
    durationValue: number;
    startDate: string;
    endDate: string;
    daysElapsed: number;
    totalMilestones: number;
    completedMilestones: number;
    completionPercentage: number;
    milestones: Milestone[];
}

/**
 * Calculate the goal end date based on start date and duration
 */
export const getGoalEndDate = async (): Promise<Date | null> => {
    try {
        const startDateStr = await AsyncStorage.getItem('goalStartDate');
        const durationUnit = await AsyncStorage.getItem('durationUnit');
        const durationValueStr = await AsyncStorage.getItem('durationValue');

        if (!startDateStr || !durationUnit || !durationValueStr) return null;

        const startDate = new Date(startDateStr);
        const durationValue = parseInt(durationValueStr, 10);
        const endDate = new Date(startDate);

        if (durationUnit === 'year') {
            endDate.setFullYear(startDate.getFullYear() + durationValue);
        } else if (durationUnit === 'months') {
            endDate.setMonth(startDate.getMonth() + durationValue);
        } else if (durationUnit === 'days') {
            endDate.setDate(startDate.getDate() + durationValue);
        }

        // Set to end of day
        endDate.setHours(23, 59, 59, 999);

        return endDate;
    } catch (e) {
        console.error('Error calculating goal end date:', e);
        return null;
    }
};

/**
 * Check if the current date is past the goal end date
 */
export const isGoalEnded = async (): Promise<boolean> => {
    try {
        const endDate = await getGoalEndDate();
        if (!endDate) return false;

        const now = new Date();
        return now > endDate;
    } catch (e) {
        console.error('Error checking goal status:', e);
        return false;
    }
};

/**
 * Gather all statistics for the recap page
 */
export const getRecapStats = async (): Promise<RecapStats | null> => {
    try {
        const goalTitle = await AsyncStorage.getItem('mainGoal');
        const motivation = await AsyncStorage.getItem('motivation');
        const durationUnit = await AsyncStorage.getItem('durationUnit') as 'year' | 'months' | 'days';
        const durationValueStr = await AsyncStorage.getItem('durationValue');
        const startDateStr = await AsyncStorage.getItem('goalStartDate');
        const milestoneStackStr = await AsyncStorage.getItem('milestoneStack');

        if (!goalTitle || !startDateStr || !durationUnit || !durationValueStr) return null;

        const endDate = await getGoalEndDate();
        if (!endDate) return null;

        const milestones: Milestone[] = milestoneStackStr ? JSON.parse(milestoneStackStr) : [];
        const completedMilestones = milestones.filter(m => m.status === 'COMPLETED').length;

        const startDate = new Date(startDateStr);
        const now = new Date();

        // Calculate days elapsed (capped at duration total)
        const timeDiff = Math.min(now.getTime(), endDate.getTime()) - startDate.getTime();
        const daysElapsed = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));

        return {
            goalTitle,
            motivation: motivation || '',
            durationUnit,
            durationValue: parseInt(durationValueStr, 10),
            startDate: startDateStr,
            endDate: endDate.toISOString(),
            daysElapsed,
            totalMilestones: milestones.length,
            completedMilestones,
            completionPercentage: milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0,
            milestones
        };
    } catch (e) {
        console.error('Error getting recap stats:', e);
        return null;
    }
};

/**
 * Clear all goal-related data to start fresh
 */
export const resetGoalData = async (): Promise<void> => {
    try {
        const keysToRemove = [
            'mainGoal',
            'motivation',
            'durationUnit',
            'durationValue',
            'goalStartDate',
            'milestoneStack',
            'activeMilestone',
            'hasOnboarded',
            'warRoomMessages', // Assuming we might want to clear chat history too
            'shinyObjects'     // Assuming shiny objects are per-goal
        ];
        await AsyncStorage.multiRemove(keysToRemove);
    } catch (e) {
        console.error('Error resetting goal data:', e);
        throw e;
    }
};
