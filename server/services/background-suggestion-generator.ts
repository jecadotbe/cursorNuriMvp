import { db } from "@db";
import { promptSuggestions, villageMembers, parentProfiles, chats } from "@db/schema";
import { desc, eq, and, isNull, lt, gte } from "drizzle-orm";
import { generateVillageSuggestions } from "../lib/suggestion-generator";
import { memoryService } from "./memory";
import type { User } from "../auth";

const MIN_SUGGESTION_COUNT = 5; // Minimum number of suggestions to maintain per user
const BATCH_SIZE = 3; // Number of suggestions to generate in one batch
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

export class BackgroundSuggestionGenerator {
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.checkInterval = setInterval(() => this.checkAndGenerateSuggestions(), CHECK_INTERVAL);
    console.log('Background suggestion generator started');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.isRunning = false;
    console.log('Background suggestion generator stopped');
  }

  private async checkAndGenerateSuggestions() {
    try {
      console.log('Checking suggestion levels...');
      
      // Get all users with fewer than MIN_SUGGESTION_COUNT unused suggestions
      const users = await db.query.users.findMany();
      
      for (const user of users) {
        await this.generateForUser(user);
      }
    } catch (error) {
      console.error('Error in background suggestion generation:', error);
    }
  }

  private async generateForUser(user: User) {
    const now = new Date();
    
    // Count current valid suggestions
    const currentSuggestions = await db.query.promptSuggestions.findMany({
      where: and(
        eq(promptSuggestions.userId, user.id),
        isNull(promptSuggestions.usedAt),
        gte(promptSuggestions.expiresAt, now)
      )
    });

    if (currentSuggestions.length >= MIN_SUGGESTION_COUNT) {
      return; // User has enough suggestions
    }

    // Get context for generation
    const members = await db.query.villageMembers.findMany({
      where: eq(villageMembers.userId, user.id)
    });

    const recentChats = await db.query.chats.findMany({
      where: eq(chats.userId, user.id),
      orderBy: desc(chats.updatedAt),
      limit: 3
    });

    const parentProfile = await db.query.parentProfiles.findFirst({
      where: eq(parentProfiles.userId, user.id)
    });

    if (!parentProfile) {
      console.log(`No parent profile for user ${user.id}, skipping suggestion generation`);
      return;
    }

    const villageContext = {
      recentChats: recentChats.map(chat => ({
        ...chat,
        messages: Array.isArray(chat.messages) ? chat.messages : []
      })),
      parentProfile,
      childProfiles: parentProfile.onboardingData?.childProfiles || [],
      challenges: parentProfile.onboardingData?.stressAssessment?.primaryConcerns || [],
      memories: []
    };

    try {
      const newSuggestions = await generateVillageSuggestions(
        user.id,
        members,
        villageContext,
        memoryService
      );

      // Store new suggestions
      if (newSuggestions.length > 0) {
        await db.insert(promptSuggestions).values(newSuggestions);
        console.log(`Generated ${newSuggestions.length} new suggestions for user ${user.id}`);
      }
    } catch (error) {
      console.error(`Error generating suggestions for user ${user.id}:`, error);
    }
  }
}

// Export singleton instance
export const backgroundSuggestionGenerator = new BackgroundSuggestionGenerator();
