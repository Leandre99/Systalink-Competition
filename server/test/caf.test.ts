import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { testApp } from './helpers.js';

describe('Coupe d’Afrique Francophone (CAF) API', () => {
  it('gerer le cycle complet d’un evenement CAF', async () => {
    const { app } = await testApp();
    const server = app.getHttpServer();

    // 1. Authentification des utilisateurs (awa = senegal, kwame = ghana, jury1 = jury)
    const userAwa = await request(server).post('/auth/dev').send({ login: 'awa' });
    const userKwame = await request(server).post('/auth/dev').send({ login: 'kwame' });
    const userJury = await request(server).post('/auth/dev').send({ login: 'jury1' });

    const tokenAwa = userAwa.body.token as string;
    const tokenKwame = userKwame.body.token as string;
    const tokenJury = userJury.body.token as string;

    // 2. Création d'un événement CAF (Statut initial: brouillon)
    const createEvRes = await request(server)
      .post('/caf/events')
      .set('Authorization', `Bearer ${tokenAwa}`)
      .send({
        title: 'Coupe d’Afrique Francophone 2026',
        theme: 'Inclusion Financière & FinTech Afrique',
        rules: 'Équipes de 2 à 5 développeurs de la sous-région.',
        startDate: '2026-11-01T00:00:00Z',
        endDate: '2026-11-03T00:00:00Z',
        evalCriteria: [
          { key: 'arch', label: 'Architecture', maxScore: 20 },
          { key: 'impact', label: 'Impact Régional', maxScore: 20 },
        ],
      });

    expect(createEvRes.status).toBe(201);
    const eventId = createEvRes.body.id as string;
    expect(createEvRes.body.status).toBe('brouillon');
    expect(createEvRes.body.organizer.login).toBe('awa');

    // 3. Tenter d'accéder au classement en statut brouillon -> Doit retourner 403 Forbidden
    const rankDraftRes = await request(server)
      .get(`/caf/events/${eventId}/results`);
    expect(rankDraftRes.status).toBe(403);
    expect(rankDraftRes.body.message).toMatch(/masqué/i);


    // 4. Passage de l'événement en statut 'inscriptions'
    const statusInscriptionsRes = await request(server)
      .post(`/caf/events/${eventId}/status`)
      .set('Authorization', `Bearer ${tokenAwa}`)
      .send({ status: 'inscriptions' });

    expect(statusInscriptionsRes.status).toBe(200);
    expect(statusInscriptionsRes.body.status).toBe('inscriptions');

    // Tenter d'accéder au classement en inscriptions -> 403 Forbidden
    const rankInscrRes = await request(server)
      .get(`/caf/events/${eventId}/results`);
    expect(rankInscrRes.status).toBe(403);

    // 5. Création d'une équipe régionale par Awa (Sénégal)
    const createTeamRes = await request(server)
      .post(`/caf/events/${eventId}/teams`)
      .set('Authorization', `Bearer ${tokenAwa}`)
      .send({
        name: 'Lions Tech de la Teranga',
        region: 'Afrique de l’Ouest',
      });

    expect(createTeamRes.status).toBe(201);
    const teamId = createTeamRes.body.id as string;
    expect(createTeamRes.body.members).toHaveLength(1);
    expect(createTeamRes.body.members[0].role).toBe('capitaine');

    // 6. Demande de rejoindre l'équipe par Kwame
    const joinReqRes = await request(server)
      .post(`/caf/teams/${teamId}/join`)
      .set('Authorization', `Bearer ${tokenKwame}`)
      .send({ message: 'Je souhaite apporter mon expérience backend Node.js' });

    expect(joinReqRes.status).toBe(201);
    const appId = joinReqRes.body.id as string;

    // Lister les candidatures de l'équipe (Capitaine Awa)
    const listAppsRes = await request(server)
      .get(`/caf/teams/${teamId}/applications`)
      .set('Authorization', `Bearer ${tokenAwa}`);
    expect(listAppsRes.status).toBe(200);
    expect(listAppsRes.body).toHaveLength(1);

    // Accepter la candidature de Kwame par Awa
    const acceptRes = await request(server)
      .post(`/caf/teams/${teamId}/applications/${appId}/respond`)
      .set('Authorization', `Bearer ${tokenAwa}`)
      .send({ status: 'acceptee' });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.status).toBe('acceptee');

    // Vérifier l'équipe mise à jour avec 2 membres
    const teamsListRes = await request(server).get(`/caf/events/${eventId}/teams`);
    expect(teamsListRes.status).toBe(200);
    expect(teamsListRes.body[0].members).toHaveLength(2);

    // 7. Création d'un défi pour l'événement
    const createChallengeRes = await request(server)
      .post(`/caf/events/${eventId}/challenges`)
      .set('Authorization', `Bearer ${tokenAwa}`)
      .send({
        title: 'Défi FinTech : Portefeuille SMS Offline',
        description: 'Construire une solution de transaction par SMS sécurisée.',
        durationHours: 48,
        tech: ['TypeScript', 'Node.js', 'PostgreSQL'],
      });

    expect(createChallengeRes.status).toBe(201);
    const challengeId = createChallengeRes.body.id as string;

    // 8. Démarrage de l'épreuve (passage du statut à 'en_cours')
    await request(server)
      .post(`/caf/events/${eventId}/status`)
      .set('Authorization', `Bearer ${tokenAwa}`)
      .send({ status: 'en_cours' });

    // 9. Soumission du projet par Kwame (membre de l'équipe)
    const createSubRes = await request(server)
      .post(`/caf/challenges/${challengeId}/submissions`)
      .set('Authorization', `Bearer ${tokenKwame}`)
      .send({
        teamId,
        repositoryUrl: 'https://github.com/koradevs/lions-sms-wallet',
        demoUrl: 'https://demo-lions.koradevs.org',
        presentation: 'Notre solution permet des transactions cryptées hors-ligne.',
      });

    expect(createSubRes.status).toBe(201);
    const submissionId = createSubRes.body.id as string;

    // 10. Évaluation du projet par le Jury
    const evalRes = await request(server)
      .post(`/caf/submissions/${submissionId}/evaluations`)
      .set('Authorization', `Bearer ${tokenJury}`)
      .send({
        scores: {
          arch: 18,
          impact: 19,
        },
        comments: 'Excellente architecture et grand impact régional',
      });

    expect(evalRes.status).toBe(201);
    expect(evalRes.body.jury.login).toBe('jury1');
    expect(evalRes.body.scores).toEqual({ arch: 18, impact: 19 });

    // 11. Consultation du classement pendant la compétition ('en_cours') -> Doit fonctionner !
    const rankEnCoursRes = await request(server)
      .get(`/caf/events/${eventId}/results`);

    expect(rankEnCoursRes.status).toBe(200);
    expect(rankEnCoursRes.body).toHaveLength(1);
    expect(rankEnCoursRes.body[0].teamName).toBe('Lions Tech de la Teranga');
    expect(rankEnCoursRes.body[0].totalScore).toBe(37);
    expect(rankEnCoursRes.body[0].rank).toBe(1);

    // 12. Clôture de l'événement ('termine')
    await request(server)
      .post(`/caf/events/${eventId}/status`)
      .set('Authorization', `Bearer ${tokenAwa}`)
      .send({ status: 'termine' });

    // Consultation finale des résultats après la fin de l'événement
    const rankTermineRes = await request(server)
      .get(`/caf/events/${eventId}/results`);

    expect(rankTermineRes.status).toBe(200);
    expect(rankTermineRes.body[0].rank).toBe(1);

    await app.close();
  });
});
