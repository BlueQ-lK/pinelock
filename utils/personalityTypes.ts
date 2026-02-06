import { RecapStats } from './goalStatus';

export type PersonalityType =
    | "THE_UNSTOPPABLE_FORCE"
    | "THE_STRATEGIC_PLANNER"
    | "THE_AMBITIOUS_VISIONARY"
    | "THE_PERSISTENT_FIGHTER"
    | "THE_LEARNING_EXPLORER"
    | "THE_BOLD_STARTER";

export interface PersonalityConfig {
    name: string;
    emoji: string;
    description: string;
    gradient: readonly [string, string, ...string[]];
}

export const PERSONALITY_CONFIGS: Record<PersonalityType, PersonalityConfig> = {
    THE_UNSTOPPABLE_FORCE: {
        name: "The Unstoppable Force",
        emoji: "🚀",
        description: "You crushed your goals with relentless determination. Nothing stands in your way.",
        gradient: ['#8B5CF6', '#EC4899'], // Purple to Pink
    },
    THE_STRATEGIC_PLANNER: {
        name: "The Strategic Planner",
        emoji: "🎯",
        description: "Methodical and precise. You conquered your objectives with calculated excellence.",
        gradient: ['#3B82F6', '#06B6D4'], // Blue to Cyan
    },
    THE_AMBITIOUS_VISIONARY: {
        name: "The Ambitious Visionary",
        emoji: "✨",
        description: "Big dreams, bold moves. You aimed high and made serious progress.",
        gradient: ['#F97316', '#FDE047'], // Orange to Yellow
    },
    THE_PERSISTENT_FIGHTER: {
        name: "The Persistent Fighter",
        emoji: "💪",
        description: "You didn't give up. Through challenges, you kept pushing forward.",
        gradient: ['#EF4444', '#F97316'], // Red to Orange
    },
    THE_LEARNING_EXPLORER: {
        name: "The Learning Explorer",
        emoji: "🧭",
        description: "Every step was a lesson. You embraced the journey and grew stronger.",
        gradient: ['#10B981', '#14B8A6'], // Green to Teal
    },
    THE_BOLD_STARTER: {
        name: "The Bold Starter",
        emoji: "🌟",
        description: "You took the first step. That courage is the foundation of greatness.",
        gradient: ['#A855F7', '#EC4899'], // Violet to Pink
    },
};

export function calculatePersonality(stats: RecapStats): PersonalityType {
    const completionRate = stats.completionPercentage;
    const milestoneRate = stats.totalMilestones > 0
        ? (stats.completedMilestones / stats.totalMilestones) * 100
        : 0;

    // The Unstoppable Force: 90%+ completion, 90%+ milestones
    if (completionRate >= 90 && milestoneRate >= 90) {
        return "THE_UNSTOPPABLE_FORCE";
    }

    // The Strategic Planner: 80%+ completion, 70%+ milestones
    if (completionRate >= 80 && milestoneRate >= 70) {
        return "THE_STRATEGIC_PLANNER";
    }

    // The Ambitious Visionary: 60%+ completion, 10+ total milestones (set big goals)
    if (completionRate >= 60 && stats.totalMilestones >= 10) {
        return "THE_AMBITIOUS_VISIONARY";
    }

    // The Persistent Fighter: 40-60% completion, but kept at it
    if (completionRate >= 40 && completionRate < 60) {
        return "THE_PERSISTENT_FIGHTER";
    }

    // The Learning Explorer: Below 40% but completed at least one milestone
    if (completionRate < 40 && stats.completedMilestones > 0) {
        return "THE_LEARNING_EXPLORER";
    }

    // The Bold Starter: Default - started the journey
    return "THE_BOLD_STARTER";
}
