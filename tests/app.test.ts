import { describe, it, expect } from 'vitest';
import { maskSecrets, CreateHelpRequestSchema, HelpRequestSchema } from '../shared/index.js';
import { db } from '../server/db.js';

describe('KoraDevs + CodeFlash Core Logic Tests', () => {
  it('masque les secrets (API keys, passwords, JWT) dans le code', () => {
    const rawCode = `
      const apiKey = "api_key_secret_12345";
      const jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const dbUrl = "postgres://admin:password123@localhost:5432/mydb";
    `;

    const { maskedText, secretsCount } = maskSecrets(rawCode);

    expect(secretsCount).toBeGreaterThanOrEqual(2);
    expect(maskedText).toContain('***[SECRET MASQUÉ POUR SÉCURITÉ]***');
    expect(maskedText).not.toContain('api_key_secret_12345');
    expect(maskedText).not.toContain('password123');
  });

  it('valide correctement les demandes d entraide avec Zod', () => {
    const validData = {
      title: 'Erreur CORS sur API Express avec React Vite',
      description: 'Le navigateur affiche "Blocked by CORS policy" lors du POST.',
      code: 'fetch("/api/data")',
      stackTag: 'React',
      requesterId: 'user-koffi',
      requesterName: 'Koffi Mensah',
    };

    const result = CreateHelpRequestSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('crée et réinitialise correctement les données de démo', () => {
    db.resetToDemo();
    const users = db.getUsers();
    expect(users.length).toBeGreaterThanOrEqual(3);

    const koffi = users.find((u) => u.id === 'user-koffi');
    expect(koffi).toBeDefined();
    expect(koffi?.name).toBe('Koffi Mensah');
  });

  it('génère un Passeport certifié avec des preuves d entraide', () => {
    const passport = db.getPassport('user-koffi');
    expect(passport).toBeDefined();
    expect(passport?.userName).toBe('Koffi Mensah');
    expect(passport?.signatureHash).toContain('SIG-KORADEVS-2026');
  });
});
