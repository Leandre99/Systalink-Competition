import pc from 'picocolors';
import { summarizeFindings, type SecretFinding, type SosRequest } from '@sos/shared';
import type { SkippedFile } from './collect.js';

const REASON_LABEL: Record<string, string> = {
  trace: 'cité dans l’erreur',
  ajout: 'ajouté par toi',
  dependances: 'dépendances',
};

const PREVIEW_OUTPUT_LINES = 25;

export function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} o` : `${(bytes / 1024).toFixed(1)} Ko`;
}

function highlightMasks(text: string): string {
  return text.replace(/\[MASQUÉ:[a-z-]+\]/g, (m) => pc.yellow(m));
}

export function renderPreview(request: SosRequest, skipped: SkippedFile[], findings: SecretFinding[]): string {
  const out: string[] = [];
  const title = ' Aperçu de ce qui sera envoyé ';
  out.push('', pc.bold(pc.red('──' + title + '─'.repeat(Math.max(0, 50 - title.length)))));
  out.push(`${pc.dim('Commande')}  ${request.command} ${pc.dim(`(code de sortie ${request.exitCode})`)}`);
  out.push(`${pc.dim('Techno   ')} ${request.tech.length ? request.tech.join(', ') : pc.dim('non détectée')}`);
  out.push(`${pc.dim('Système  ')} ${request.env.os}, ${request.env.arch}, Node ${request.env.node}`);

  const lines = request.output.split('\n');
  const shown = lines.slice(-PREVIEW_OUTPUT_LINES);
  out.push('', pc.bold(`Erreur`) + pc.dim(` (${shown.length} dernières lignes sur ${lines.length} envoyées)`));
  for (const line of shown) out.push(pc.dim('  │ ') + highlightMasks(line));

  const total = request.files.reduce((n, f) => n + f.size, 0);
  out.push('', pc.bold(`Fichiers (${request.files.length}, ${formatSize(total)})`));
  if (request.files.length === 0) out.push(pc.dim('  aucun'));
  const width = Math.min(40, Math.max(0, ...request.files.map((f) => f.path.length)));
  request.files.forEach((file, i) => {
    const where = file.line ? ` ligne ${file.line}` : '';
    const secrets = file.secretsMasked ? pc.yellow(`  ${file.secretsMasked} secret(s) masqué(s)`) : '';
    out.push(
      `  ${pc.cyan(String(i + 1).padStart(2))}. ${file.path.padEnd(width)}  ${pc.dim(REASON_LABEL[file.reason] + where)}  ${pc.dim(formatSize(file.size))}${secrets}`,
    );
  });

  if (skipped.length) {
    out.push('', pc.bold('Non envoyés'));
    for (const s of skipped) out.push(`  ${pc.red('✗')} ${s.path}  ${pc.dim(s.reason)}`);
  }

  out.push('');
  const summary = Object.entries(summarizeFindings(findings));
  if (summary.length) {
    out.push(
      pc.yellow(`🔒 ${findings.length} secret(s) masqué(s) sur ta machine : `) +
        summary.map(([label, n]) => `${label} ×${n}`).join(', '),
    );
  } else {
    out.push(pc.green('🔒 Aucun secret détecté.') + pc.dim(' Vérifie quand même l’aperçu ci-dessus.'));
  }
  return out.join('\n');
}
