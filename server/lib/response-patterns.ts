
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
