/**
 * Parse a chat ID from the request parameters.
 * 
 * @param id String ID to parse
 * @returns Parsed number ID or null if invalid
 */
export function parseChatId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return isNaN(parsed) ? null : parsed;
}