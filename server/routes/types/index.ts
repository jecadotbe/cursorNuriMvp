import { Request } from "express";
import { User } from "../../auth";

/**
 * Extended request type including authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Type definition for child profile
 */
export type ChildProfile = {
  name: string;
  age: number;
  specialNeeds: string[];
};

/**
 * Suggestion categories constant
 */
export const SUGGESTION_CATEGORIES = {
  VILLAGE: "village",
  CHILD_DEVELOPMENT: "child_development",
  STRESS: "stress", 
  LEARNING: "learning",
  PERSONAL_GROWTH: "personal_growth",
} as const;

export type SuggestionCategory = typeof SUGGESTION_CATEGORIES[keyof typeof SUGGESTION_CATEGORIES];