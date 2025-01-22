export const RESPONSE_PATTERNS = {
  DIRECT: 'DIRECT',
  REFLECTIVE: 'REFLECTIVE',
  STORY_BASED: 'STORY_BASED',
  COLLABORATIVE: 'COLLABORATIVE'
} as const;

export const RESPONSE_STRUCTURES = {
  VALIDATE_FIRST: 'VALIDATE_FIRST',
  PRACTICAL_FIRST: 'PRACTICAL_FIRST',
  SCENARIO_BASED: 'SCENARIO_BASED',
  STEP_BY_STEP: 'STEP_BY_STEP'
} as const;

// Pattern-specific prompt additions
export const PATTERN_PROMPTS = {
  [RESPONSE_PATTERNS.DIRECT]: 'Be clear and straightforward in your response.',
  [RESPONSE_PATTERNS.REFLECTIVE]: 'Mirror the parent\'s emotions and concerns before offering guidance.',
  [RESPONSE_PATTERNS.STORY_BASED]: 'Share a relevant example or story to illustrate your point.',
  [RESPONSE_PATTERNS.COLLABORATIVE]: 'Engage the parent in finding solutions together.'
} as const;

export const STRUCTURE_PROMPTS = {
  [RESPONSE_STRUCTURES.VALIDATE_FIRST]: 'First validate feelings, then provide advice.',
  [RESPONSE_STRUCTURES.PRACTICAL_FIRST]: 'Start with practical steps, then explain the reasoning.',
  [RESPONSE_STRUCTURES.SCENARIO_BASED]: 'Present different scenarios and their potential outcomes.',
  [RESPONSE_STRUCTURES.STEP_BY_STEP]: 'Break down advice into clear, sequential steps.'
} as const;
