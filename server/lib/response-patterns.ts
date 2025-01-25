import { z } from "zod";

export const RESPONSE_PATTERNS = {
  DIRECT: 'direct',
  REFLECTIVE: 'reflective', 
  STORY_BASED: 'story',
  COLLABORATIVE: 'collaborative',
  EXPLORATORY: 'exploratory',
  GOAL_ORIENTED: 'goal_oriented',
  ANALYTICAL: 'analytical'
} as const;

export const RESPONSE_STRUCTURES = {
  VALIDATE_FIRST: 'validate_then_advise',
  PRACTICAL_FIRST: 'practical_then_explain',
  SCENARIO_BASED: 'what_if_scenarios',
  STEP_BY_STEP: 'step_by_step',
  COMPARE_CONTRAST: 'compare_and_contrast',
  CHALLENGE_BASED: 'challenge_based',
  DISCOVERY_LED: 'discovery_led'
} as const;

export type ResponsePattern = keyof typeof RESPONSE_PATTERNS;
export type ResponseStructure = keyof typeof RESPONSE_STRUCTURES;

// Map onboarding preferences to response patterns with weights
export const ONBOARDING_TO_PATTERN_MAP: Record<string, Array<[ResponsePattern, number]>> = {
  'direct': [
    ['DIRECT', 0.6],
    ['GOAL_ORIENTED', 0.3],
    ['ANALYTICAL', 0.1]
  ],
  'detailed': [
    ['STORY_BASED', 0.4],
    ['ANALYTICAL', 0.3],
    ['EXPLORATORY', 0.3]
  ],
  'collaborative': [
    ['COLLABORATIVE', 0.5],
    ['EXPLORATORY', 0.3],
    ['REFLECTIVE', 0.2]
  ],
  'supportive': [
    ['REFLECTIVE', 0.4],
    ['STORY_BASED', 0.3],
    ['COLLABORATIVE', 0.3]
  ],
} as const;

// Pattern-specific prompt additions with multiple variations
export const PATTERN_PROMPTS: Record<ResponsePattern, string[]> = {
  DIRECT: [
    'Be clear and straightforward in your response.',
    'Provide direct, actionable guidance.',
    'Focus on immediate, practical solutions.'
  ],
  REFLECTIVE: [
    'Mirror the parent\'s emotions and concerns before offering guidance.',
    'Acknowledge feelings first, then explore solutions together.',
    'Create space for self-reflection while providing support.'
  ],
  STORY_BASED: [
    'Share a relevant example or story to illustrate your point.',
    'Use real-world scenarios to explain concepts.',
    'Connect advice to practical experiences.'
  ],
  COLLABORATIVE: [
    'Engage the parent in finding solutions together.',
    'Create a partnership approach to problem-solving.',
    'Encourage active participation in the solution.'
  ],
  EXPLORATORY: [
    'Guide through questions and discovery.',
    'Help explore different perspectives and possibilities.',
    'Encourage thinking about alternative approaches.'
  ],
  GOAL_ORIENTED: [
    'Focus on achieving specific parenting objectives.',
    'Break down goals into manageable steps.',
    'Align advice with long-term parenting aims.'
  ],
  ANALYTICAL: [
    'Examine situations from multiple angles.',
    'Consider cause and effect relationships.',
    'Analyze patterns and underlying factors.'
  ]
};

export const STRUCTURE_PROMPTS: Record<ResponseStructure, string[]> = {
  VALIDATE_FIRST: [
    'First validate feelings, then provide advice.',
    'Acknowledge challenges before offering solutions.',
    'Show understanding before suggesting changes.'
  ],
  PRACTICAL_FIRST: [
    'Start with practical steps, then explain the reasoning.',
    'Lead with actionable advice, follow with context.',
    'Begin with solutions, then provide supporting details.'
  ],
  SCENARIO_BASED: [
    'Present different scenarios and their potential outcomes.',
    'Explore various situations and responses.',
    'Use if-then scenarios to illustrate points.'
  ],
  STEP_BY_STEP: [
    'Break down advice into clear, sequential steps.',
    'Provide organized, progressive guidance.',
    'Create a structured approach to implementation.'
  ],
  COMPARE_CONTRAST: [
    'Compare different approaches and their outcomes.',
    'Contrast various parenting strategies.',
    'Evaluate pros and cons of different methods.'
  ],
  CHALLENGE_BASED: [
    'Present challenges to encourage growth.',
    'Use problem-solving scenarios.',
    'Create learning opportunities through challenges.'
  ],
  DISCOVERY_LED: [
    'Guide through self-discovery questions.',
    'Help uncover personal parenting insights.',
    'Support exploration of parenting style.'
  ]
};

export const getWeightedPattern = (preferences: Array<[ResponsePattern, number]>): ResponsePattern => {
  const total = preferences.reduce((sum, [, weight]) => sum + weight, 0);
  let random = Math.random() * total;

  for (const [pattern, weight] of preferences) {
    random -= weight;
    if (random <= 0) {
      return pattern;
    }
  }

  return preferences[0][0];
};

export const getRandomPrompt = (prompts: string[]): string => {
  return prompts[Math.floor(Math.random() * prompts.length)];
};

export const getPatternForUser = (communicationPreference: string): ResponsePattern => {
  const preferences = ONBOARDING_TO_PATTERN_MAP[communicationPreference as keyof typeof ONBOARDING_TO_PATTERN_MAP] 
    || ONBOARDING_TO_PATTERN_MAP['supportive'];
  return getWeightedPattern(preferences);
};

export const getStructureForUser = (communicationPreference: string): ResponseStructure => {
  // Add some randomization to structure selection
  const structures = Object.keys(RESPONSE_STRUCTURES) as ResponseStructure[];
  return structures[Math.floor(Math.random() * structures.length)];
};

export const getPatternPrompt = (pattern: ResponsePattern): string => {
  return getRandomPrompt(PATTERN_PROMPTS[pattern]);
};

export const getStructurePrompt = (structure: ResponseStructure): string => {
  return getRandomPrompt(STRUCTURE_PROMPTS[structure]);
};