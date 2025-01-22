export const RESPONSE_PATTERNS = {
  DIRECT: 'direct',
  REFLECTIVE: 'reflective', 
  STORY_BASED: 'story',
  COLLABORATIVE: 'collaborative'
} as const;

export const RESPONSE_STRUCTURES = {
  VALIDATE_FIRST: 'validate_then_advise',
  PRACTICAL_FIRST: 'practical_then_explain',
  SCENARIO_BASED: 'what_if_scenarios',
  STEP_BY_STEP: 'step_by_step'
} as const;

export const getRandomPattern = () => {
  const patterns = Object.values(RESPONSE_PATTERNS);
  return patterns[Math.floor(Math.random() * patterns.length)];
};

export const getRandomStructure = () => {
  const structures = Object.values(RESPONSE_STRUCTURES);
  return structures[Math.floor(Math.random() * structures.length)];
};

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