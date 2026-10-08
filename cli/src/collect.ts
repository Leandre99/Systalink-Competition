import fs from 'node:fs';
import path from 'node:path';
import ignoreModule, { type Ignore } from 'ignore';
import { extractFileRefs, LIMITS, SENSITIVE_PATTERNS, type SosFile } from '@sos/shared';

// `ignore` is CommonJS: under NodeNext the callable factory is exposed as `.default`.
const ignore = ignoreModule.default;

const ROOT_MARKERS = ['.git', 'package.json', 'pyproject.toml', 'requirements.txt', 'go.mod', 'Cargo.toml', 'composer.json', 'pom.xml', 'Gemfile'];

export const DEPENDENCY_FILES = [
  'package.json',
  'tsconfig.json',
  'requirements.txt',
  'pyproject.toml',
  'Pipfile',
  'go.mod',
  'Cargo.toml',
  'composer.json',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'Gemfile',
  'pubspec.yaml',
];

export { SENSITIVE_PATTERNS };

const NOISE_PATTERNS = ['node_modules/', '.git/', 'dist/', 'build/', '.next/', '__pycache__/', '.venv/', 'venv/', 'vendor/'];

export type CollectedFile = Omit<SosFile, 'secretsMasked'>;

export interface SkippedFile {
  path: string;
  reason: string;
}

export interface CollectResult {
  root: string;
  files: CollectedFile[];
  skipped: SkippedFile[];
}

export function findProjectRoot(start: string): string {
  let dir = path.resolve(start);
  for (;;) {
    if (ROOT_MARKERS.some((marker) => fs.existsSync(path.join(dir, marker)))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

function loadGitignore(root: string): Ignore {
  const ig = ignore();
  const file = path.join(root, '.gitignore');
  if (fs.existsSync(file)) ig.add(fs.readFileSync(file, 'utf8'));
  return ig;
}

function isBinary(buffer: Buffer): boolean {
  return buffer.subarray(0, 8000).includes(0);
}

interface Candidate {
  abs: string;
  reason: SosFile['reason'];
  line?: number;
}

export function collectFiles(options: { output: string; cwd: string; extra?: string[] }): CollectResult {
  const cwd = path.resolve(options.cwd);
  const root = findProjectRoot(cwd);
  const sensitive = ignore().add(SENSITIVE_PATTERNS);
  const noise = ignore().add(NOISE_PATTERNS);
  const gitignore = loadGitignore(root);

  const candidates: Candidate[] = [
    ...extractFileRefs(options.output).map((ref) => ({
      abs: path.resolve(cwd, ref.path),
      reason: 'trace' as const,
      line: ref.line,
    })),
    ...(options.extra ?? []).map((p) => ({ abs: path.resolve(cwd, p), reason: 'ajout' as const })),
    ...DEPENDENCY_FILES.map((name) => ({ abs: path.join(root, name), reason: 'dependances' as const })),
  ];

  const files: CollectedFile[] = [];
  const skipped: SkippedFile[] = [];
  const seen = new Set<string>();
  let totalBytes = 0;

  for (const candidate of candidates) {
    const explicit = candidate.reason === 'ajout';
    const rel = path.relative(root, candidate.abs).split(path.sep).join('/');
    if (seen.has(rel)) continue;
    seen.add(rel);

    if (!rel || rel.startsWith('../') || rel === '..' || path.isAbsolute(rel)) {
      if (explicit) skipped.push({ path: candidate.abs, reason: 'hors du projet' });
      continue;
    }
    let stat: fs.Stats | undefined;
    try {
      stat = fs.statSync(candidate.abs);
    } catch {
      stat = undefined;
    }
    if (!stat?.isFile()) {
      if (explicit) skipped.push({ path: rel, reason: 'fichier introuvable' });
      continue;
    }
    if (sensitive.ignores(rel)) {
      skipped.push({ path: rel, reason: 'fichier sensible, jamais envoyé' });
      continue;
    }
    if (noise.ignores(rel)) {
      if (explicit) skipped.push({ path: rel, reason: 'dossier de dépendances ou de build' });
      continue;
    }
    if (!explicit && gitignore.ignores(rel)) {
      skipped.push({ path: rel, reason: 'ignoré par .gitignore' });
      continue;
    }
    const buffer = fs.readFileSync(candidate.abs);
    if (isBinary(buffer)) {
      skipped.push({ path: rel, reason: 'fichier binaire' });
      continue;
    }
    if (files.length >= LIMITS.maxFiles) {
      skipped.push({ path: rel, reason: `limite de ${LIMITS.maxFiles} fichiers atteinte` });
      continue;
    }
    if (totalBytes + buffer.length > LIMITS.maxTotalBytes) {
      skipped.push({ path: rel, reason: `limite de ${LIMITS.maxTotalBytes / 1024} Ko atteinte` });
      continue;
    }
    totalBytes += buffer.length;
    files.push({
      path: rel,
      reason: candidate.reason,
      ...(candidate.line ? { line: candidate.line } : {}),
      size: buffer.length,
      content: buffer.toString('utf8'),
    });
  }

  return { root, files, skipped };
}
