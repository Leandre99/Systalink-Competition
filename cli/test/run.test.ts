import { describe, expect, it } from 'vitest';
import { runCommand, stripAnsi } from '../src/run.js';

describe('runCommand', () => {
  it('captures the output and exit code of a failing command', async () => {
    const result = await runCommand([process.execPath, '-e', 'console.log("hello"); throw new Error("boom")'], process.cwd(), false);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('hello');
    expect(result.output).toContain('Error: boom');
  });

  it('reports unknown commands', async () => {
    const result = await runCommand(['sos-command-that-does-not-exist'], process.cwd(), false);
    expect(result.exitCode).toBe(127);
    expect(result.output).toContain('Commande introuvable');
  });

  it('strips ANSI colors', () => {
    expect(stripAnsi('\x1b[31mrouge\x1b[0m')).toBe('rouge');
  });
});
