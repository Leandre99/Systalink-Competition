import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { testApp } from './helpers.js';

describe('vitrine de projets et candidatures', () => {
  let ctx: Awaited<ReturnType<typeof testApp>>;

  beforeEach(async () => {
    ctx = await testApp();
  });

  afterEach(async () => {
    await ctx.app.close();
  });

  it('allows a user to create, update, publish/unpublish and delete a project', async () => {
    const http = () => request(ctx.app.getHttpServer());
    const userRes = await http().post('/auth/dev').send({ login: 'alice' }).expect(200);
    const token = userRes.body.token as string;

    // 1. Create project
    const createRes = await http()
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'KoraDevs Monorepo',
        description: 'Une plateforme communautaire pour les devs',
        tech: ['TypeScript', 'React', 'NestJS'],
        repositoryUrl: 'https://github.com/axel12809/Koradevs',
        rolesNeeded: ['Frontend Dev', 'DevOps'],
        status: 'ouvert',
        published: true,
      })
      .expect(201);

    const projectId = createRes.body.id as string;
    expect(createRes.body.name).toBe('KoraDevs Monorepo');
    expect(createRes.body.author.login).toBe('alice');

    // 2. Update project
    const updateRes = await http()
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'KoraDevs 2.0',
        description: 'Platforme améliorée',
      })
      .expect(200);

    expect(updateRes.body.name).toBe('KoraDevs 2.0');

    // 3. Unpublish project (retirer)
    const unpublishRes = await http()
      .post(`/projects/${projectId}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .send({ published: false })
      .expect(200);

    expect(unpublishRes.body.published).toBe(false);

    // 4. Check that unpublished project is invisible in public list for other users
    const publicList = await http().get('/projects').expect(200);
    expect(publicList.body.find((p: any) => p.id === projectId)).toBeUndefined();

    // 5. Creator can still see their own unpublished project
    const ownerList = await http().get('/projects').set('Authorization', `Bearer ${token}`).expect(200);
    expect(ownerList.body.find((p: any) => p.id === projectId)).toBeDefined();

    // 6. Delete project
    await http().delete(`/projects/${projectId}`).set('Authorization', `Bearer ${token}`).expect(204);

    // 7. Verify deletion
    await http().get(`/projects/${projectId}`).expect(404);
  });

  it('enforces permissions: non-owner cannot modify or delete project', async () => {
    const http = () => request(ctx.app.getHttpServer());
    const ownerRes = await http().post('/auth/dev').send({ login: 'owner' }).expect(200);
    const intruderRes = await http().post('/auth/dev').send({ login: 'intruder' }).expect(200);

    const ownerToken = ownerRes.body.token as string;
    const intruderToken = intruderRes.body.token as string;

    const createRes = await http()
      .post('/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Projet Secret',
        description: 'Un super projet en cours',
        tech: ['Go'],
        rolesNeeded: ['Architecte'],
        status: 'ouvert',
        published: true,
      })
      .expect(201);

    const projectId = createRes.body.id as string;

    // Intruder trying to modify owner project
    await http()
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({ name: 'Hacked' })
      .expect(403);

    // Intruder trying to publish/unpublish
    await http()
      .post(`/projects/${projectId}/publish`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({ published: false })
      .expect(403);

    // Intruder trying to delete
    await http().delete(`/projects/${projectId}`).set('Authorization', `Bearer ${intruderToken}`).expect(403);
  });

  it('manages join applications (owner accept/refuse) and minimal task board permissions (owner/member/visitor)', async () => {
    const http = () => request(ctx.app.getHttpServer());
    const ownerRes = await http().post('/auth/dev').send({ login: 'owner' }).expect(200);
    const memberRes = await http().post('/auth/dev').send({ login: 'accepted-member' }).expect(200);
    const visitorRes = await http().post('/auth/dev').send({ login: 'visitor' }).expect(200);

    const ownerToken = ownerRes.body.token as string;
    const memberToken = memberRes.body.token as string;
    const visitorToken = visitorRes.body.token as string;

    // 1. Owner creates a project
    const projectRes = await http()
      .post('/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Collaborative Project',
        description: 'Projet pour tester les candidatures et tâches',
        tech: ['React', 'Node.js'],
        rolesNeeded: ['Fullstack Dev'],
        status: 'ouvert',
        published: true,
      })
      .expect(201);

    const projectId = projectRes.body.id as string;

    // 2. Candidate sends a join request
    const joinRes = await http()
      .post(`/projects/${projectId}/join`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ message: 'Je veux être développeur Fullstack' })
      .expect(200);

    expect(joinRes.body.status).toBe('en_attente');
    const appId = joinRes.body.id as string;

    // 3. Visitor / Non-accepted member attempts to access tasks -> 403 Forbidden
    await http().get(`/projects/${projectId}/tasks`).set('Authorization', `Bearer ${memberToken}`).expect(403);
    await http().get(`/projects/${projectId}/tasks`).set('Authorization', `Bearer ${visitorToken}`).expect(403);

    // 4. Owner lists applications
    const appsRes = await http().get(`/projects/${projectId}/applications`).set('Authorization', `Bearer ${ownerToken}`).expect(200);
    expect(appsRes.body).toHaveLength(1);
    expect(appsRes.body[0].applicant.login).toBe('accepted-member');

    // 5. Owner accepts the candidate
    const respondRes = await http()
      .post(`/projects/${projectId}/applications/${appId}/respond`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'acceptee' })
      .expect(200);

    expect(respondRes.body.status).toBe('acceptee');

    // 6. Accepted member checks their application status
    const myAppRes = await http().get(`/projects/${projectId}/my-application`).set('Authorization', `Bearer ${memberToken}`).expect(200);
    expect(myAppRes.body.status).toBe('acceptee');

    // 7. Accepted member accesses tasks and creates a task
    const memberTasksBefore = await http().get(`/projects/${projectId}/tasks`).set('Authorization', `Bearer ${memberToken}`).expect(200);
    expect(memberTasksBefore.body).toEqual([]);

    const createTaskRes = await http()
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Créer les composants de base' })
      .expect(201);

    expect(createTaskRes.body.title).toBe('Créer les composants de base');
    expect(createTaskRes.body.status).toBe('a_faire');
    const taskId = createTaskRes.body.id as string;

    // 8. Accepted member updates task status
    const updateTaskRes = await http()
      .patch(`/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'en_cours' })
      .expect(200);

    expect(updateTaskRes.body.status).toBe('en_cours');

    // 9. Owner views task board and sees the task
    const ownerTasksRes = await http().get(`/projects/${projectId}/tasks`).set('Authorization', `Bearer ${ownerToken}`).expect(200);
    expect(ownerTasksRes.body).toHaveLength(1);
    expect(ownerTasksRes.body[0].title).toBe('Créer les composants de base');

    // 10. Visitor still receives 403 Forbidden on task board access or modification
    await http().get(`/projects/${projectId}/tasks`).set('Authorization', `Bearer ${visitorToken}`).expect(403);
    await http().post(`/projects/${projectId}/tasks`).set('Authorization', `Bearer ${visitorToken}`).send({ title: 'Hacked task' }).expect(403);
  });
});
