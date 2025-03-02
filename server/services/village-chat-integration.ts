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
    // Standard Dutch pattern with variations of "voeg toe aan village"
    /voeg\s+([^.,!?]+)(?:\s+toe\s+aan\s+(?:mijn|de|m'n|je|onze)\s+village)/i,
    
    // Handle typos and variations (e.g., "toevoege naan", "toe voegen aan")
    /toevoege\s+([^.,!?]+)(?:\s+(?:aan|naan)\s+(?:mijn|de|m'n|je|onze)\s+village)/i,
    /toe\s+voegen\s+([^.,!?]+)(?:\s+aan\s+(?:mijn|de|m'n|je|onze)\s+village)/i,
    
    // Simple pattern for direct requests ("X toevoegen aan village")
    /([^.,!?]+)\s+toevoegen\s+aan\s+(?:mijn|de|m'n|je|onze)\s+village/i,
    
    // Handle questions like "Kan jij X toevoegen aan mijn village"
    /(?:kan|kun|zou|wil)\s+(?:je|jij|u)\s+([^.,!?]+)\s+(?:toevoegen|toevoege|toe\s*voegen)\s+aan\s+(?:mijn|de|m'n|je|onze)\s+village/i,
    
    // Handle "graag" constructions like "graag X toevoegen aan village"
    /graag\s+([^.,!?]+)\s+(?:toevoegen|toevoege|toe\s*voegen)\s+aan\s+(?:mijn|de|m'n|je|onze)\s+village/i,
    
    // Handle "wil graag" constructions
    /(?:ik\s+)?(?:wil|zou)\s+graag\s+([^.,!?]+)\s+(?:toevoegen|toevoege|toe\s*voegen)\s+aan\s+(?:mijn|de|m'n|je|onze)\s+village/i,
    
    // Handle informal requests
    /zet\s+([^.,!?]+)\s+(?:in|bij)\s+(?:mijn|de|m'n|je|onze)\s+village/i,
    
    // Broader pattern for "add to village" context - use carefully as a fallback
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
 * Handles formats like "John, Mary & Bob" or "John en Mary" or "John, Mary en Bob"
 * Also handles Dutch language specific constructions
 */
function extractMemberNames(namesText: string): DetectedVillageMember[] {
  const members: DetectedVillageMember[] = [];
  
  // Pre-process the text to standardize it
  let normalized = namesText
    // First clean up any leading/trailing context words
    .replace(/^(bijvoorbeeld|bijv\.|zoals|namelijk|o\.a\.|onder andere)\s+/i, '')
    // Replace various conjunctions with commas for easier splitting
    .replace(/\s+(en|&|plus|samen\s+met|evenals|alsook|alsmede)\s+/gi, ', ')
    // Replace Dutch list patterns
    .replace(/\s+en\s+ook\s+/gi, ', ')
    // Handle parenthetical clarifications - "(mijn broer)" becomes just the name
    .replace(/\s+\([^)]+\)/g, '');
  
  // Handle "zowel X als Y" pattern
  normalized = normalized.replace(/zowel\s+([^,]+)\s+als\s+([^,]+)/gi, '$1, $2');
  
  // Split by comma and clean up each name
  const names = normalized.split(/,\s*/).filter(Boolean);
  
  for (const name of names) {
    const trimmedName = name.trim();
    if (trimmedName) {
      // Remove any "mijn", "onze", etc. prefixes
      let cleanName = trimmedName
        .replace(/^(mijn|m'n|onze|de|het)\s+/i, '')
        .replace(/\s+(familie|gezin)$/i, '')
        .trim();
        
      // Skip common words that shouldn't be considered names
      const skipWords = ['village', 'mensen', 'personen', 'vrienden', 'familie', 'iedereen'];
      if (cleanName && !skipWords.includes(cleanName.toLowerCase())) {
        members.push({ name: cleanName });
      }
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
  
  let response = `✅ Ik heb ${isMultiple ? 'deze mensen' : memberNames} toegevoegd aan jouw Village! ✨\n\n`;
  
  // Different response based on how many members were added 
  if (isMultiple) {
    if (addedMembers.length > 3) {
      response += `Je hebt zojuist ${addedMembers.length} mensen toegevoegd aan je ondersteuningsnetwerk.`;
    } else {
      response += `Je hebt zojuist ${memberNames} toegevoegd aan je ondersteuningsnetwerk.`;
    }
    response += ' Deze mensen kunnen een waardevolle bron van steun voor je zijn.\n\n';
  } else {
    response += `${memberNames} is nu onderdeel van je Village en kan een waardevolle bron van steun voor je zijn.\n\n`;
  }
  
  // Only show the full list if it's not too long (max 10 members)
  if (allMembers.length <= 10) {
    response += 'Je Village bestaat nu uit:\n\n';
    
    // List all members as bullet points
    allMembers.forEach(member => {
      response += `• ${member.name}\n`;
    });
    response += '\n';
  } else {
    response += `Je Village bevat nu in totaal ${allMembers.length} personen.\n\n`;
  }
  
  // Add follow-up prompt with different options
  response += 'Wat wil je nu doen?\n\n';
  response += '1. Nog meer mensen toevoegen aan je Village\n';
  response += '2. Bekijk de Village pagina om je netwerk te visualiseren\n';
  response += '3. Krijg tips over hoe je jouw Village effectief kunt inzetten voor ondersteuning';
  
  return response;
}

/**
 * Generates a prompt message with action buttons for detected village members
 * This creates a chips-style UI for the user to confirm adding members
 */
export function generateVillageMemberPrompt(
  detectedMembers: DetectedVillageMember[]
): string {
  if (detectedMembers.length === 0) {
    return '';
  }
  
  // Format the member names for display
  const membersList = detectedMembers.map(m => `**${m.name}**`).join(', ');
  
  // Create the message header based on number of members
  let message = detectedMembers.length === 1
    ? `Ik zie dat je **${detectedMembers[0].name}** wilt toevoegen aan je Village. Klik op de knop hieronder om dit te bevestigen.`
    : `Ik zie dat je deze mensen wilt toevoegen aan je Village: ${membersList}. Je kunt ze individueel of allemaal in één keer toevoegen.`;
  
  // Add action buttons in the special format that will be rendered as chips
  message += '\n\n<village-actions>\n';
  
  // Add button for each member
  detectedMembers.forEach((member, index) => {
    message += `<village-action id="add-${index}" name="${member.name}" action="add-to-village">Voeg ${member.name} toe</village-action>\n`;
  });
  
  // Add "Add All" button if there are multiple members
  if (detectedMembers.length > 1) {
    message += `<village-action id="add-all" action="add-all-to-village">Voeg alle ${detectedMembers.length} toe</village-action>\n`;
  }
  
  message += '</village-actions>\n\n';
  
  // Add extra instructions that change based on number of people
  if (detectedMembers.length === 1) {
    message += 'Je kunt ook naar de Village pagina gaan om meer details toe te voegen, zoals hoe vaak je contact hebt en in welke categorie deze persoon valt.';
  } else {
    message += 'Het toevoegen van mensen aan je Village helpt je om een beter overzicht te krijgen van je sociale netwerk en ondersteuningssysteem.';
  }
  
  return message;
}