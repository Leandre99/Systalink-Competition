import { z } from 'zod';

// ==========================================
// API ENVELOPE RESPONSE FORMAT
// ==========================================
export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
}

export interface ApiErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ==========================================
// SECRET MASKING UTILITY
// ==========================================
const SECRET_PATTERNS = [
  // API Keys / Tokens
  /(?:api[_-]?key|secret|token|password|passwd|pwd|auth[_-]?token|bearer)\s*[:=]\s*["']?([A-Za-z0-9_\-\.\:\/]+)["']?/gi,
  // AWS Keys
  /(AKIA[0-9A-Z]{16})/g,
  // JWT Tokens
  /(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/g,
  // DB Connection strings
  /(postgres|mysql|mongodb|redis):\/\/[^\s"']+/gi,
  // Private keys
  /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g,
];

export function maskSecrets(input: string): { maskedText: string; secretsCount: number } {
  if (!input) return { maskedText: '', secretsCount: 0 };
  let count = 0;
  let result = input;

  // Mask specific patterns
  SECRET_PATTERNS.forEach((pattern) => {
    result = result.replace(pattern, (match) => {
      count++;
      return '***[SECRET MASQUÉ POUR SÉCURITÉ]***';
    });
  });

  return { maskedText: result, secretsCount: count };
}

// ==========================================
// ZOD SCHEMAS & TYPES
// ==========================================

// User / Maison
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  city: z.string().default('Cotonou'),
  stack: z.array(z.string()).default([]),
  bio: z.string().default('Développeur passionné'),
  doorOpen: z.boolean().default(true),
  points: z.number().default(0),
  role: z.enum(['demandeur', 'aidant', 'mentor']).default('aidant'),
  avatar: z.string().default('/avatar-default.png'),
});
export type User = z.infer<typeof UserSchema>;

// Help Request
export const HelpRequestSchema = z.object({
  id: z.string(),
  title: z.string().min(3, 'Le titre doit faire au moins 3 caractères'),
  description: z.string().min(10, "Explique le problème plus en détail"),
  code: z.string(),
  cleanCode: z.string(),
  secretsMaskedCount: z.number().default(0),
  stackTag: z.string().min(1, 'Sélectionne une technologie'),
  status: z.enum(['pending', 'matched', 'resolved', 'closed']).default('pending'),
  requesterId: z.string(),
  requesterName: z.string(),
  helperId: z.string().optional(),
  helperName: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type HelpRequest = z.infer<typeof HelpRequestSchema>;

export const CreateHelpRequestSchema = z.object({
  title: z.string().min(3, 'Titre trop court'),
  description: z.string().min(10, 'Description trop courte'),
  code: z.string(),
  stackTag: z.string().min(1, 'Choisis une techno'),
  requesterId: z.string(),
  requesterName: z.string(),
});
export type CreateHelpRequest = z.infer<typeof CreateHelpRequestSchema>;

// Chat Message
export const ChatMessageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  senderName: z.string(),
  text: z.string(),
  timestamp: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// CodeFlash Room
export const RoomSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  requestTitle: z.string(),
  stackTag: z.string(),
  requesterId: z.string(),
  requesterName: z.string(),
  helperId: z.string(),
  helperName: z.string(),
  code: z.string(),
  chat: z.array(ChatMessageSchema).default([]),
  testStatus: z.enum(['idle', 'running', 'passed', 'failed']).default('idle'),
  testOutput: z.string().default(''),
  confirmed: z.boolean().default(false),
  requesterApproved: z.boolean().default(false),
  helperApproved: z.boolean().default(false),
  solutionSheetId: z.string().optional(),
  status: z.enum(['active', 'resolved', 'closed']).default('active'),
  createdAt: z.string(),
});
export type Room = z.infer<typeof RoomSchema>;

// Solution Sheet
export const SolutionSheetSchema = z.object({
  id: z.string(),
  title: z.string(),
  problem: z.string(),
  cause: z.string(),
  solution: z.string(),
  codeSnippet: z.string(),
  stackTag: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  helperId: z.string(),
  helperName: z.string(),
  publishedAt: z.string(),
  upvotes: z.number().default(0),
  proofHash: z.string(),
});
export type SolutionSheet = z.infer<typeof SolutionSheetSchema>;

// Project Task
export const ProjectTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['todo', 'in_progress', 'done']),
  assigneeName: z.string().optional(),
});
export type ProjectTask = z.infer<typeof ProjectTaskSchema>;

// Project Showcase
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Nom de projet trop court'),
  description: z.string().min(10, 'Description trop courte'),
  demoUrl: z.string().optional(),
  repoUrl: z.string().optional(),
  rolesNeeded: z.array(z.string()),
  authorId: z.string(),
  authorName: z.string(),
  city: z.string().default('Cotonou'),
  membersCount: z.number().default(1),
  tasks: z.array(ProjectTaskSchema).default([]),
  createdAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

// Join Request
export const JoinRequestSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  userId: z.string(),
  userName: z.string(),
  message: z.string(),
  status: z.enum(['pending', 'accepted', 'rejected']).default('pending'),
  createdAt: z.string(),
});
export type JoinRequest = z.infer<typeof JoinRequestSchema>;

// Proof item in Passport
export const PassportProofSchema = z.object({
  id: z.string(),
  type: z.enum(['help_confirmed', 'solution_published', 'project_contributor']),
  title: z.string(),
  detail: z.string(),
  url: z.string(),
  hash: z.string(),
  timestamp: z.string(),
});
export type PassportProof = z.infer<typeof PassportProofSchema>;

// Passport Profile
export const PassportSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userCity: z.string(),
  bio: z.string(),
  stack: z.array(z.string()),
  points: z.number(),
  helpsCount: z.number(),
  solutionsCount: z.number(),
  proofs: z.array(PassportProofSchema),
  signatureHash: z.string(),
  signedAt: z.string(),
});
export type Passport = z.infer<typeof PassportSchema>;

// Report / Flag
export const ReportSchema = z.object({
  id: z.string(),
  targetType: z.enum(['solution', 'project', 'user']),
  targetId: z.string(),
  reason: z.string().min(3, 'Précise la raison'),
  details: z.string().optional(),
  createdAt: z.string(),
});
export type Report = z.infer<typeof ReportSchema>;
