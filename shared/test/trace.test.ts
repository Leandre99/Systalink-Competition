import { describe, expect, it } from 'vitest';
import { extractFileRefs } from '../src/trace.js';

describe('extractFileRefs', () => {
  it('reads Node.js stack traces', () => {
    const output = `file:///home/a/app/users.js:2
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
    at formatUser (file:///home/a/app/users.js:2:20)
    at /home/a/app/index.js:9:31
    at Module._compile (node:internal/modules/cjs/loader:1256:14)
    at Object.<anonymous> (/home/a/app/node_modules/x/lib.js:4:1)`;
    expect(extractFileRefs(output)).toEqual([
      { path: '/home/a/app/users.js', line: 2 },
      { path: '/home/a/app/index.js', line: 9 },
      { path: '/home/a/app/node_modules/x/lib.js', line: 4 },
    ]);
  });

  it('reads Python tracebacks', () => {
    const output = `Traceback (most recent call last):
  File "/srv/app/main.py", line 12, in <module>
    run()
  File "utils/db.py", line 3, in run`;
    expect(extractFileRefs(output)).toEqual([
      { path: '/srv/app/main.py', line: 12 },
      { path: 'utils/db.py', line: 3 },
    ]);
  });

  it('reads TypeScript compiler errors and relative paths', () => {
    const output = `src/index.ts(4,7): error TS2322: Type 'string' is not assignable to type 'number'.
./lib/math.go:10:2: undefined: foo`;
    expect(extractFileRefs(output)).toEqual([
      { path: 'src/index.ts', line: 4 },
      { path: './lib/math.go', line: 10 },
    ]);
  });

  it('ignores URLs', () => {
    expect(extractFileRefs('see https://example.com/doc.html:80 for help')).toEqual([]);
  });
});
