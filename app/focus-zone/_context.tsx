import React, { createContext, useContext, useState, useEffect } from 'react';
// Context for Focus Zone
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Milestone, LockedGoal } from '../../types';
import { StorageService } from '../../utils/StorageService';

interface WarRoomContextType {
  draftStack: Milestone[];
  setDraftStack: React.Dispatch<React.SetStateAction<Milestone[]>>;
  goal: LockedGoal | null;
  deployedStack: Milestone[];
  deployStack: () => Promise<void>;
  draftOptions: Milestone[];
  setDraftOptions: React.Dispatch<React.SetStateAction<Milestone[]>>;
}

const WarRoomContext = createContext<WarRoomContextType | undefined>(undefined);

export function WarRoomProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [draftStack, setDraftStack] = useState<Milestone[]>([]);
  const [goal, setGoal] = useState<LockedGoal | null>(null);
  const [deployedStack, setDeployedStack] = useState<Milestone[]>([]);
  const [draftOptions, setDraftOptions] = useState<Milestone[]>([]);

  useEffect(() => {
    initializeRoom();
  }, []);

  const initializeRoom = async () => {
    const title = await AsyncStorage.getItem('mainGoal');
    const motivation = await AsyncStorage.getItem('motivation');
    const unit = await AsyncStorage.getItem('durationUnit');
    const value = await AsyncStorage.getItem('durationValue');
    const startDate = await AsyncStorage.getItem('goalStartDate');
    const stackStr = await AsyncStorage.getItem('milestoneStack');

    let currentGoal: LockedGoal | null = null;
    if (title) {
      currentGoal = {
        title,
        motivation: motivation || '',
        durationUnit: unit as any,
        durationValue: value ? parseInt(value) : undefined,
        startDate: startDate || undefined
      };
      setGoal(currentGoal);
    }

    if (stackStr) {
      setDeployedStack(JSON.parse(stackStr));
    }
  };

  const deployStack = async () => {
    if (draftStack.length === 0) return;

    const existing = await StorageService.getJSON<Milestone[]>('milestoneStack') || [];

    const startOrder = existing.length > 0 ? Math.max(...existing.map(m => m.order)) + 1 : 1;
    const newMilestones = draftStack.map((m, i) => ({ ...m, order: startOrder + i }));

    const combined = [...existing, ...newMilestones];

    const active = await StorageService.getJSON<Milestone>('activeMilestone');
    let finalStack = combined;

    const updates: [string, string][] = [];

    if (!active && newMilestones.length > 0) {
      const first = newMilestones[0];
      first.status = 'ACTIVE';
      updates.push(['activeMilestone', JSON.stringify(first)]);
      finalStack = combined.map(m => m.id === first.id ? { ...m, status: 'ACTIVE' } : m);
    } else if (active) {
      const activeObj = active;
      const inStack = finalStack.find(m => m.id === activeObj.id);
      if (inStack) {
        finalStack = finalStack.map(m => m.id === activeObj.id ? { ...m, status: 'ACTIVE' } : m);
      }
    }

    updates.push(['milestoneStack', JSON.stringify(finalStack)]);
    await StorageService.multiSet(updates);

    setDeployedStack(finalStack);
    setDraftStack([]);
    router.replace('/(tabs)');
  };

  return (
    <WarRoomContext.Provider value={{ draftStack, setDraftStack, goal, deployedStack, deployStack, draftOptions, setDraftOptions }}>
      {children}
    </WarRoomContext.Provider>
  );
}

export function useWarRoom() {
  const context = useContext(WarRoomContext);
  if (!context) {
    throw new Error('useWarRoom must be used within a WarRoomProvider');
  }
  return context;
}

// Add dummy default export to fix Expo Router missing default export warning
export default function FocusZoneContextDummy() {
  return null;
}
