/**
 * Integration service for mem0 platform
 * Based on official documentation: https://docs.mem0.ai/platform/quickstart
 */

import { MemoryClient } from 'mem0ai';

// Singleton class for mem0 integration
export class Mem0Service {
  private static instance: Mem0Service;
  private client: MemoryClient | null = null;
  private isInitialized: boolean = false;
  private initError: Error | null = null;

  private constructor() {
    this.initialize();
  }

  /**
   * Initialize the mem0 client
   */
  private initialize(): void {
    try {
      if (!process.env.MEM0_API_KEY) {
        console.warn("MEM0_API_KEY environment variable is missing - mem0 features will be disabled");
        this.isInitialized = false;
        this.initError = new Error("MEM0_API_KEY is not set");
        return;
      }

      console.log("Initializing mem0 client with API key...");
      this.client = new MemoryClient({ 
        apiKey: process.env.MEM0_API_KEY,
      });
      
      this.isInitialized = true;
      console.log("Mem0 client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize mem0 client:", error);
      this.isInitialized = false;
      this.initError = error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): Mem0Service {
    if (!Mem0Service.instance) {
      Mem0Service.instance = new Mem0Service();
    }
    return Mem0Service.instance;
  }

  /**
   * Check if the service is initialized
   */
  public isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Get initialization status info
   */
  public getStatus(): { ready: boolean; error: string | null } {
    return {
      ready: this.isReady(),
      error: this.initError ? this.initError.message : null
    };
  }

  /**
   * Create a new user in mem0
   * This should be called right after user registration
   */
  public async createUser(userId: number, username: string, email: string): Promise<boolean> {
    if (!this.isReady()) {
      console.warn(`Mem0 service not initialized - skipping user creation for user ${userId}`);
      return false;
    }

    try {
      console.log(`Creating user ${userId} in mem0...`);
      
      const messages = [{
        role: "system",
        content: `New user registration:
User ID: ${userId}
Username: ${username}
Email: ${email}
Registration Date: ${new Date().toISOString()}`
      }];

      const result = await this.client!.add(messages, {
        user_id: userId.toString(),
        metadata: {
          source: 'registration',
          type: 'user_creation',
          category: 'user_profile',
          timestamp: new Date().toISOString()
        }
      });

      console.log(`User ${userId} created in mem0 successfully:`, result);
      return true;
    } catch (error) {
      console.error(`Failed to create user ${userId} in mem0:`, error);
      return false;
    }
  }

  /**
   * Store onboarding step data
   * This should be called after each onboarding step
   */
  public async storeOnboardingStep(
    userId: number, 
    step: number, 
    stepData: any
  ): Promise<boolean> {
    if (!this.isReady()) {
      console.warn(`Mem0 service not initialized - skipping onboarding step ${step} for user ${userId}`);
      return false;
    }

    try {
      console.log(`Storing onboarding step ${step} for user ${userId} in mem0...`);
      
      // Format the content based on the step
      let content = `Onboarding Step ${step + 1} completed:\n`;
      
      switch (step) {
        case 0: // Basic info
          content += `Name: ${stepData.basicInfo?.name || 'Not provided'}\n`;
          content += `Parent Type: ${stepData.basicInfo?.parentType || 'Not specified'}\n`;
          content += `Experience Level: ${stepData.basicInfo?.experienceLevel || 'Not specified'}\n`;
          break;
        case 1: // Stress assessment
          content += `Stress Level: ${stepData.stressAssessment?.stressLevel || 'Not specified'}\n`;
          content += `Primary Concerns: ${stepData.stressAssessment?.primaryConcerns?.join(', ') || 'None specified'}\n`;
          content += `Support Network: ${stepData.stressAssessment?.supportNetwork?.join(', ') || 'None specified'}\n`;
          break;
        case 2: // Child profiles
          if (stepData.childProfiles && Array.isArray(stepData.childProfiles)) {
            content += "Child Profiles:\n";
            stepData.childProfiles.forEach((child: any, index: number) => {
              content += `Child ${index + 1}: ${child.name || 'Unnamed'} (Age: ${child.age || 'Unknown'})\n`;
              if (child.specialNeeds && child.specialNeeds.length > 0) {
                content += `Special Needs: ${child.specialNeeds.join(', ')}\n`;
              }
            });
          } else {
            content += "No child profiles provided\n";
          }
          break;
        case 3: // Goals
          content += `Short-term Goals: ${stepData.goals?.shortTerm?.join(', ') || 'None specified'}\n`;
          content += `Long-term Goals: ${stepData.goals?.longTerm?.join(', ') || 'None specified'}\n`;
          content += `Support Areas: ${stepData.goals?.supportAreas?.join(', ') || 'None specified'}\n`;
          content += `Communication Preference: ${stepData.goals?.communicationPreference || 'Not specified'}\n`;
          break;
        default:
          content += `Custom step data: ${JSON.stringify(stepData)}\n`;
      }

      const messages = [{
        role: "user",
        content
      }];

      const result = await this.client!.add(messages, {
        user_id: userId.toString(),
        metadata: {
          source: 'onboarding',
          type: `onboarding_step_${step}`,
          category: 'user_onboarding',
          step: step,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Onboarding step ${step} stored in mem0 successfully:`, result);
      return true;
    } catch (error) {
      console.error(`Failed to store onboarding step ${step} for user ${userId} in mem0:`, error);
      return false;
    }
  }

  /**
   * Store onboarding completion data
   */
  public async storeOnboardingCompletion(
    userId: number, 
    onboardingData: any
  ): Promise<boolean> {
    if (!this.isReady()) {
      console.warn(`Mem0 service not initialized - skipping onboarding completion for user ${userId}`);
      return false;
    }

    try {
      console.log(`Storing onboarding completion for user ${userId} in mem0...`);
      
      // Create a formatted summary of all onboarding data
      let content = `Onboarding Completed:
User ID: ${userId}
Completion Date: ${new Date().toISOString()}

Basic Information:
Name: ${onboardingData.basicInfo?.name || 'Not provided'}
Parent Type: ${onboardingData.basicInfo?.parentType || 'Not specified'}
Experience Level: ${onboardingData.basicInfo?.experienceLevel || 'Not specified'}

Stress Assessment:
Stress Level: ${onboardingData.stressAssessment?.stressLevel || 'Not specified'}
Primary Concerns: ${onboardingData.stressAssessment?.primaryConcerns?.join(', ') || 'None specified'}
Support Network: ${onboardingData.stressAssessment?.supportNetwork?.join(', ') || 'None specified'}

`;

      // Add child profiles if available
      if (onboardingData.childProfiles && Array.isArray(onboardingData.childProfiles)) {
        content += "Child Profiles:\n";
        onboardingData.childProfiles.forEach((child: any, index: number) => {
          content += `Child ${index + 1}: ${child.name || 'Unnamed'} (Age: ${child.age || 'Unknown'})\n`;
          if (child.specialNeeds && child.specialNeeds.length > 0) {
            content += `Special Needs: ${child.specialNeeds.join(', ')}\n`;
          }
        });
        content += "\n";
      }

      // Add goals if available
      if (onboardingData.goals) {
        content += "Parenting Goals:\n";
        content += `Short-term Goals: ${onboardingData.goals.shortTerm?.join(', ') || 'None specified'}\n`;
        content += `Long-term Goals: ${onboardingData.goals.longTerm?.join(', ') || 'None specified'}\n`;
        content += `Support Areas: ${onboardingData.goals.supportAreas?.join(', ') || 'None specified'}\n`;
        content += `Communication Preference: ${onboardingData.goals.communicationPreference || 'Not specified'}\n`;
      }

      const messages = [{
        role: "system",
        content
      }];

      const result = await this.client!.add(messages, {
        user_id: userId.toString(),
        metadata: {
          source: 'onboarding',
          type: 'onboarding_completion',
          category: 'user_profile',
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Onboarding completion stored in mem0 successfully:`, result);
      return true;
    } catch (error) {
      console.error(`Failed to store onboarding completion for user ${userId} in mem0:`, error);
      return false;
    }
  }

  /**
   * Store general memory
   */
  public async storeMemory(
    userId: number,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    if (!this.isReady()) {
      console.warn(`Mem0 service not initialized - skipping memory storage for user ${userId}`);
      return false;
    }

    try {
      console.log(`Storing memory for user ${userId} in mem0...`);
      
      const messages = [{
        role: metadata.role || "user",
        content
      }];

      const result = await this.client!.add(messages, {
        user_id: userId.toString(),
        metadata: {
          ...metadata,
          source: metadata.source || 'nuri-app',
          type: metadata.type || 'general',
          category: metadata.category || 'general',
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Memory stored in mem0 successfully:`, result);
      return true;
    } catch (error) {
      console.error(`Failed to store memory for user ${userId} in mem0:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const mem0Service = Mem0Service.getInstance();