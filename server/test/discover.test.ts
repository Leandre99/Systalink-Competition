import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { SEED_SOLUTIONS } from '../src/solutions/seed.js';
import { testApp } from './helpers.js';

describe('page découvrir', () => {
  let ctx: Awaited<ReturnType<typeof testApp>>;

  beforeEach(async () => {
    ctx = await testApp();
    await ctx.store.seedSolutions(SEED_SOLUTIONS);
  });

  afterEach(async () => {
    await ctx.app.close();
  });

  it('returns published solutions, open requests and available helpers', async () => {
    const http = () => request(ctx.app.getHttpServer());
    const devRes = await http().post('/auth/dev').send({ login: 'requester' }).expect(200);
    const token = devRes.body.token as string;

    // Create an open request
    await http().post('/requests').set('Authorization', `Bearer ${token}`).send({
      version: 1,
      command: 'npm start',
      exitCode: 1,
      output: 'TypeError: Cannot read properties of undefined',
      tech: ['TypeScript', 'React'],
      env: { os: 'Web', arch: 'x64', node: 'v20.0.0' },
      files: [],
      secretsMasked: 0,
      createdAt: new Date().toISOString(),
    }).expect(201);

    const res = await http().get('/discover').expect(200);
    expect(res.body.solutions).toBeDefined();
    expect(res.body.solutions.length).toBeGreaterThan(0);
    expect(res.body.openRequests).toHaveLength(1);
    expect(res.body.openRequests[0].command).toBe('npm start');
    expect(res.body.availableHelpers).toBeDefined();
  });

  it('filters results by technology', async () => {
    const http = () => request(ctx.app.getHttpServer());
    const devRes = await http().post('/auth/dev').send({ login: 'requester' }).expect(200);
    const token = devRes.body.token as string;

    await http().post('/requests').set('Authorization', `Bearer ${token}`).send({
      version: 1,
      command: 'python app.py',
      exitCode: 1,
      output: 'ModuleNotFoundError: No module named flask',
      tech: ['Python'],
      env: { os: 'Web', arch: 'x64', node: 'v20.0.0' },
      files: [],
      secretsMasked: 0,
      createdAt: new Date().toISOString(),
    }).expect(201);

    const resPython = await http().get('/discover?tech=Python').expect(200);
    expect(resPython.body.openRequests.every((r: any) => r.tech.includes('Python'))).toBe(true);

    const resGo = await http().get('/discover?tech=Go').expect(200);
    expect(resGo.body.openRequests).toHaveLength(0);
  });
});
