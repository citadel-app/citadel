import { z } from 'zod';

// ==========================================
// Base Utilities
// ==========================================
export const absolutePathSchema = z.string().min(1, 'Path cannot be empty');
export const repositoryPathSchema = z.string().min(1, 'Repository path cannot be empty');

// ==========================================
// File System (FS) Schemas
// ==========================================
export const FsWriteFileSchema = z.object({
  path: absolutePathSchema,
  content: z.string()
});

export const FsRenameSchema = z.object({
  oldPath: absolutePathSchema,
  newPath: z.string().min(1, 'New path cannot be empty') // We will derive the new absolute path
});

export const FsScaffoldWorkspaceSchema = z.object({
  targetPath: absolutePathSchema,
  workspaceName: z.string().min(1, 'Workspace name cannot be empty'),
  cloneUrl: z.string().url('Invalid repository URL').or(z.string().length(0))
});

export const FsWriteAssetSchema = z.object({
  path: absolutePathSchema,
  content: z.instanceof(Uint8Array)
});

// ==========================================
// AI / LLM Schemas
// ==========================================
export const AiRoleSchema = z.enum(['user', 'assistant', 'system']);

export const AiMessageSchema = z.object({
  role: AiRoleSchema,
  content: z.string()
});

export const AiChatSchema = z.object({
  messages: z.array(AiMessageSchema).min(1, 'Must provide at least one message'),
  options: z.any().optional()
});

export const AiAnalyzeIntentSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  entryTypes: z.any().optional()
});

export const AiSearchSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty'),
  limit: z.number().int().positive().optional()
});

export const AiContextSchema = z.object({
  entryId: z.string().min(1),
  query: z.string(),
  maxChunks: z.number().int().positive().optional()
});

export const AiScoreModelSchema = z.object({
  model: z.any(),
  specs: z.any()
});

export const AiPullModelSchema = z.object({
  model: z.string().min(1)
});

// ==========================================
// Git Schemas
// ==========================================
export const GitCommitSchema = z.object({
  repoPath: repositoryPathSchema,
  message: z.string().min(1, 'Commit message cannot be empty')
});

export const GitAddSchema = z.object({
  repoPath: repositoryPathSchema,
  files: z.array(z.string())
});

export const GitPushPullSchema = z.object({
  repoPath: repositoryPathSchema,
  remote: z.string().optional(),
  branch: z.string().optional()
});

export const GitBranchSchema = z.object({
  repoPath: repositoryPathSchema,
  branchName: z.string().min(1, 'Branch name cannot be empty')
});

export const GitCheckoutSchema = z.object({
  repoPath: repositoryPathSchema,
  branchName: z.string().min(1, 'Branch name cannot be empty')
});

export const GitCloneSchema = z.object({
  url: z.string().url('Must provide valid clone URL'),
  targetPath: absolutePathSchema
});

// ==========================================
// Sidecar / REPL Schemas
// ==========================================
export const ReplStartSessionSchema = z.object({
  lang: z.enum(['python', 'node', 'rust', 'go', 'ruby']).catch('python') // Supported REPLs
});

export const ReplSendInputSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  data: z.string()
});

export const ReplSessionIdSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format')
});

export const ReplContainerIdSchema = z.object({
  containerId: z.string().min(1, 'Container ID required')
});

export const ServiceSchema = z.object({
  service: z.enum(['execution', 'tts'])
});

// ==========================================
// Window / Dialog Schemas
// ==========================================
export const WindowZoomSchema = z.object({
  factor: z.number().min(0.25).max(5.0)
});
