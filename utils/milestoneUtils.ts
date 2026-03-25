import { Milestone } from '../types';

/**
 * Calculates the number of days left until a milestone's deadline.
 * Mutates and returns the milestone object with the updated `daysLeft` property.
 */
export const calculateDaysLeft = (milestone: Milestone): Milestone => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (!milestone.deadline) {
    return { ...milestone, daysLeft: 0 };
  }

  const deadline = new Date(milestone.deadline);
  deadline.setHours(0, 0, 0, 0);
  
  const diffTime = deadline.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return { ...milestone, daysLeft: Math.max(0, daysLeft) };
};
