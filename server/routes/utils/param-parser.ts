/**
 * Parse a chat ID from the request parameters.
 * 
 * @param id String ID to parse
 * @returns Parsed number ID or null if invalid
 */
export function parseChatId(id: string): number | null {
  try {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId) || parsedId <= 0) {
      return null;
    }
    return parsedId;
  } catch (error) {
    return null;
  }
}