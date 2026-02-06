import { useAI } from '../contexts/AIContext';
import { LockedGoal, ChatMessage, StrategyResponse, ShinyObjectAnalysis, Milestone, AlignmentValidation } from '../types';

export function useOnDeviceAI() {
  const { generate, isReady, modelStatus, initialize, aiProvider } = useAI();

  // Helper to safely parse AI JSON response
  const parseAIResponse = (response: string) => {
    try {
      // 1. Try generic cleanup first
      const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch (e) {
      // 2. If valid JSON fails, try to find the {...} or [...] block
      const jsonMatch = response.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          throw new Error("Regex extracted invalid JSON: " + jsonMatch[0]);
        }
      }
      throw e; // Rethrow original if regex fails
    }
  };

  // Helper to call AI with retry logic (exponential backoff)
  const callAIWithRetry = async (prompt: string, maxRetries = 3): Promise<string> => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await generate(prompt);
      } catch (e: any) {
        lastError = e;
        const isOverloaded = e?.message?.includes('overloaded') || e?.status === 'UNAVAILABLE' || (typeof e?.message === 'string' && e.message.includes('503'));

        if (isOverloaded && i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          console.log(`AI Overloaded. Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw e;
      }
    }
    throw lastError;
  };

  const generateManualMilestone = async (goal: LockedGoal, userPrompt: string, goalDeadline: Date): Promise<Milestone[]> => {
    if (!isReady) await initialize();

    const prompt = `Create a detailed plan from this user request.
    Goal: "${goal.title}"
    Request: "${userPrompt}"
    Max Deadline: ${goalDeadline.toISOString().split('T')[0]}
    
    CRITICAL INSTRUCTION:
    - If the user asks for multiple milestones, generate ALL of them in the array.
    - If the user asks for just one, return an array with one item.
    - STRICTLY RESPECT the "Max Deadline". Any date after ${goalDeadline.toISOString().split('T')[0]} is FORBIDDEN.
    
    Respond in strict JSON format (Array of objects):
    [
      {
        "title": "Title",
        "description": "Description",
        "deadline": "YYYY-MM-DD",
        "tasks": ["Task 1", "Task 2", "Task 3"]
      }
    ]`;

    try {
      const response = await callAIWithRetry(prompt);
      const raw = parseAIResponse(response);
      const results = Array.isArray(raw) ? raw : [raw];

      return results.map((m: any, i: number) => ({
        id: `manual-${Date.now()}-${i}`,
        title: m.title,
        description: m.description,
        deadline: m.deadline,
        impact: 'HIGH',
        status: 'PENDING',
        order: 999 + i,
        todos: (m.tasks || []).map((t: string, ti: number) => ({
          id: `todo-${Date.now()}-${i}-${ti}`,
          task: t,
          completed: false
        }))
      }));
    } catch (e: any) {
      console.error("Manual Gen Error:", e);
      // Re-throw if it's an overload error so the UI can handle it specifically,
      // otherwise return empty array as before
      if (e?.message?.includes('overloaded') || e?.status === 'UNAVAILABLE' || (typeof e?.message === 'string' && e.message.includes('503'))) {
        throw e;
      }
      return [];
    }
  };


  return {
    generateManualMilestone,
    isReady,
    modelStatus,
    aiProvider
  };
}
