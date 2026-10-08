import os from 'node:os';
import {
  detectTech,
  LIMITS,
  maskSecrets,
  SosRequestSchema,
  summarizeFindings,
  type SecretFinding,
  type SosRequest,
} from '@sos/shared';
import type { CollectedFile } from './collect.js';

export interface BuiltRequest {
  request: SosRequest;
  findings: SecretFinding[];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Hides where the project lives on the user's disk (user name, folder layout). */
export function anonymizePaths(text: string, root: string): string {
  let result = text.replace(new RegExp(escapeRegExp(root.replace(/[\\/]+$/, '')), 'g'), '<projet>');
  const home = os.homedir();
  if (home && home.length > 1) result = result.replace(new RegExp(escapeRegExp(home), 'g'), '~');
  return result;
}

function tailLines(text: string, count: number): string {
  const lines = text.replace(/\s+$/, '').split('\n');
  return lines.slice(-count).join('\n');
}

/** Masks every outgoing piece of text and assembles a validated request. */
export function buildRequest(input: {
  command: string[];
  exitCode: number;
  output: string;
  files: CollectedFile[];
  root: string;
}): BuiltRequest {
  const findings: SecretFinding[] = [];
  const command = maskSecrets(input.command.join(' '));
  findings.push(...command.findings);
  const output = maskSecrets(anonymizePaths(tailLines(input.output, LIMITS.outputLines), input.root));
  findings.push(...output.findings);

  const files = input.files.map((file) => {
    const masked = maskSecrets(file.content);
    findings.push(...masked.findings);
    return { ...file, content: masked.text, secretsMasked: masked.findings.length };
  });

  const request = SosRequestSchema.parse({
    version: 1,
    command: command.text,
    exitCode: input.exitCode,
    output: output.text,
    tech: detectTech(input.files),
    env: { os: `${os.platform()} ${os.release()}`, arch: os.arch(), node: process.version },
    files,
    secretsMasked: findings.length,
    createdAt: new Date().toISOString(),
  });
  return { request, findings };
}

export function withoutFiles(built: BuiltRequest, removedPaths: Set<string>): BuiltRequest {
  const files = built.request.files.filter((f) => !removedPaths.has(f.path));
  const outputSecrets = built.request.secretsMasked - built.request.files.reduce((n, f) => n + f.secretsMasked, 0);
  return {
    findings: built.findings,
    request: {
      ...built.request,
      files,
      secretsMasked: outputSecrets + files.reduce((n, f) => n + f.secretsMasked, 0),
    },
  };
}

export { summarizeFindings };
