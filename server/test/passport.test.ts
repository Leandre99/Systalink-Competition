import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { testApp } from './helpers.js';

describe('Passeport développeur, preuves, partage et confidentialité', () => {
  let ctx: Awaited<ReturnType<typeof testApp>>;

  beforeEach(async () => {
    ctx = await testApp();
  });

  afterEach(async () => {
    await ctx.app.close();
  });

  it('generates clickable proofs with SHA-256 proof hash on confirmed help sessions', async () => {
    const http = () => request(ctx.app.getHttpServer());

    // 1. Create requester and helper users
    const requesterRes = await http().post('/auth/dev').send({ login: 'requester-dev' }).expect(200);
    const helperRes = await http().post('/auth/dev').send({ login: 'helper-dev' }).expect(200);

    const requesterToken = requesterRes.body.token as string;
    const helperToken = helperRes.body.token as string;
    const helperUser = helperRes.body.user;

    // 2. Requester creates SOS request
    const createReq = await http()
      .post('/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        version: 1,
        command: 'npm test',
        exitCode: 1,
        output: 'Error: Connection timeout to database',
        tech: ['TypeScript', 'Node.js'],
        env: { os: 'Linux', arch: 'x64', node: 'v20.0.0' },
        files: [],
        secretsMasked: 0,
        createdAt: new Date().toISOString(),
      })
      .expect(201);

    const requestId = createReq.body.id as string;

    // 3. Helper accepts and resolves the request ("Test confirmé")
    await ctx.store.acceptRequest(requestId, helperUser.id, ctx.clock.now);
    await ctx.store.resolveRequest(requestId, helperUser.id, ctx.clock.now);

    // 4. Helper fetches private passport
    const passportRes = await http().get('/me/passport').set('Authorization', `Bearer ${helperToken}`).expect(200);

    expect(passportRes.body.helpsConfirmed).toBe(1);
    expect(passportRes.body.hasConfirmedBadge).toBe(true);
    expect(passportRes.body.points).toBe(10);
    expect(passportRes.body.proofs).toHaveLength(1);

    const proof = passportRes.body.proofs[0];
    expect(proof.requestId).toBe(requestId);
    expect(proof.proofHash).toBeDefined();
    expect(proof.proofHash.length).toBe(64); // Full 64-char SHA-256 hex hash
    expect(proof.revoked).toBe(false);
  });

  it('allows unauthenticated access to public passport without leaking sensitive data', async () => {
    const http = () => request(ctx.app.getHttpServer());

    // 1. Create users
    const requesterRes = await http().post('/auth/dev').send({ login: 'client-user' }).expect(200);
    const helperRes = await http().post('/auth/dev').send({ login: 'public-expert' }).expect(200);

    const helperUser = helperRes.body.user;

    const reqRes = await http()
      .post('/requests')
      .set('Authorization', `Bearer ${requesterRes.body.token}`)
      .send({
        version: 1,
        command: 'pytest',
        exitCode: 1,
        output: 'AssertionError in test_api.py',
        tech: ['Python', 'pytest'],
        env: { os: 'Linux', arch: 'x64', node: 'v20.0.0' },
        files: [],
        secretsMasked: 0,
        createdAt: new Date().toISOString(),
      })
      .expect(201);

    await ctx.store.acceptRequest(reqRes.body.id, helperUser.id, ctx.clock.now);
    await ctx.store.resolveRequest(reqRes.body.id, helperUser.id, ctx.clock.now);

    // 2. Fetch public passport WITHOUT Authorization header
    const publicRes = await http().get('/passport/public/public-expert').expect(200);

    expect(publicRes.body.user.login).toBe('public-expert');
    expect(publicRes.body.helpsConfirmed).toBe(1);
    expect(publicRes.body.hasConfirmedBadge).toBe(true);
    expect(publicRes.body.proofs).toHaveLength(1);

    // Verify confidentiality: NO sensitive token or private user data returned
    expect(publicRes.body.token).toBeUndefined();
    expect(publicRes.body.session).toBeUndefined();
    expect(publicRes.body.user.providerId).toBeUndefined();
  });

  it('allows proof revocation and ensures revoked proofs do not appear in the public passport', async () => {
    const http = () => request(ctx.app.getHttpServer());

    const requesterRes = await http().post('/auth/dev').send({ login: 'req-user' }).expect(200);
    const helperRes = await http().post('/auth/dev').send({ login: 'helper-privacy' }).expect(200);

    const helperToken = helperRes.body.token as string;
    const helperUser = helperRes.body.user;

    const reqRes = await http()
      .post('/requests')
      .set('Authorization', `Bearer ${requesterRes.body.token}`)
      .send({
        version: 1,
        command: 'cargo test',
        exitCode: 1,
        output: 'Rust compile error',
        tech: ['Rust'],
        env: { os: 'Linux', arch: 'x64', node: 'v20.0.0' },
        files: [],
        secretsMasked: 0,
        createdAt: new Date().toISOString(),
      })
      .expect(201);

    const requestId = reqRes.body.id as string;
    await ctx.store.acceptRequest(requestId, helperUser.id, ctx.clock.now);
    await ctx.store.resolveRequest(requestId, helperUser.id, ctx.clock.now);

    // 1. Initial private passport has 1 active proof
    const initialPrivate = await http().get('/me/passport').set('Authorization', `Bearer ${helperToken}`).expect(200);
    const proofId = initialPrivate.body.proofs[0].id as string;
    expect(initialPrivate.body.proofs[0].revoked).toBe(false);

    // 2. Helper revokes the proof
    await http()
      .post(`/me/passport/proofs/${proofId}/revoke`)
      .set('Authorization', `Bearer ${helperToken}`)
      .send({ revoked: true })
      .expect(200);

    // 3. Helper private passport shows revoked proof with revoked: true
    const updatedPrivate = await http().get('/me/passport').set('Authorization', `Bearer ${helperToken}`).expect(200);
    expect(updatedPrivate.body.proofs[0].revoked).toBe(true);

    // 4. Public passport link strictly EXCLUDES the revoked proof
    const publicRes = await http().get('/passport/public/helper-privacy').expect(200);
    expect(publicRes.body.helpsConfirmed).toBe(0);
    expect(publicRes.body.hasConfirmedBadge).toBe(false);
    expect(publicRes.body.proofs).toHaveLength(0);
  });

  it('prevents non-owners from revoking someone else’s passport proofs', async () => {
    const http = () => request(ctx.app.getHttpServer());

    const ownerRes = await http().post('/auth/dev').send({ login: 'proof-owner' }).expect(200);
    const intruderRes = await http().post('/auth/dev').send({ login: 'intruder' }).expect(200);

    const ownerToken = ownerRes.body.token as string;
    const ownerUser = ownerRes.body.user;
    const intruderToken = intruderRes.body.token as string;

    const reqRes = await http()
      .post('/requests')
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({
        version: 1,
        command: 'go test',
        exitCode: 1,
        output: 'Go error',
        tech: ['Go'],
        env: { os: 'Linux', arch: 'x64', node: 'v20.0.0' },
        files: [],
        secretsMasked: 0,
        createdAt: new Date().toISOString(),
      })
      .expect(201);

    await ctx.store.acceptRequest(reqRes.body.id, ownerUser.id, ctx.clock.now);
    await ctx.store.resolveRequest(reqRes.body.id, ownerUser.id, ctx.clock.now);

    const ownerPassport = await http().get('/me/passport').set('Authorization', `Bearer ${ownerToken}`).expect(200);
    const proofId = ownerPassport.body.proofs[0].id as string;

    // Intruder attempting to revoke owner proof -> 404 Not Found
    await http()
      .post(`/me/passport/proofs/${proofId}/revoke`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({ revoked: true })
      .expect(404);
  });
});
