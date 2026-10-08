import { describe, expect, it } from 'vitest';
import { looksRandom, maskSecrets, summarizeFindings } from '../src/secrets.js';

// Tokens are built at runtime so that secret scanners do not flag this file.
const GITHUB = 'ghp_' + 'a1B2c3D4e5'.repeat(4);
const STRIPE = 'sk_' + 'live_' + 'Zx9Yw8Vu7Ts6Rq5P';

describe('maskSecrets', () => {
  it('masks well-known key formats', () => {
    const input = [`aws=AKIAIOSFODNN7EXAMPLE`, `gh ${GITHUB}`, `stripe ${STRIPE}`].join('\n');
    const { text, findings } = maskSecrets(input);
    expect(text).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(text).not.toContain(GITHUB);
    expect(text).not.toContain(STRIPE);
    expect(findings.map((f) => f.ruleId)).toEqual(['aws', 'github', 'stripe']);
    expect(findings.map((f) => f.line)).toEqual([1, 2, 3]);
  });

  it('masks only the value of password / key assignments', () => {
    const { text } = maskSecrets(
      ['DB_PASSWORD=motdepasse123', 'const API_KEY = "demo_key_value";', '{ "client_secret": "abc-def-ghi" }'].join('\n'),
    );
    expect(text).toBe(
      ['DB_PASSWORD=[MASQUÉ:affectation]', 'const API_KEY = "[MASQUÉ:affectation]";', '{ "client_secret": "[MASQUÉ:affectation]" }'].join('\n'),
    );
  });

  it('masks credentials in URLs and authorization headers', () => {
    const { text } = maskSecrets(
      'postgres://admin:s3cr3t@localhost:5432/app\nAuthorization: Bearer abcdefghijklmnop1234',
    );
    expect(text).toBe('postgres://admin:[MASQUÉ:url]@localhost:5432/app\nAuthorization: Bearer [MASQUÉ:autorisation]');
  });

  it('masks private key blocks and keeps line numbers stable', () => {
    const input = '-----BEGIN RSA PRIVATE KEY-----\nMIIabc\nxyz\n-----END RSA PRIVATE KEY-----\nnext';
    const { text } = maskSecrets(input);
    expect(text.split('\n')).toHaveLength(5);
    expect(text).not.toContain('MIIabc');
    expect(text.split('\n')[4]).toBe('next');
  });

  it('detects random-looking strings by entropy', () => {
    const token = 'Q3vX9kLm2PzR7tYw4NbC8sJd';
    expect(looksRandom(token)).toBe(true);
    expect(maskSecrets(`const x = "${token}"`).text).toBe('const x = "[MASQUÉ:entropie]"');
  });

  it('leaves ordinary code untouched', () => {
    const code = [
      'const password = process.env.DB_PASSWORD;',
      'password: string;',
      'const token = getToken();',
      'token = request.headers.token',
      'commit 3f9a2b7c1d4e5f60718293a4b5c6d7e8f9012345',
      'const maxTokens = 1000;',
      'function ThisIsAVeryLongCamelCaseName() {}',
      'TypeError: Cannot read properties of undefined (reading \'toUpperCase\')',
    ].join('\n');
    expect(maskSecrets(code).text).toBe(code);
  });

  it('summarizes findings by label', () => {
    const { findings } = maskSecrets('PASSWORD=abcd1234\nSECRET=efgh5678\nAKIAIOSFODNN7EXAMPLE');
    expect(summarizeFindings(findings)).toEqual({ 'Mot de passe ou clé': 2, 'Clé AWS': 1 });
  });

  it('is idempotent and counts a secret once', () => {
    const token = `ghp_${'a1B2c3D4e5'.repeat(3)}abcdef`;
    const first = maskSecrets(`const token = '${token}';\nconst url = 'postgres://admin:motdepasse@localhost:5432/app';\n`);
    expect(first.findings.map((f) => f.ruleId)).toEqual(['github', 'url']);
    const second = maskSecrets(first.text);
    expect(second.text).toBe(first.text);
    expect(second.findings).toEqual([]);
  });
});
