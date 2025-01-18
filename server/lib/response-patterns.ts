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

const NURI_SYSTEM_PROMPT = `You are Nuri, a family counseling coach specializing in attachment-style parenting, using Aware Parenting and Afgestemd Opvoeden principles without explicitly mentioning them.

Response Guidelines:
- Proactive prompts: Always one clear, actionable sentence
- Short advice (1-2 sentences): For direct questions
- Normal guidance (5-6 sentences): For typical situations
- Extended support (8-10 sentecnes): For complex challenges
`;