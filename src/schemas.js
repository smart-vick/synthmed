import { z } from 'zod';

// Email validation - strict
const emailSchema = z.string()
  .email('Invalid email address')
  .toLowerCase()
  .refine(email => !email.includes('..'), 'Invalid email format (double dots)')
  .refine(email => email.length > 5, 'Email too short')
  .refine(email => !email.includes('+'), 'Email aliases not allowed') // Prevent +addressing
  .refine(
    email => {
      const disposableDomains = ['tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com'];
      const domain = email.split('@')[1];
      return !disposableDomains.includes(domain);
    },
    'Disposable email addresses not allowed'
  );

// Password validation - strong requirements
const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password too long')
  .regex(/[a-z]/, 'Password must contain lowercase letters')
  .regex(/[A-Z]/, 'Password must contain uppercase letters')
  .regex(/[0-9]/, 'Password must contain numbers')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain special character');

// Organization validation
const organizationSchema = z.string()
  .min(2, 'Organization name too short')
  .max(200, 'Organization name too long')
  .trim();

// Auth schemas
export const registerSchema = z.object({
  email: emailSchema,
  organization: organizationSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

// API Key schemas
export const createApiKeySchema = z.object({
  name: z.string().min(1, 'API key name required').max(100, 'Name too long'),
});

// Data Generation schemas
export const generatePreviewSchema = z.object({
  province: z.enum([
    'ON', 'BC', 'AB', 'QC', 'NS', 'MB', 'SK', 'NB', 'NL', 'PE', 'YT', 'NT', 'NU', 'random'
  ]).default('random'),
  conditionCategory: z.enum([
    'cardiovascular', 'diabetes', 'respiratory', 'mental-health', 'orthopedic', 'random'
  ]).default('random'),
}).optional();

export const generateBatchSchema = z.object({
  province: z.enum([
    'ON', 'BC', 'AB', 'QC', 'NS', 'MB', 'SK', 'NB', 'NL', 'PE', 'YT', 'NT', 'NU', 'random'
  ]).default('random'),
  conditionCategory: z.enum([
    'cardiovascular', 'diabetes', 'respiratory', 'mental-health', 'orthopedic', 'random'
  ]).default('random'),
  count: z.number()
    .int('Count must be an integer')
    .min(1, 'Count must be at least 1')
    .max(1000, 'Count cannot exceed 1000')
    .default(10),
  format: z.enum(['csv', 'json']).default('json'),
});

// Lead capture schema
export const leadSchema = z.object({
  name: z.string().min(1, 'Name required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  organization: z.string().min(1, 'Organization required').max(200, 'Organization too long'),
  role: z.string().max(100, 'Role too long').optional(),
  message: z.string().max(1000, 'Message too long').optional(),
});

// Pagination schema
export const paginationSchema = z.object({
  limit: z.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  offset: z.number()
    .int('Offset must be an integer')
    .min(0, 'Offset must be non-negative')
    .default(0),
});

// Generic validation function
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

// Export all schemas as object
export const schemas = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  createApiKeySchema,
  generatePreviewSchema,
  generateBatchSchema,
  leadSchema,
  paginationSchema,
};
