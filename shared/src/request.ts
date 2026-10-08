import { z } from 'zod';

export const LIMITS = {
  maxFiles: 10,
  maxTotalBytes: 200 * 1024,
  outputLines: 200,
} as const;

export const FILE_REASONS = ['trace', 'ajout', 'dependances'] as const;

export const SosFileSchema = z.object({
  path: z.string().min(1),
  reason: z.enum(FILE_REASONS),
  line: z.number().int().positive().optional(),
  size: z.number().int().nonnegative(),
  secretsMasked: z.number().int().nonnegative(),
  content: z.string(),
});

export const SosRequestSchema = z.object({
  version: z.literal(1),
  command: z.string().min(1),
  exitCode: z.number().int(),
  output: z.string(),
  tech: z.array(z.string()),
  env: z.object({
    os: z.string(),
    arch: z.string(),
    node: z.string(),
  }),
  files: z.array(SosFileSchema).max(LIMITS.maxFiles),
  secretsMasked: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export type SosFile = z.infer<typeof SosFileSchema>;
export type SosRequest = z.infer<typeof SosRequestSchema>;
