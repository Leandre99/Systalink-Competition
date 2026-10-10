import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { SEED_SOLUTIONS } from '../src/solutions/seed.js';
import { testApp } from './helpers.js';

describe('fiches solutions', () => {
  let ctx: Awaited<ReturnType<typeof testApp>>;
  const search = (q: string, tech?: string) => request(ctx.app.getHttpServer()).get('/solutions/search').query({ q, ...(tech ? { tech } : {}) });

  beforeEach(async () => {
    ctx = await testApp();
    await ctx.store.seedSolutions(SEED_SOLUTIONS);
  });
  afterEach(async () => {
    await ctx.app.close();
  });

  it('finds the sheet matching an error, without login', async () => {
    const res = await search("TypeError: Cannot read properties of undefined (reading 'toUpperCase')", 'JavaScript').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ title: expect.stringContaining('Cannot read properties of undefined'), tech: expect.arrayContaining(['JavaScript']) });
    expect(res.body[0].score).toBeGreaterThan(0.8);
  });

  it('matches other common errors and ignores unrelated ones', async () => {
    expect((await search("ModuleNotFoundError: No module named 'flask'").expect(200)).body[0].title).toContain('ModuleNotFoundError');
    expect((await search('Error: listen EADDRINUSE: address already in use :::4000').expect(200)).body[0].title).toContain('EADDRINUSE');
    expect((await search('segmentation fault in libfoo').expect(200)).body).toEqual([]);
  });

  it('validates the query', async () => {
    await search('').expect(400);
    await search('x'.repeat(501)).expect(400);
  });

  it('enforces permissions, double validation, secrets masking and privacy on solution drafts', async () => {
    const http = () => request(ctx.app.getHttpServer());
    const reqRes = await http().post('/auth/dev').send({ login: 'requester' }).expect(200);
    const helpRes = await http().post('/auth/dev').send({ login: 'helper' }).expect(200);
    const intruderRes = await http().post('/auth/dev').send({ login: 'intruder' }).expect(200);

    const tokenReq = reqRes.body.token as string;
    const tokenHelp = helpRes.body.token as string;
    const tokenIntruder = intruderRes.body.token as string;

    const createdReq = await http().post('/requests').set('Authorization', `Bearer ${tokenReq}`).send({
      version: 1,
      command: 'npm run test',
      exitCode: 1,
      output: 'Error: secret AKIA1234567890ABCDEF in app',
      tech: ['JavaScript'],
      env: { os: 'Linux', arch: 'x64', node: 'v20.0.0' },
      files: [],
      secretsMasked: 1,
      createdAt: new Date().toISOString(),
    }).expect(201);

    const reqId = createdReq.body.id as string;
    await ctx.store.acceptRequest(reqId, helpRes.body.user.id, ctx.clock.now);
    await ctx.store.createSolutionDraft({
      id: reqId,
      requestId: reqId,
      title: 'Erreur AKIA1234567890ABCDEF dans app',
      error: 'Error: secret AKIA1234567890ABCDEF in app',
      cause: 'Clé AWS sk-1234567890abcdef123456 exposée',
      fix: 'Utiliser process.env',
      tech: ['JavaScript'],
    });

    // 1. Un intrus ne peut pas lire ni modifier le brouillon (403)
    await http().get(`/solutions/drafts/${reqId}`).set('Authorization', `Bearer ${tokenIntruder}`).expect(403);
    await http().post(`/solutions/drafts/${reqId}/update`).set('Authorization', `Bearer ${tokenIntruder}`).send({ cause: 'hack' }).expect(403);

    // 2. La fiche reste privée avant la double validation
    const searchBefore = await search('AKIA1234567890ABCDEF', 'JavaScript').expect(200);
    expect(searchBefore.body.some((s: any) => s.id === reqId)).toBe(false);

    // 3. Les secrets sont masqués automatiquement dans le brouillon
    const draft = await http().get(`/solutions/drafts/${reqId}`).set('Authorization', `Bearer ${tokenReq}`).expect(200);
    expect(draft.body.error).not.toContain('AKIA1234567890ABCDEF');
    expect(draft.body.error).toContain('[MASQUÉ:aws]');

    // 4. Seule la double validation (requester ET helper) publie la fiche
    await http().post(`/solutions/drafts/${reqId}/approve`).set('Authorization', `Bearer ${tokenReq}`).expect(200);
    const draftAfterOne = await http().get(`/solutions/drafts/${reqId}`).set('Authorization', `Bearer ${tokenReq}`).expect(200);
    expect(draftAfterOne.body.published).toBe(false);

    await http().post(`/solutions/drafts/${reqId}/approve`).set('Authorization', `Bearer ${tokenHelp}`).expect(200);
    const draftAfterBoth = await http().get(`/solutions/drafts/${reqId}`).set('Authorization', `Bearer ${tokenReq}`).expect(200);
    expect(draftAfterBoth.body.published).toBe(true);
  });
});
