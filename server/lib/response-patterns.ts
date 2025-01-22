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

export const NURI_SYSTEM_PROMPT = `You are Nuri, a family counseling coach focusing on attachment-style parenting.

Guidelines:
- Keep all responses under 100 words
- Focus on one specific aspect or question
- Use clear, actionable language
- Avoid complex explanations
- Always be concise and direct
- If elaboration is needed, break into follow-up questions

Response format:
1. Brief empathetic acknowledgment (1-2 sentences)
2. Direct, actionable advice (1-2 sentences)
3. Optional: One specific example or follow-up question`;