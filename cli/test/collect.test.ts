import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildRequest, withoutFiles } from '../src/build.js';
import { collectFiles, findProjectRoot } from '../src/collect.js';

let root: string;

function write(rel: string, content: string | Buffer) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

beforeEach(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sos-test-')));
  write('package.json', JSON.stringify({ name: 'demo', dependencies: { express: '4' } }));
  write('.gitignore', 'generated/\n');
  write('.env', 'DB_PASSWORD=supersecret1\n');
  write('src/app.js', 'const API_KEY = "abc-123-xyz";\nmodule.exports = () => user.name;\n');
  write('generated/out.js', 'x');
  write('logo.png', Buffer.from([0x89, 0x50, 0, 0, 1]));
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const trace = (files: string[]) => files.map((f, i) => `    at fn (${f}:${i + 2}:5)`).join('\n');

describe('collectFiles', () => {
  it('finds the project root from a subfolder', () => {
    expect(findProjectRoot(path.join(root, 'src'))).toBe(root);
  });

  it('collects files from the trace and dependency files, never sensitive ones', () => {
    const output = trace([path.join(root, 'src/app.js'), path.join(root, '.env'), path.join(root, 'node_modules/x/i.js')]);
    const { files, skipped } = collectFiles({ output, cwd: path.join(root, 'src') });
    expect(files.map((f) => [f.path, f.reason, f.line])).toEqual([
      ['src/app.js', 'trace', 2],
      ['package.json', 'dependances', undefined],
    ]);
    expect(skipped).toEqual([{ path: '.env', reason: 'fichier sensible, jamais envoyé' }]);
  });

  it('honours --add but still refuses sensitive, binary and outside files', () => {
    const { files, skipped } = collectFiles({
      output: '',
      cwd: root,
      extra: ['generated/out.js', '.env', 'logo.png', '../outside.txt', 'missing.ts'],
    });
    expect(files.map((f) => f.path)).toEqual(['generated/out.js', 'package.json']);
    expect(skipped.map((s) => s.reason)).toEqual([
      'fichier sensible, jamais envoyé',
      'fichier binaire',
      'hors du projet',
      'fichier introuvable',
    ]);
  });

  it('skips gitignored files found in the trace', () => {
    const { skipped } = collectFiles({ output: trace([path.join(root, 'generated/out.js')]), cwd: root });
    expect(skipped).toEqual([{ path: 'generated/out.js', reason: 'ignoré par .gitignore' }]);
  });

  it('enforces the file count limit', () => {
    const many = Array.from({ length: 12 }, (_, i) => `src/f${i}.js`);
    many.forEach((f) => write(f, '// ok'));
    const { files, skipped } = collectFiles({ output: trace(many.map((f) => path.join(root, f))), cwd: root });
    expect(files).toHaveLength(10);
    expect(skipped.filter((s) => s.reason.startsWith('limite')).length).toBe(3);
  });
});

describe('buildRequest', () => {
  it('masks secrets in output, files and command, and detects the tech', () => {
    const { files } = collectFiles({ output: trace([path.join(root, 'src/app.js')]), cwd: root });
    const { request, findings } = buildRequest({
      command: ['node', 'src/app.js', '--token=abcdef123456'],
      exitCode: 1,
      output: 'Connexion à postgres://admin:s3cr3t@db:5432/app\n' + trace([path.join(root, 'src/app.js')]),
      files,
      root,
    });
    const serialized = JSON.stringify(request);
    expect(serialized).not.toContain('s3cr3t');
    expect(serialized).not.toContain('abc-123-xyz');
    expect(serialized).not.toContain('abcdef123456');
    expect(request.output).not.toContain(root);
    expect(request.output).toContain('at fn (<projet>/src/app.js:2:5)');
    expect(request.files[0]!.secretsMasked).toBe(1);
    expect(request.secretsMasked).toBe(findings.length);
    expect(findings).toHaveLength(3);
    expect(request.tech).toEqual(expect.arrayContaining(['JavaScript', 'Express']));

    const reduced = withoutFiles({ request, findings }, new Set(['src/app.js']));
    expect(reduced.request.files.map((f) => f.path)).toEqual(['package.json']);
    expect(reduced.request.secretsMasked).toBe(request.secretsMasked - 1);
  });
});
