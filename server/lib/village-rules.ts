
import { VillageMember } from "@db/schema";

export const VILLAGE_RULES = {
  // Minimum members per circle (closest relationships)
  CIRCLE_MINIMUMS: {
    1: 3, // Inner circle needs at least 3 people
    2: 4,
    3: 4,
    4: 3,
    5: 2
  },

  // Ideal category distribution
  CATEGORY_BALANCE: {
    informeel: 0.5, // 50% informal support
    formeel: 0.3,  // 30% formal support
    inspiratie: 0.2 // 20% inspiration
  },

  // Contact frequency guidelines
  FREQUENCY_DISTRIBUTION: {
    S: 0.4,  // 40% frequent contact
    M: 0.3,  // 30% medium frequency
    L: 0.2,  // 20% lower frequency
    XL: 0.1  // 10% occasional contact
  },

  // Essential role types to have in network
  ESSENTIAL_ROLES: [
    "family",
    "friend",
    "professional",
    "mentor",
    "peer_parent",
    "childcare",
    "healthcare",
    "emotional_support"
  ],

  // Suggestion priority factors
  SUGGESTION_WEIGHTS: {
    circle_gap: 3,      // High priority for filling inner circle gaps
    category_balance: 2, // Medium priority for category balance
    role_diversity: 2,  // Medium priority for diverse roles
    frequency_gap: 1    // Lower priority for contact frequency
  }
};

export function analyzeVillageGaps(members: VillageMember[]) {
  const gaps = {
    circles: new Map<number, number>(),
    categories: new Map<string, number>(),
    roles: new Set<string>(),
    suggestions: []
  };

  // Analyze current distribution
  members.forEach(member => {
    gaps.circles.set(member.circle, (gaps.circles.get(member.circle) || 0) + 1);
    gaps.categories.set(member.category!, (gaps.categories.get(member.category!) || 0) + 1);
    gaps.roles.add(member.role || '');
  });

  // Generate prioritized suggestions
  Object.entries(VILLAGE_RULES.CIRCLE_MINIMUMS).forEach(([circle, min]) => {
    const current = gaps.circles.get(Number(circle)) || 0;
    if (current < min) {
      gaps.suggestions.push({
        type: 'circle_gap',
        priority: VILLAGE_RULES.SUGGESTION_WEIGHTS.circle_gap,
        message: `Consider adding ${min - current} more members to circle ${circle}`
      });
    }
  });

  return gaps;
}
