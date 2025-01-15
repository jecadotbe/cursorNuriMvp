import { db } from "@db";
import { eq, and } from "drizzle-orm";
import { 
  villageMembers, 
  relationshipDynamics, 
  interactionHistory,
  type VillageMember,
  type InsertVillageMember,
  type RelationshipDynamic,
  type InteractionHistory
} from "@db/schema";
import { memoryService } from "./memory";

export class VillageService {
  private static instance: VillageService;

  private constructor() {}

  public static getInstance(): VillageService {
    if (!VillageService.instance) {
      VillageService.instance = new VillageService();
    }
    return VillageService.instance;
  }

  async addMember(userId: number, memberData: Omit<InsertVillageMember, 'userId'>): Promise<VillageMember> {
    try {
      // Create the village member
      const [member] = await db
        .insert(villageMembers)
        .values({
          ...memberData,
          userId,
          emotionalContext: {
            currentState: 'neutral',
            lastAnalysis: new Date().toISOString(),
          },
          relationshipStrength: 1,
          lastInteraction: new Date(),
        })
        .returning();

      // Create initial relationship dynamics
      await db.insert(relationshipDynamics).values({
        memberId: member.id,
        userId,
        emotionalState: 'initial',
        contextVector: {
          trust: 0.5,
          closeness: 0.5,
          support: 0.5,
        },
        analysisResult: {
          lastAnalysis: new Date().toISOString(),
          summary: 'Initial relationship established',
        },
      });

      // Log the initial interaction
      await db.insert(interactionHistory).values({
        memberId: member.id,
        userId,
        interactionType: 'addition',
        emotionalImpact: 1,
        details: {
          action: 'member_added',
          circle: member.circle,
          initialType: member.type,
        },
      });

      // Store context in mem0 for AI access
      await memoryService.createMemory(userId, JSON.stringify({
        type: 'village_member_added',
        member: {
          name: member.name,
          type: member.type,
          circle: member.circle,
          context: 'New village member added to support network',
        }
      }), {
        category: 'village_context',
        memberId: member.id,
      });

      return member;
    } catch (error) {
      console.error('Error adding village member:', error);
      throw error;
    }
  }

  async getMembersByUserId(userId: number): Promise<VillageMember[]> {
    return db
      .select()
      .from(villageMembers)
      .where(eq(villageMembers.userId, userId));
  }

  async getMemberWithContext(userId: number, memberId: number): Promise<{
    member: VillageMember;
    dynamics: RelationshipDynamic[];
    interactions: InteractionHistory[];
    memories: any[];
  }> {
    const [member] = await db
      .select()
      .from(villageMembers)
      .where(
        and(
          eq(villageMembers.id, memberId),
          eq(villageMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      throw new Error('Member not found');
    }

    const dynamics = await db
      .select()
      .from(relationshipDynamics)
      .where(eq(relationshipDynamics.memberId, memberId));

    const interactions = await db
      .select()
      .from(interactionHistory)
      .where(eq(interactionHistory.memberId, memberId));

    // Get relevant memories from mem0
    const memories = await memoryService.searchMemories(
      userId,
      `village member ${member.name}`
    );

    return {
      member,
      dynamics,
      interactions,
      memories,
    };
  }

  async updateMemberEmotionalContext(
    userId: number,
    memberId: number,
    emotionalUpdate: any
  ): Promise<VillageMember> {
    const [member] = await db
      .update(villageMembers)
      .set({
        emotionalContext: emotionalUpdate,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(villageMembers.id, memberId),
          eq(villageMembers.userId, userId)
        )
      )
      .returning();

    return member;
  }

  async logInteraction(
    userId: number,
    memberId: number,
    interactionData: Omit<InteractionHistory, 'id' | 'userId' | 'memberId' | 'createdAt'>
  ): Promise<InteractionHistory> {
    const [interaction] = await db
      .insert(interactionHistory)
      .values({
        ...interactionData,
        userId,
        memberId,
      })
      .returning();

    return interaction;
  }
}

export const villageService = VillageService.getInstance();
