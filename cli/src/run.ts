import { spawn } from 'node:child_process';

export interface RunResult {
  exitCode: number;
  output: string;
}

const MAX_CAPTURE_BYTES = 512 * 1024;
const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI, '');
}

/** Runs the command while streaming its output live, and captures the combined stdout/stderr (tail only). */
export function runCommand(command: string[], cwd: string, echo = true): Promise<RunResult> {
  return new Promise((resolve) => {
    let captured = '';
    const capture = (chunk: Buffer, stream: NodeJS.WriteStream) => {
      if (echo) stream.write(chunk);
      captured += chunk.toString('utf8');
      if (captured.length > MAX_CAPTURE_BYTES) captured = captured.slice(-MAX_CAPTURE_BYTES);
    };
    const child = spawn(command[0]!, command.slice(1), {
      cwd,
      shell: process.platform === 'win32',
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? '1' },
    });
    child.stdout.on('data', (chunk: Buffer) => capture(chunk, process.stdout));
    child.stderr.on('data', (chunk: Buffer) => capture(chunk, process.stderr));
    child.on('error', (error: NodeJS.ErrnoException) => {
      const message =
        error.code === 'ENOENT' ? `Commande introuvable : ${command[0]}` : `Impossible de lancer la commande : ${error.message}`;
      resolve({ exitCode: 127, output: stripAnsi(captured) + message + '\n' });
    });
    child.on('close', (code) => resolve({ exitCode: code ?? 1, output: stripAnsi(captured) }));
  });
}
