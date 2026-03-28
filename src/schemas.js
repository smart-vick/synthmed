import { z } from 'zod';

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  organization: z.string().min(2, 'Organization name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Password must contain an uppercase letter').regex(/[0-9]/, 'Password must contain a number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// API Key Schemas
export const createApiKeySchema = z.object({
  name: z.string().min(1, 'API key name required').max(100),
});

// Data Generation Schemas
export const generatePreviewSchema = z.object({
  province: z.enum(['ON', 'BC', 'AB', 'QC', 'NS', 'MB', 'SK', 'NB', 'NL', 'PE', 'YT', 'NT', 'NU', 'random']).default('random'),
  conditionCategory: z.enum(['cardiovascular', 'diabetes', 'respiratory', 'mental-health', 'random']).default('random'),
}).optional();

export const generateBatchSchema = z.object({
  province: z.enum(['ON', 'BC', 'AB', 'QC', 'NS', 'MB', 'SK', 'NB', 'NL', 'PE', 'YT', 'NT', 'NU', 'random']).default('random'),
  conditionCategory: z.enum(['cardiovascular', 'diabetes', 'respiratory', 'mental-health', 'random']).default('random'),
  count: z.number().int().min(1).max(100).default(10),
  format: z.enum(['csv', 'json']).default('csv'),
});

// Lead Capture Schema
export const leadSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  email: z.string().email('Invalid email address'),
  organization: z.string().min(1, 'Organization required').max(200),
  role: z.string().max(100).optional(),
  message: z.string().max(1000).optional(),
});

// Validation utility
export function validateRequest(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.flatten().fieldErrors,
    };
  }
  return {
    valid: true,
    data: result.data,
  };
}
