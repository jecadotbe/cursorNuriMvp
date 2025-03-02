import { VillageMember, InsertVillageMember } from '@db/schema';
import { db } from '@db';
import { villageMembers } from '@db/schema';
import { eq } from 'drizzle-orm';

// Utility type for a detected entity in a chat message
export interface DetectedVillageMember {
  name: string;
  type?: string;
  circle?: number;
  category?: "informeel" | "formeel" | "inspiratie" | null;
  contactFrequency?: "S" | "M" | "L" | "XL" | null;
}

// Default values for new village members
const DEFAULT_MEMBER_VALUES = {
  type: "other",
  circle: 2,
  category: null as ("informeel" | "formeel" | "inspiratie" | null),
  contactFrequency: null as ("S" | "M" | "L" | "XL" | null),
};

/**
 * Extract potential village members from a chat message
 * This function detects both explicit requests to add members and implicit mentions
 * 
 * @param message The chat message to analyze
 * @returns Array of detected village members
 */
export function extractVillageMembersFromMessage(message: string): DetectedVillageMember[] {
  const members: DetectedVillageMember[] = [];
  
  // Handle direct "add X to village" patterns with more variations
  const addToVillageRegexPatterns = [
    // Standard Dutch pattern
    /voeg\s+([^.,!?]+)(?:\s+toe\s+aan\s+(?:mijn|de|m'n)\s+village)/i,
    // Handle typos and variations (e.g., "toevoege naan")
    /toevoege\s+([^.,!?]+)(?:\s+(?:aan|naan)\s+(?:mijn|de|m'n)\s+village)/i,
    // Simple pattern for direct requests
    /([^.,!?]+)\s+toevoegen\s+aan\s+(?:mijn|de|m'n)\s+village/i,
    // Handle questions like "Kan jij X toevoegen aan mijn village"
    /kan\s+(?:je|jij)\s+([^.,!?]+)\s+(?:toevoegen|toevoege|toe\s*voegen)\s+aan\s+(?:mijn|de|m'n)\s+village/i,
    // Broader pattern for "add to village" context
    /voeg\s+([^.,!?]+)\s+toe/i
  ];
  
  // Try each pattern until we find a match
  for (const regex of addToVillageRegexPatterns) {
    const match = message.match(regex);
    if (match && match[1]) {
      // Found an explicit request to add someone to the village
      const namesText = match[1].trim();
      const extractedMembers = extractMemberNames(namesText);
      members.push(...extractedMembers);
      return members;
    }
  }
  
  // Search for capitalized names in context of "village" mention
  if (message.toLowerCase().includes("village")) {
    const potentialNameRegex = /\b[A-Z][a-z]+\b/g;
    const potentialNames = message.match(potentialNameRegex);
    
    if (potentialNames) {
      // Filter out common words that might be capitalized
      const commonWords = ["Ik", "Mijn", "De", "Het", "Een", "Dag", "Hoi", "Kan", "Village"];
      const filteredNames = potentialNames.filter(name => !commonWords.includes(name));
      
      if (filteredNames.length > 0 && 
         (message.toLowerCase().includes("toevoeg") || 
          message.toLowerCase().includes("add"))) {
        filteredNames.forEach(name => members.push({ name }));
        return members;
      }
    }
  }
  
  return members;
}

/**
 * Extract individual member names from a comma/and separated string
 * Handles formats like "John, Mary & Bob" or "John en Mary"
 */
function extractMemberNames(namesText: string): DetectedVillageMember[] {
  const members: DetectedVillageMember[] = [];
  
  // Replace '&' and 'en' with commas for easier splitting
  let normalized = namesText.replace(/\s+(&|en)\s+/g, ', ');
  
  // Split by comma and clean up each name
  const names = normalized.split(/,\s*/).filter(Boolean);
  
  for (const name of names) {
    if (name.trim()) {
      members.push({ name: name.trim() });
    }
  }
  
  return members;
}

/**
 * Add multiple village members for a user
 */
export async function addVillageMembersFromChat(
  userId: number, 
  detectedMembers: DetectedVillageMember[]
): Promise<VillageMember[]> {
  const addedMembers: VillageMember[] = [];
  
  // Get existing village members to avoid duplicates
  const existingMembers = await db
    .select()
    .from(villageMembers)
    .where(eq(villageMembers.userId, userId));
  
  const existingNames = new Set(existingMembers.map(m => m.name.toLowerCase()));
  
  // Process each detected member
  for (const member of detectedMembers) {
    // Skip if this name already exists (case insensitive)
    if (existingNames.has(member.name.toLowerCase())) {
      continue;
    }
    
    // Create a new village member with default values
    const newMember: Omit<InsertVillageMember, 'id'> = {
      userId,
      name: member.name,
      type: member.type || DEFAULT_MEMBER_VALUES.type,
      circle: member.circle || DEFAULT_MEMBER_VALUES.circle,
      category: member.category || DEFAULT_MEMBER_VALUES.category,
      contactFrequency: member.contactFrequency || DEFAULT_MEMBER_VALUES.contactFrequency,
      positionAngle: String(Math.random() * 360), // Random initial position as string
    };
    
    try {
      // Insert the new member into the database
      const [inserted] = await db
        .insert(villageMembers)
        .values(newMember)
        .returning();
      
      addedMembers.push(inserted);
    } catch (error) {
      console.error('Error adding village member from chat:', error);
    }
  }
  
  return addedMembers;
}

/**
 * Generates a message confirming which members were added to the village
 */
export function generateVillageAdditionConfirmation(
  addedMembers: VillageMember[],
  allMembers: VillageMember[]
): string {
  if (addedMembers.length === 0) {
    return '';
  }
  
  const memberNames = addedMembers.map(m => m.name).join(', ');
  const isMultiple = addedMembers.length > 1;
  
  let response = `Ik heb ${isMultiple ? 'deze mensen' : memberNames} toegevoegd aan jouw Village! ✨\n\n`;
  
  response += 'Je Village bestaat nu uit:\n\n';
  
  // List all members as bullet points
  allMembers.forEach(member => {
    response += `• ${member.name}\n`;
  });
  
  // Add follow-up prompt
  response += '\nWil je nog meer mensen toevoegen? Of zal ik je tips geven over hoe je deze village-leden het beste kunt inzetten voor steun?';
  
  return response;
}