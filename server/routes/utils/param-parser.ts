/**
 * Parse a chat ID from the request parameters.
 * 
 * @param id String ID to parse
 * @returns Parsed number ID or null if invalid
 */
export function parseChatId(id: string): number | null {
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId) || parsedId <= 0) {
    return null;
  }
  return parsedId;
}

/**
 * Parse a memory ID from the request parameters.
 * 
 * @param id String ID to parse
 * @returns Parsed number ID or null if invalid
 */
export function parseMemoryId(id: string): number | null {
  return parseChatId(id); // Uses the same validation logic
}

/**
 * Parse a suggestion ID from the request parameters.
 * 
 * @param id String ID to parse
 * @returns Parsed number ID or null if invalid
 */
export function parseSuggestionId(id: string): number | null {
  return parseChatId(id); // Uses the same validation logic
}

/**
 * Parse a village member ID from the request parameters.
 * 
 * @param id String ID to parse
 * @returns Parsed number ID or null if invalid
 */
export function parseVillageMemberId(id: string): number | null {
  return parseChatId(id); // Uses the same validation logic
}