export interface SecretFinding {
  ruleId: string;
  label: string;
  line: number;
}

export interface MaskResult {
  text: string;
  findings: SecretFinding[];
}

type Groups = Record<string, string | undefined>;

interface SecretRule {
  id: string;
  label: string;
  /** If the pattern has a `secret` named group, only that group is masked (`pre` and `q` are kept). */
  pattern: RegExp;
  skip?: (secret: string, groups: Groups) => boolean;
}

const CODE_REFERENCE = /^(process\.env|os\.environ|import\.meta\.env|env\(|getenv|\$\{|\{\{|%\(|<)/i;
const TYPE_OR_LITERAL = /^(string|number|boolean|any|unknown|undefined|null|none|true|false|str|int|bytes|optional.*)$/i;
const PROPERTY_PATH = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)+$/;
const CAMEL_CASE_NAME = /^[a-z]+[A-Z][A-Za-z]*$/;
/** `KEY=value` with nothing between the key and `=` : .env files, CLI flags. */
const DOTENV_STYLE = /[\w-]=$/;

export const SECRET_RULES: SecretRule[] = [
  {
    id: 'cle-privee',
    label: 'Clé privée',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  },
  { id: 'aws', label: 'Clé AWS', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  {
    id: 'github',
    label: 'Jeton GitHub',
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})/g,
  },
  { id: 'stripe', label: 'Clé Stripe', pattern: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { id: 'ia', label: "Clé d'API IA", pattern: /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/g },
  { id: 'slack', label: 'Jeton Slack', pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { id: 'google', label: 'Clé Google', pattern: /\bAIza[0-9A-Za-z_-]{35}/g },
  {
    id: 'jwt',
    label: 'Jeton JWT',
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  },
  {
    id: 'url',
    label: 'Mot de passe dans une URL',
    pattern: /(?<pre>\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:)(?<secret>[^\s@/]+)(?=@)/gi,
  },
  {
    id: 'autorisation',
    label: "Jeton d'autorisation",
    pattern: /(?<pre>\b(?:Bearer|Basic|Token)\s+)(?<secret>[A-Za-z0-9._~+/=-]{16,})/g,
  },
  {
    id: 'affectation',
    label: 'Mot de passe ou clé',
    pattern:
      /(?<pre>\b[\w.-]*?(?:password|passwd|pwd|secret|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|auth[_-]?key|credentials?)["']?\s*[:=]\s*)(?<q>["'`]?)(?<secret>[^\s"'`,;]{4,})/gi,
    skip: (secret, groups) => {
      if (CODE_REFERENCE.test(secret)) return true;
      if (groups.q || DOTENV_STYLE.test(groups.pre ?? '')) return false;
      return (
        TYPE_OR_LITERAL.test(secret) ||
        PROPERTY_PATH.test(secret) ||
        CAMEL_CASE_NAME.test(secret) ||
        /[()[\]{}]/.test(secret)
      );
    },
  },
];

const ENTROPY_TOKEN = /[A-Za-z0-9+_-]{24,}={0,2}/g;
const ENTROPY_THRESHOLD = 4.0;

export function shannonEntropy(value: string): number {
  const counts = new Map<string, number>();
  for (const ch of value) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function looksRandom(token: string): boolean {
  if (!/\d/.test(token) || !/[a-z]/.test(token) || !/[A-Z]/.test(token)) return false;
  return shannonEntropy(token) >= ENTROPY_THRESHOLD;
}

function lineAt(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function placeholder(ruleId: string, original: string): string {
  const newlines = original.split('\n').length - 1;
  return `[MASQUÉ:${ruleId}]` + '\n'.repeat(newlines);
}

function applyRule(text: string, rule: SecretRule, findings: SecretFinding[]): string {
  rule.pattern.lastIndex = 0;
  return text.replace(rule.pattern, (...args: unknown[]) => {
    const match = args[0] as string;
    let last = args.length - 1;
    let groups: Groups | undefined;
    if (typeof args[last] === 'object' && args[last] !== null) {
      groups = args[last] as Groups;
      last--;
    }
    const source = args[last] as string;
    const offset = args[last - 1] as number;
    const secret = groups?.secret ?? match;
    if (rule.skip?.(secret, groups ?? {})) return match;
    findings.push({ ruleId: rule.id, label: rule.label, line: lineAt(source, offset) });
    if (groups?.secret !== undefined) {
      return (groups.pre ?? '') + (groups.q ?? '') + placeholder(rule.id, secret);
    }
    return placeholder(rule.id, match);
  });
}

export function maskSecrets(input: string): MaskResult {
  const findings: SecretFinding[] = [];
  let text = input;
  for (const rule of SECRET_RULES) text = applyRule(text, rule, findings);
  text = applyRule(
    text,
    {
      id: 'entropie',
      label: 'Chaîne aléatoire (clé probable)',
      pattern: ENTROPY_TOKEN,
      skip: (token) => !looksRandom(token),
    },
    findings,
  );
  findings.sort((a, b) => a.line - b.line);
  return { text, findings };
}

export function summarizeFindings(findings: SecretFinding[]): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const f of findings) summary[f.label] = (summary[f.label] ?? 0) + 1;
  return summary;
}
