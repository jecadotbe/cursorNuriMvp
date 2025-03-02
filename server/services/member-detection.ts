
import { anthropic } from "../anthropic";
import { VillageMember } from "@db/schema";

interface DetectedMember {
  name: string;
  type?: "individual" | "group";
  circle?: number;
  category?: "informeel" | "formeel" | "inspiratie" | null;
  contactFrequency?: "S" | "M" | "L" | "XL" | null;
  context: string;
}

/**
 * Detects potential village members from chat messages using Claude
 */
export async function detectPotentialMembers(
  messages: { role: string; content: string }[],
  existingMembers: VillageMember[]
): Promise<DetectedMember[]> {
  // Only use the last few messages for context
  const recentMessages = messages.slice(-10);
  
  // Extract existing member names to avoid suggesting duplicates
  const existingNames = new Set(existingMembers.map(m => m.name.toLowerCase()));
  
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      temperature: 0.2,
      system: `You are a helpful assistant that detects potential village members from chat messages.
      
Your task is to identify names of people or groups mentioned in messages that could be part of the user's support network or "village".

Rules:
1. Only include real people or groups (not fictional characters, pets, etc. unless explicitly asked to be added to the village)
2. Look for names that are mentioned with social context (family, friends, colleagues, etc.)
3. Pay attention to sentences containing phrases like "add to my village", "toevoegen aan mijn village", etc.
4. Ignore names of existing village members in the provided list
5. Only output JSON in the exact format specified below

For each potential village member detected, output in JSON format:
{
  "detectedMembers": [
    {
      "name": "Full name of the person or group",
      "type": "individual" or "group",
      "circle": 1-5 (1=closest, 5=furthest, default to 2 if unsure),
      "category": "informeel" or "formeel" or "inspiratie" or null,
      "contactFrequency": "S" or "M" or "L" or "XL" or null,
      "context": "Brief reason why this person was detected"
    }
  ]
}

If no potential members are detected, return: {"detectedMembers": []}`,
      messages: [
        {
          role: "user",
          content: `Here are my recent chat messages and existing village members.

Existing village members: ${Array.from(existingNames).join(", ")}

Recent messages: ${recentMessages.map(m => `${m.role}: ${m.content}`).join("\n\n")}

Please detect any potential village members I've mentioned that should be added to my village.`
        }
      ]
    });
    
    // Extract the JSON response
    const content = response.content[0].type === "text" ? response.content[0].text : "";
    
    // Extract JSON part from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log("Failed to extract JSON from response:", content);
      return [];
    }
    
    try {
      const result = JSON.parse(jsonMatch[0]);
      return result.detectedMembers || [];
    } catch (parseError) {
      console.error("Error parsing JSON from Claude:", parseError);
      console.log("Raw response:", content);
      return [];
    }
  } catch (error) {
    console.error("Error detecting potential members:", error);
    return [];
  }
}
