import { z } from "zod";

// Enums for onboarding data
export const StressLevel = {
  LOW: "low",
  MODERATE: "moderate",
  HIGH: "high",
  VERY_HIGH: "very_high",
} as const;

export const ExperienceLevel = {
  FIRST_TIME: "first_time",
  EXPERIENCED: "experienced",
  MULTIPLE_CHILDREN: "multiple_children",
} as const;

// Zod schemas for validation and type inference
export const childProfileSchema = z.object({
  name: z.string(),
  age: z.number(),
  specialNeeds: z.array(z.string()).optional().default([]),
});

export const basicInfoSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  experienceLevel: z.enum([
    ExperienceLevel.FIRST_TIME,
    ExperienceLevel.EXPERIENCED,
    ExperienceLevel.MULTIPLE_CHILDREN,
  ]),
});

export const stressAssessmentSchema = z.object({
  stressLevel: z.enum([
    StressLevel.LOW,
    StressLevel.MODERATE,
    StressLevel.HIGH,
    StressLevel.VERY_HIGH,
  ]),
  primaryConcerns: z.array(z.string()).optional().default([]),
  supportNetwork: z.array(z.string()).optional().default([]),
});

export const goalsSchema = z.object({
  shortTerm: z.array(z.string()).optional().default([]),
  longTerm: z.array(z.string()).optional().default([]),
  supportAreas: z.array(z.string()).optional().default([]),
  communicationPreference: z.string().optional(),
});

export const onboardingDataSchema = z.object({
  basicInfo: basicInfoSchema.optional(),
  stressAssessment: stressAssessmentSchema.optional(),
  childProfiles: z.array(childProfileSchema).optional().default([]),
  goals: goalsSchema.optional(),
});

// TypeScript types inferred from schemas
export type ChildProfile = z.infer<typeof childProfileSchema>;
export type BasicInfo = z.infer<typeof basicInfoSchema>;
export type StressAssessment = z.infer<typeof stressAssessmentSchema>;
export type Goals = z.infer<typeof goalsSchema>;
export type OnboardingData = z.infer<typeof onboardingDataSchema>;
