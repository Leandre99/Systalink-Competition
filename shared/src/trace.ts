export interface FileRef {
  path: string;
  line?: number;
}

const EXT = String.raw`\.[A-Za-z][A-Za-z0-9]{0,5}`;
const SEGMENT = String.raw`[\w@.+-]+`;

const TRACE_PATTERNS: RegExp[] = [
  // Python : File "/app/main.py", line 12
  /File "([^"]+)", line (\d+)/g,
  // Node, Deno, Go, Rust, gcc… : /app/src/index.ts:12:5  ou  src/index.ts:12
  new RegExp(
    String.raw`(?<![\w:/\\.])(?:file:\/\/)?((?:[A-Za-z]:[\\/]|\.{0,2}[\\/])?(?:${SEGMENT}[\\/])*[\w@.+-]*${EXT}):(\d+)(?::\d+)?`,
    'g',
  ),
  // TypeScript (tsc) : src/index.ts(12,5)
  new RegExp(String.raw`((?:${SEGMENT}[\\/])*${SEGMENT}${EXT})\((\d+),\d+\)`, 'g'),
];

/** Extracts the file paths (and line numbers) mentioned in an error output, in order of appearance. */
export function extractFileRefs(output: string): FileRef[] {
  const found: { index: number; ref: FileRef }[] = [];
  for (const pattern of TRACE_PATTERNS) {
    pattern.lastIndex = 0;
    for (const m of output.matchAll(pattern)) {
      const path = m[1];
      if (!path || path.startsWith('node:') || /^https?:/i.test(path)) continue;
      const line = m[2] ? Number(m[2]) : undefined;
      found.push({ index: m.index ?? 0, ref: { path, line } });
    }
  }
  found.sort((a, b) => a.index - b.index);
  const seen = new Set<string>();
  const refs: FileRef[] = [];
  for (const { ref } of found) {
    if (seen.has(ref.path)) continue;
    seen.add(ref.path);
    refs.push(ref);
  }
  return refs;
}

const ERROR_LINE = /\b\w*(?:Error|Exception)\b|^(?:error|erreur|fatal|panic)\b/i;

/** The most telling line of an error output, used for alerts and to search solutions. */
export function errorSummary(output: string, max = 200): string {
  const lines = output
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^at\s/.test(l) && !/^File "/.test(l) && !/^Traceback \(most recent/.test(l));
  const line = lines.find((l) => ERROR_LINE.test(l)) ?? lines[lines.length - 1] ?? '';
  return line.length > max ? line.slice(0, max - 1) + '…' : line;
}
