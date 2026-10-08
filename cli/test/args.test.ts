import { describe, expect, it } from 'vitest';
import { CliError, parseArgs } from '../src/args.js';

describe('parseArgs', () => {
  it('stops reading options at the first command token', () => {
    const args = parseArgs(['--add', 'a.ts', '-y', 'npm', 'run', 'dev', '--port', '3000']);
    expect(args.add).toEqual(['a.ts']);
    expect(args.yes).toBe(true);
    expect(args.command).toEqual(['npm', 'run', 'dev', '--port', '3000']);
  });

  it('supports -- and --add=', () => {
    const args = parseArgs(['--add=b.ts', '--dry-run', '--', '--weird-command']);
    expect(args.add).toEqual(['b.ts']);
    expect(args.dryRun).toBe(true);
    expect(args.command).toEqual(['--weird-command']);
  });

  it('rejects unknown options and missing values', () => {
    expect(() => parseArgs(['--nope'])).toThrow(CliError);
    expect(() => parseArgs(['--add'])).toThrow(CliError);
  });
});

describe('subcommands', () => {
  it('parses login options and send file', () => {
    expect(parseArgs(['login', '--dev', 'koffi', '--server', 'http://x:4000'])).toMatchObject({ subcommand: 'login', dev: 'koffi', server: 'http://x:4000' });
    expect(parseArgs(['send', 'a.json'])).toMatchObject({ subcommand: 'send', command: ['a.json'] });
    expect(parseArgs(['whoami']).subcommand).toBe('whoami');
  });

  it('keeps `sos -- login` as a command and rejects bad options', () => {
    expect(parseArgs(['--', 'login']).subcommand).toBeUndefined();
    expect(parseArgs(['--', 'login']).command).toEqual(['login']);
    expect(() => parseArgs(['logout', '--dev', 'x'])).toThrow(CliError);
    expect(() => parseArgs(['login', '--dev'])).toThrow(CliError);
  });
});
