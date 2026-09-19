import { z } from "zod";

/**
 * Common slug pattern (docs/ROUTING.md Section 3.2):
 * Lowercase alphanumeric and hyphens, 6 to 48 characters.
 */
export const SlugSchema = z
  .string()
  .min(6, "Slug must be at least 6 characters")
  .max(48, "Slug cannot exceed 48 characters")
  .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens");

/**
 * Creator Registration Schema (Public creator signup per DEC-008 / Q1).
 */
export const RegisterSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("A valid email address is required")
    .max(255, "Email address is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Creator Login Schema.
 */
export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("A valid email address is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Proposal Initialization Schema (docs/PRODUCT_SPEC.md).
 */
export const CreateProposalSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Proposal title is required")
    .max(100, "Proposal title cannot exceed 100 characters"),
  partnerName: z
    .string()
    .trim()
    .min(1, "Partner name is required")
    .max(100, "Partner name cannot exceed 100 characters"),
  themeId: z.string().trim().default("midnight-velvet"),
  slug: SlugSchema.optional(),
});

export type CreateProposalInput = z.infer<typeof CreateProposalSchema>;

/**
 * Proposal Edit/Update Schema (Live mutable model per DEC-007 / Q4).
 */
export const UpdateProposalSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  partnerName: z.string().trim().min(1).max(100).optional(),
  themeId: z.string().trim().optional(),
  slug: SlugSchema.optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "UNPUBLISHED", "ARCHIVED", "DELETED"]).optional(),
  customThemeOverrides: z.record(z.string(), z.unknown()).optional(),
  storyContent: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateProposalInput = z.infer<typeof UpdateProposalSchema>;

export const PublishActionSchema = z.object({
  action: z.enum(["publish", "unpublish"]).default("publish"),
});

export type PublishActionInput = z.infer<typeof PublishActionSchema>;

/**
 * Recipient Response Submission Schema (Persisted responses per DEC-002 / Q2).
 */
export const SubmitResponseSchema = z.object({
  choice: z
    .string()
    .trim()
    .min(1, "Response choice token is required")
    .max(50, "Choice token cannot exceed 50 characters"),
  customNote: z
    .string()
    .trim()
    .max(1000, "Custom note cannot exceed 1000 characters")
    .nullable()
    .optional(),
});

export type SubmitResponseInput = z.infer<typeof SubmitResponseSchema>;
