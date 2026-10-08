import { describe, expect, it } from 'vitest';
import { detectTech } from '../src/tech.js';

describe('detectTech', () => {
  it('detects JavaScript frameworks from package.json and extensions', () => {
    const pkg = JSON.stringify({ dependencies: { react: '18', next: '14' }, devDependencies: { typescript: '5' } });
    expect(detectTech([{ path: 'package.json', content: pkg }, { path: 'src/page.tsx', content: '' }]).sort()).toEqual(
      ['JavaScript', 'Next.js', 'React', 'TypeScript'].sort(),
    );
  });

  it('detects Python frameworks from requirements.txt', () => {
    expect(detectTech([{ path: 'requirements.txt', content: 'fastapi==0.110\nuvicorn' }])).toEqual(['Python', 'FastAPI']);
  });

  it('tolerates invalid manifests', () => {
    expect(detectTech([{ path: 'package.json', content: '{oops' }])).toEqual(['JavaScript']);
  });
});
