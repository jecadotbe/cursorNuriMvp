
import { CronJob } from 'cron';
import { db } from '@db';
import { generateVillageSuggestions } from '../lib/suggestion-generator';
import { memoryService } from './memory';
import { villageMembers, parentProfiles } from '@db/schema';
import { eq } from 'drizzle-orm';

export class SuggestionScheduler {
  private cronJob: CronJob;

  constructor() {
    // Run daily at midnight
    this.cronJob = new CronJob('0 0 * * *', async () => {
      await this.generateSuggestionsForAllUsers();
    });
  }

  start() {
    this.cronJob.start();
  }

  private async generateSuggestionsForAllUsers() {
    try {
      const profiles = await db.query.parentProfiles.findMany();
      
      for (const profile of profiles) {
        const members = await db.query.villageMembers.findMany({
          where: eq(villageMembers.userId, profile.userId)
        });

        const context = {
          recentChats: [],
          parentProfile: profile,
          childProfiles: profile.onboardingData?.childProfiles || [],
          challenges: profile.onboardingData?.stressAssessment?.primaryConcerns || [],
          memories: []
        };

        await generateVillageSuggestions(
          profile.userId,
          members,
          context,
          memoryService
        );
      }
    } catch (error) {
      console.error('Failed to generate scheduled suggestions:', error);
    }
  }
}
