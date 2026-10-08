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
});
