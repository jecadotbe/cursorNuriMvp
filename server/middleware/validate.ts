import { Request, Response, NextFunction } from "express";
import { z } from "zod";

// Error formatting for better client-side error messages
const formatZodError = (error: z.ZodError) => {
  return {
    message: "Validation failed",
    errors: error.errors.map(err => ({
      path: err.path.join("."),
      message: err.message
    }))
  };
};

// Generic validation middleware creator
export const validate = <T extends z.ZodTypeAny>(
  schema: T,
  source: "body" | "query" | "params" | "headers" = "body"
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req[source]);
      
      if (!result.success) {
        return res.status(400).json(formatZodError(result.error));
      }
      
      // Replace the request data with the validated data
      req[source] = result.data;
      next();
    } catch (error) {
      console.error("Validation error:", error);
      return res.status(500).json({ 
        message: "Internal server error during validation" 
      });
    }
  };
};

// Common validation schemas
export const schemas = {
  // User schemas
  login: z.object({
    username: z.string().min(3).max(50),
    password: z.string().min(8)
  }),
  
  register: z.object({
    username: z.string().min(3).max(50),
    email: z.string().email(),
    password: z.string().min(8).regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    )
  }),
  
  // Profile schemas
  parentProfile: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email().optional(),
    stressLevel: z.enum(["low", "moderate", "high", "very_high"]),
    experienceLevel: z.enum(["first_time", "experienced", "multiple_children"]),
    primaryConcerns: z.array(z.string()).optional(),
    supportNetwork: z.array(z.string()).optional(),
    bio: z.string().max(500).optional(),
    preferredLanguage: z.string().default("nl"),
    communicationPreference: z.string().optional()
  }),
  
  // Village member schemas
  villageMember: z.object({
    name: z.string().min(2).max(100),
    type: z.string(),
    role: z.string().optional(),
    circle: z.number().int().min(1).max(3),
    category: z.enum(["family", "friend", "professional", "other"]).optional(),
    contactFrequency: z.enum(["daily", "weekly", "monthly", "rarely"]).optional(),
    positionAngle: z.number().default(0),
    metadata: z.record(z.any()).optional()
  }),
  
  // Chat schemas
  message: z.object({
    content: z.string().min(1).max(2000),
    chatId: z.number().int().positive().optional()
  }),
  
  // Pagination schema
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  }),
  
  // ID parameter schema
  idParam: z.object({
    id: z.coerce.number().int().positive()
  }),
  
  // Search schema
  search: z.object({
    query: z.string().min(1).max(100),
    type: z.string().optional()
  })
};

// Export validation middleware instances for common schemas
export const validateLogin = validate(schemas.login);
export const validateRegister = validate(schemas.register);
export const validateParentProfile = validate(schemas.parentProfile);
export const validateVillageMember = validate(schemas.villageMember);
export const validateMessage = validate(schemas.message);
export const validatePagination = validate(schemas.pagination, "query");
export const validateIdParam = validate(schemas.idParam, "params");
export const validateSearch = validate(schemas.search, "query"); 