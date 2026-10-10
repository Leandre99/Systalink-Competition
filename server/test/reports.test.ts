import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { testApp } from './helpers.js';

describe('signalement et modération (Reports)', () => {
  let ctx: Awaited<ReturnType<typeof testApp>>;

  beforeEach(async () => {
    ctx = await testApp();
  });

  afterEach(async () => {
    await ctx.app.close();
  });

  it('allows any logged in user to submit a report with confirmation', async () => {
    const http = () => request(ctx.app.getHttpServer());
    const aliceRes = await http().post('/auth/dev').send({ login: 'alice' }).expect(200);
    const aliceToken = aliceRes.body.token as string;

    // 1. Unconfirmed report fails with 400 Bad Request
    await http()
      .post('/reports')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        targetType: 'projet',
        targetId: 'proj-123',
        reason: 'pas_clair',
        confirmed: false,
      })
      .expect(400);

    // 2. Confirmed report with valid reason succeeds (201 Created)
    const reportRes = await http()
      .post('/reports')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        targetType: 'projet',
        targetId: 'proj-123',
        reason: 'inapproprie',
        details: 'Description contenant du spam indésirable',
        confirmed: true,
      })
      .expect(201);

    expect(reportRes.body.report).toBeDefined();
    expect(reportRes.body.report.reason).toBe('inapproprie');
    expect(reportRes.body.report.status).toBe('en_attente');
    expect(reportRes.body.report.reporter.login).toBe('alice');
  });

  it('enforces anti-spam limits: duplicate active report and max 5 reports/hour', async () => {
    const http = () => request(ctx.app.getHttpServer());
    const bobRes = await http().post('/auth/dev').send({ login: 'bob' }).expect(200);
    const bobToken = bobRes.body.token as string;

    // First report for target A
    await http()
      .post('/reports')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        targetType: 'fiche_solution',
        targetId: 'fiche-1',
        reason: 'doublon',
        confirmed: true,
      })
      .expect(201);

    // Duplicate active report for same target A -> 400 Bad Request
    await http()
      .post('/reports')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        targetType: 'fiche_solution',
        targetId: 'fiche-1',
        reason: 'pas_clair',
        confirmed: true,
      })
      .expect(400);

    // Submit reports 2, 3, 4, 5 for different targets
    for (let i = 2; i <= 5; i++) {
      await http()
        .post('/reports')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          targetType: 'fiche_solution',
          targetId: `fiche-${i}`,
          reason: 'pas_clair',
          confirmed: true,
        })
        .expect(201);
    }

    // 6th report within 1 hour -> 429 Too Many Requests
    await http()
      .post('/reports')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        targetType: 'fiche_solution',
        targetId: 'fiche-6',
        reason: 'inapproprie',
        confirmed: true,
      })
      .expect(429);
  });

  it('guarantees NO automatic deletion of reported content and NO auto-penalization of users', async () => {
    const http = () => request(ctx.app.getHttpServer());

    // 1. Target user creates a project showcase
    const targetUserRes = await http().post('/auth/dev').send({ login: 'target-user' }).expect(200);
    const targetToken = targetUserRes.body.token as string;

    const projRes = await http()
      .post('/projects')
      .set('Authorization', `Bearer ${targetToken}`)
      .send({
        name: 'Projet Signalé',
        description: 'Ce projet va faire l\'objet d\'un signalement',
        tech: ['React'],
        rolesNeeded: ['Dev'],
        status: 'ouvert',
        published: true,
      })
      .expect(201);

    const projectId = projRes.body.id as string;

    // 2. Reporter user reports the project
    const reporterRes = await http().post('/auth/dev').send({ login: 'reporter-user' }).expect(200);
    const reporterToken = reporterRes.body.token as string;

    await http()
      .post('/reports')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        targetType: 'projet',
        targetId: projectId,
        reason: 'inapproprie',
        details: 'Signalement de test',
        confirmed: true,
      })
      .expect(201);

    // 3. Verify project is NOT deleted and still publicly accessible
    const checkProjRes = await http().get(`/projects/${projectId}`).expect(200);
    expect(checkProjRes.body.name).toBe('Projet Signalé');

    // 4. Verify target user is NOT penalized and can still perform actions
    const meRes = await http().get('/me').set('Authorization', `Bearer ${targetToken}`).expect(200);
    expect(meRes.body.login).toBe('target-user');
  });

  it('restricts moderation endpoints (list & resolve) to human moderators', async () => {
    const http = () => request(ctx.app.getHttpServer());
    const userRes = await http().post('/auth/dev').send({ login: 'user-normal' }).expect(200);
    const userToken = userRes.body.token as string;

    const modRes = await http().post('/auth/dev').send({ login: 'moderateur' }).expect(200);
    const modToken = modRes.body.token as string;

    // Create a report
    const createRes = await http()
      .post('/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        targetType: 'autre',
        targetId: 'target-123',
        reason: 'pas_clair',
        confirmed: true,
      })
      .expect(201);

    const reportId = createRes.body.report.id as string;

    // 1. Regular user receives 403 Forbidden when accessing /reports or /reports/:id/resolve
    await http().get('/reports').set('Authorization', `Bearer ${userToken}`).expect(403);
    await http()
      .post(`/reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'traite' })
      .expect(403);

    // 2. Moderator accesses /reports -> 200 OK
    const listRes = await http().get('/reports').set('Authorization', `Bearer ${modToken}`).expect(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);

    // 3. Moderator resolves the report -> 200 OK
    const resolveRes = await http()
      .post(`/reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${modToken}`)
      .send({ status: 'traite' })
      .expect(200);

    expect(resolveRes.body.report.status).toBe('traite');
  });
});
