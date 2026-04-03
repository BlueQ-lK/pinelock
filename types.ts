export interface LockedGoal {
  title: string;
  motivation: string;
  durationUnit?: 'year' | 'months' | 'days';
  durationValue?: number;
  startDate?: string;
}

export type MilestoneStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED';

export interface Todo {
  id: string;
  task: string;
  completed: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  deadline: string;
  impact: 'HIGH' | 'CRITICAL';
  status: MilestoneStatus;
  daysLeft?: number;
  todos?: Todo[];
  order: number;
  isArchived?: boolean;
}
