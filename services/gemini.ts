import { GoogleGenAI, Schema, Type } from "@google/genai";
import { LockedGoal, Milestone, ShinyObjectAnalysis, StrategyResponse, ChatMessage } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Default API key from environment
const DEFAULT_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

// Storage key for custom API key
const CUSTOM_API_KEY_STORAGE = 'customGeminiApiKey';

// Get the current API key (custom or default)
async function getApiKey(): Promise<string> {
  const customKey = await AsyncStorage.getItem(CUSTOM_API_KEY_STORAGE);
  return customKey || DEFAULT_API_KEY;
}

// Save custom API key
export async function saveCustomApiKey(key: string): Promise<void> {
  if (key.trim()) {
    await AsyncStorage.setItem(CUSTOM_API_KEY_STORAGE, key.trim());
  } else {
    await AsyncStorage.removeItem(CUSTOM_API_KEY_STORAGE);
  }
}

// Get custom API key
export async function getCustomApiKey(): Promise<string | null> {
  return AsyncStorage.getItem(CUSTOM_API_KEY_STORAGE);
}

// Check if custom key is set
export async function hasCustomApiKey(): Promise<boolean> {
  const key = await AsyncStorage.getItem(CUSTOM_API_KEY_STORAGE);
  return !!key;
}

// Test if an API key is valid
export async function testApiKey(key: string): Promise<{ valid: boolean; error?: string }> {
  if (!key.trim()) {
    return { valid: false, error: 'API key is empty' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Say "OK" in one word.',
    });
    return { valid: !!response.text };
  } catch (error: any) {
    const message = error?.message || 'Unknown error';
    if (message.includes('API_KEY_INVALID')) {
      return { valid: false, error: 'Invalid API key' };
    }
    if (message.includes('RATE_LIMIT') || message.includes('quota')) {
      return { valid: false, error: 'Rate limit exceeded' };
    }
    return { valid: false, error: message };
  }
}

// Core generation function with optional custom key
export async function generateWithGemini(prompt: string, customKey?: string): Promise<string> {
  const apiKey = customKey || await getApiKey();

  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || '';
  } catch (error: any) {
    const message = error?.message || '';
    if (message.includes('RATE_LIMIT') || message.includes('quota') || message.includes('429')) {
      throw new Error('RATE_LIMIT');
    }
    if (message.includes('API_KEY_INVALID') || message.includes('401')) {
      throw new Error('INVALID_KEY');
    }
    throw error;
  }
}

// Schemas for structured responses
const distractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isDistraction: { type: Type.BOOLEAN, description: "True if this idea deviates from the main goal" },
    score: { type: Type.INTEGER, description: "Distraction score 0-100 (100 is highly distracting)" },
    reasoning: { type: Type.STRING, description: "Explanation of why it fits or distracts" },
    advice: { type: Type.STRING, description: "Actionable advice: Ignore, delay, or integrate" },
  },
  required: ["isDistraction", "score", "reasoning", "advice"],
};

const strategySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    message: { type: Type.STRING, description: "The ruthless strategic advice or question." },
    options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: "Button text for the user" },
          value: { type: Type.STRING, description: "What to send back to chat if clicked" },
          action: { type: Type.STRING, enum: ['reply', 'lock_milestone'] }
        },
        required: ["label", "value", "action"]
      }
    },
    draftMilestone: {
      type: Type.OBJECT,
      description: "Only populate this when a specific milestone has been agreed upon.",
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        deadline: { type: Type.STRING, description: "ISO date string estimate or specific date" },
        impact: { type: Type.STRING, enum: ['HIGH', 'CRITICAL'] }
      }
    }
  },
  required: ["message"]
};


export const getDailyMotivation = async (goal: LockedGoal): Promise<string> => {
  const apiKey = await getApiKey();
  if (!apiKey) return "Stay hard. Stay focused.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Give me a very short, punchy, slightly intense motivational quote tailored to someone working on: "${goal.title}". Max 15 words. No cliches.`,
    });
    return response.text || "Keep pushing.";
  } catch (e) {
    return "Focus on the objective.";
  }
}
