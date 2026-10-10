import { useEffect, useState, type FormEvent } from 'react';
import type {
  CafChallenge,
  CafEvalCriterion,
  CafEvaluation,
  CafEvent,
  CafEventStatus,
  CafSubmission,
  CafTeam,
  CafTeamJoinRequest,
  CafTeamRanking,
  PublicUser,
} from '@sos/shared';
import {
  createCafChallenge,
  createCafEvent,
  createCafSubmission,
  createCafTeam,
  evaluateCafSubmission,
  getCafEvent,
  getCafResults,
  joinCafTeam,
  listCafChallenges,
  listCafEvents,
  listCafSubmissions,
  listCafTeamApplications,
  listCafTeams,
  respondCafTeamApplication,
  updateCafEventStatus,
} from './api.js';

interface CafModuleProps {
  token: string | null;
  user: PublicUser | null;
}

const STATUS_LABELS: Record<CafEventStatus, string> = {
  brouillon: 'Brouillon',
  inscriptions: 'Inscriptions Ouvertes',
  en_cours: 'Épreuves En Cours',
  termine: 'Événement Terminé',
};

const REGIONS = [
  'Afrique de l’Ouest',
  'Afrique Centrale',
  'Afrique du Nord (Maghreb)',
  'Afrique de l’Est',
  'Océan Indien',
  'Inter-Régionale',
];

export function CafModule({ token, user }: CafModuleProps) {
  const [events, setEvents] = useState<CafEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CafEvent | null>(null);
  const [eventTab, setEventTab] = useState<'equipes' | 'defis' | 'soumissions' | 'resultats'>('equipes');

  // Event sub-data
  const [teams, setTeams] = useState<CafTeam[]>([]);
  const [challenges, setChallenges] = useState<CafChallenge[]>([]);
  const [results, setResults] = useState<CafTeamRanking[]>([]);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [subDataLoading, setSubDataLoading] = useState(false);

  // Challenge submissions sub-data
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<CafSubmission[]>([]);

  // Modals state
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [createChallengeOpen, setCreateChallengeOpen] = useState(false);
  const [createSubmissionOpen, setCreateSubmissionOpen] = useState(false);
  const [evaluateSubmission, setEvaluateSubmission] = useState<CafSubmission | null>(null);
  const [joinTeamTarget, setJoinTeamTarget] = useState<CafTeam | null>(null);
  const [viewTeamApps, setViewTeamApps] = useState<CafTeam | null>(null);
  const [teamApps, setTeamApps] = useState<CafTeamJoinRequest[]>([]);

  // Form states
  const [notice, setNotice] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  // New Event form
  const [evTitle, setEvTitle] = useState('');
  const [evTheme, setEvTheme] = useState('');
  const [evRules, setEvRules] = useState('');
  const [evStart, setEvStart] = useState('');
  const [evEnd, setEvEnd] = useState('');
  const [evCriteria] = useState<CafEvalCriterion[]>([
    { key: 'arch', label: 'Code & Architecture', maxScore: 20 },
    { key: 'innovation', label: 'Innovation & Thème', maxScore: 20 },
    { key: 'ux', label: 'Démo & UX', maxScore: 20 },
  ]);

  // New Team form
  const [teamName, setTeamName] = useState('');
  const [teamRegion, setTeamRegion] = useState(REGIONS[0]);

  // Join Team form
  const [joinMsg, setJoinMsg] = useState('Bonjour, je souhaite rejoindre l’équipe pour apporter mes compétences !');

  // New Challenge form
  const [chTitle, setChTitle] = useState('');
  const [chDesc, setChDesc] = useState('');
  const [chDurationHours, setChDurationHours] = useState(48);
  const [chTech, setChTech] = useState('TypeScript, React, Node.js');

  // New Submission form
  const [subTeamId, setSubTeamId] = useState('');
  const [subRepo, setSubRepo] = useState('');
  const [subDemo, setSubDemo] = useState('');
  const [subPres, setSubPres] = useState('');

  // Evaluation form
  const [evalScores, setEvalScores] = useState<Record<string, number>>({});
  const [evalComment, setEvalComment] = useState('');

  // Load event list
  const loadEvents = async () => {
    setLoadingEvents(true);
    setEventsError(null);
    try {
      const list = await listCafEvents(token);
      setEvents(list);
    } catch (err) {
      setEventsError((err as Error).message);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, []);

  // Load detailed event data when event selection changes
  useEffect(() => {
    if (!selectedEventId) {
      setSelectedEvent(null);
      return;
    }
    setSubDataLoading(true);
    setResultsError(null);
    void Promise.all([
      getCafEvent(selectedEventId, token),
      listCafTeams(selectedEventId, token),
      listCafChallenges(selectedEventId, token),
    ])
      .then(([ev, tList, cList]) => {
        setSelectedEvent(ev);
        setTeams(tList);
        setChallenges(cList);
        if (cList.length > 0 && !selectedChallengeId) {
          setSelectedChallengeId(cList[0].id);
        }
      })
      .catch((err) => {
        setEventsError((err as Error).message);
      })
      .finally(() => {
        setSubDataLoading(false);
      });
  }, [selectedEventId]);

  // Load submissions when selected challenge changes
  useEffect(() => {
    if (!selectedChallengeId) {
      setSubmissions([]);
      return;
    }
    void listCafSubmissions(selectedChallengeId, token).then(setSubmissions).catch(() => setSubmissions([]));
  }, [selectedChallengeId]);

  // Load results when tab switched to results
  useEffect(() => {
    if (selectedEventId && eventTab === 'resultats') {
      setResultsError(null);
      void getCafResults(selectedEventId, token)
        .then(setResults)
        .catch((err) => {
          setResults([]);
          setResultsError((err as Error).message);
        });
    }
  }, [selectedEventId, eventTab]);

  const handleCreateEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormErr(null);
    try {
      const newEv = await createCafEvent(token, {
        title: evTitle.trim(),
        theme: evTheme.trim(),
        rules: evRules.trim(),
        startDate: evStart,
        endDate: evEnd,
        evalCriteria: evCriteria,
      });
      setEvents([newEv, ...events]);
      setSelectedEventId(newEv.id);
      setCreateEventOpen(false);
      setNotice('Événement Coupe d’Afrique créé avec succès !');
    } catch (err) {
      setFormErr((err as Error).message);
    }
  };

  const handleStatusChange = async (newStatus: CafEventStatus) => {
    if (!token || !selectedEvent) return;
    try {
      const updated = await updateCafEventStatus(token, selectedEvent.id, newStatus);
      setSelectedEvent(updated);
      setEvents(events.map((e) => (e.id === updated.id ? updated : e)));
      setNotice(`Statut mis à jour : ${STATUS_LABELS[newStatus]}`);
    } catch (err) {
      setNotice(`Erreur : ${(err as Error).message}`);
    }
  };

  const handleCreateTeam = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !selectedEvent) return;
    setFormErr(null);
    try {
      const team = await createCafTeam(token, selectedEvent.id, {
        name: teamName.trim(),
        region: teamRegion,
      });
      setTeams([...teams, team]);
      setCreateTeamOpen(false);
      setTeamName('');
      setNotice(`Équipe "${team.name}" créée ! Vous en êtes le capitaine.`);
    } catch (err) {
      setFormErr((err as Error).message);
    }
  };

  const handleJoinTeam = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !joinTeamTarget) return;
    setFormErr(null);
    try {
      await joinCafTeam(token, joinTeamTarget.id, joinMsg.trim());
      setJoinTeamTarget(null);
      setNotice(`Demande envoyée à l'équipe "${joinTeamTarget.name}".`);
    } catch (err) {
      setFormErr((err as Error).message);
    }
  };

  const handleLoadTeamApps = async (team: CafTeam) => {
    if (!token) return;
    setViewTeamApps(team);
    try {
      const apps = await listCafTeamApplications(token, team.id);
      setTeamApps(apps);
    } catch (err) {
      setNotice((err as Error).message);
    }
  };

  const handleRespondApp = async (teamId: string, appId: string, status: 'acceptee' | 'refusee') => {
    if (!token || !selectedEventId) return;
    try {
      await respondCafTeamApplication(token, teamId, appId, status);
      setTeamApps(teamApps.map((a) => (a.id === appId ? { ...a, status } : a)));
      // Reload teams to get updated members
      const updatedTeams = await listCafTeams(selectedEventId, token);
      setTeams(updatedTeams);
      setNotice(status === 'acceptee' ? 'Membre accepté dans l’équipe !' : 'Candidature refusée.');
    } catch (err) {
      setNotice((err as Error).message);
    }
  };

  const handleCreateChallenge = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !selectedEvent) return;
    setFormErr(null);
    try {
      const ch = await createCafChallenge(token, selectedEvent.id, {
        title: chTitle.trim(),
        description: chDesc.trim(),
        durationHours: Number(chDurationHours),
        tech: chTech.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setChallenges([...challenges, ch]);
      setSelectedChallengeId(ch.id);
      setCreateChallengeOpen(false);
      setChTitle('');
      setChDesc('');
      setNotice(`Défi "${ch.title}" publié avec succès.`);
    } catch (err) {
      setFormErr((err as Error).message);
    }
  };

  const handleCreateSubmission = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !selectedChallengeId) return;
    setFormErr(null);
    try {
      const sub = await createCafSubmission(token, selectedChallengeId, {
        teamId: subTeamId,
        repositoryUrl: subRepo.trim(),
        demoUrl: subDemo.trim(),
        presentation: subPres.trim(),
      });
      setSubmissions([...submissions, sub]);
      setCreateSubmissionOpen(false);
      setSubRepo('');
      setSubDemo('');
      setSubPres('');
      setNotice('Projet soumis avec succès au jury !');
    } catch (err) {
      setFormErr((err as Error).message);
    }
  };

  const handleEvaluateSubmission = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !evaluateSubmission) return;
    setFormErr(null);
    try {
      await evaluateCafSubmission(token, evaluateSubmission.id, {
        scores: evalScores,
        comments: evalComment.trim() || undefined,
      });
      setEvaluateSubmission(null);
      setNotice('Évaluation enregistrée par le jury !');
    } catch (err) {
      setFormErr((err as Error).message);
    }
  };

  return (
    <section>
      {notice && (
        <div className="card success" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>{notice}</span>
          <button className="link" onClick={() => setNotice(null)}>✕</button>
        </div>
      )}

      {/* HEADER / NAVIGATION PRINCIPALE CAF */}
      {!selectedEventId ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>🏆 Coupe d’Afrique Francophone (CAF)</h2>
              <p className="hint" style={{ margin: 0 }}>
                Compétition régionale par équipe sur événements thématiques officiels.
              </p>
            </div>
            {token && (
              <button onClick={() => setCreateEventOpen(true)}>+ Créer un Événement CAF</button>
            )}
          </div>

          {/* EVENTS LIST & STATES */}
          {loadingEvents ? (
            <div className="card"><p className="hint">Chargement des événements de la Coupe d’Afrique...</p></div>
          ) : eventsError ? (
            <div className="card"><p className="error">Erreur : {eventsError}</p></div>
          ) : events.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
              <span style={{ fontSize: '2.5rem' }}>🌍</span>
              <h3>Aucun événement Coupe d’Afrique pour le moment</h3>
              <p className="hint">
                Les organisateurs ouvriront bientôt les inscriptions pour la prochaine édition régionale.
              </p>
            </div>
          ) : (
            <div className="caf-grid">
              {events.map((ev) => (
                <div key={ev.id} className="caf-card">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <span className={`caf-badge ${ev.status}`}>{STATUS_LABELS[ev.status]}</span>
                      <small className="hint">{new Date(ev.startDate).toLocaleDateString()}</small>
                    </div>
                    <h3 style={{ margin: '4px 0 8px', fontSize: '1.15rem' }}>{ev.title}</h3>
                    <p style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#c9d1d9' }}>
                      <strong>Thème :</strong> {ev.theme}
                    </p>
                    <p className="hint" style={{ fontSize: '0.85rem' }}>
                      {ev.rules}
                    </p>
                  </div>
                  <button className="big" onClick={() => setSelectedEventId(ev.id)}>
                    Accéder à l’événement →
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* VUE DÉTAIL D'UN ÉVÉNEMENT CAF */
        <div>
          <button className="link" onClick={() => setSelectedEventId(null)} style={{ marginBottom: 12 }}>
            ← Retour à la liste des événements
          </button>

          {subDataLoading || !selectedEvent ? (
            <div className="card"><p className="hint">Chargement du détail de l’événement...</p></div>
          ) : (
            <>
              {/* CARTON D'EN-TÊTE ÉVÉNEMENT */}
              <div className="card" style={{ borderLeft: '4px solid #1f6feb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span className={`caf-badge ${selectedEvent.status}`}>{STATUS_LABELS[selectedEvent.status]}</span>
                    <h2 style={{ margin: '8px 0 4px', fontSize: '1.5rem' }}>{selectedEvent.title}</h2>
                    <p style={{ margin: 0, color: '#58a6ff', fontWeight: 500 }}>
                      🎯 Thème : {selectedEvent.theme}
                    </p>
                  </div>

                  {/* BOUTONS D'ADMINISTRATION DES STATUTS (SI CONNECTÉ) */}
                  {token && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className="hint" style={{ fontSize: '0.8rem' }}>Statut :</span>
                      {(['brouillon', 'inscriptions', 'en_cours', 'termine'] as CafEventStatus[]).map((st) => (
                        <button
                          key={st}
                          disabled={selectedEvent.status === st}
                          onClick={() => void handleStatusChange(st)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            background: selectedEvent.status === st ? '#1f6feb' : '#21262d',
                          }}
                        >
                          {STATUS_LABELS[st]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #30363d', display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '0.85rem' }}>
                  <div><strong>Début :</strong> {new Date(selectedEvent.startDate).toLocaleDateString()}</div>
                  <div><strong>Fin :</strong> {new Date(selectedEvent.endDate).toLocaleDateString()}</div>
                  <div><strong>Organisateur :</strong> @{selectedEvent.organizer.login}</div>
                  <div><strong>Critères du jury :</strong> {selectedEvent.criteria.map((c) => `${c.label} (${c.maxScore}pt)`).join(', ')}</div>
                </div>

                <p style={{ marginTop: 12, marginBottom: 0, fontSize: '0.9rem', color: '#c9d1d9', whiteSpace: 'pre-line' }}>
                  {selectedEvent.rules}
                </p>
              </div>

              {/* TABS DE L'ÉVÉNEMENT */}
              <nav className="tabs" style={{ margin: '16px 0' }}>
                <button className={eventTab === 'equipes' ? 'tab on' : 'tab'} onClick={() => setEventTab('equipes')}>
                  👥 Équipes Régionales ({teams.length})
                </button>
                <button className={eventTab === 'defis' ? 'tab on' : 'tab'} onClick={() => setEventTab('defis')}>
                  🎯 Défis ({challenges.length})
                </button>
                <button className={eventTab === 'soumissions' ? 'tab on' : 'tab'} onClick={() => setEventTab('soumissions')}>
                  🚀 Soumissions ({submissions.length})
                </button>
                <button className={eventTab === 'resultats' ? 'tab on' : 'tab'} onClick={() => setEventTab('resultats')}>
                  🏆 Classement & Résultats
                </button>
              </nav>

              {/* CONTENU DU TAB : ÉQUIPES RÉGIONALES */}
              {eventTab === 'equipes' && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3>Équipes Régionales Inscrites</h3>
                    {token && (selectedEvent.status === 'inscriptions' || selectedEvent.status === 'en_cours') && (
                      <button onClick={() => setCreateTeamOpen(true)}>+ Créer une équipe régionale</button>
                    )}
                  </div>

                  {teams.length === 0 ? (
                    <p className="hint">Aucune équipe inscrite pour l’instant.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {teams.map((t) => {
                        const isMember = user && t.members.some((m) => m.user.login === user.login);
                        const isCaptain = user && t.leader.login === user.login;
                        return (
                          <div key={t.id} style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, padding: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ margin: '0 0 4px', color: '#58a6ff' }}>{t.name}</h4>
                                <span className="stage" style={{ background: '#238636' }}>📍 {t.region}</span>
                              </div>

                              <div style={{ display: 'flex', gap: 6 }}>
                                {token && !isMember && selectedEvent.status === 'inscriptions' && (
                                  <button onClick={() => setJoinTeamTarget(t)}>Demander à rejoindre</button>
                                )}
                                {isCaptain && (
                                  <button style={{ background: '#30363d' }} onClick={() => void handleLoadTeamApps(t)}>
                                    Candidatures
                                  </button>
                                )}
                              </div>
                            </div>

                            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span className="hint" style={{ fontSize: '0.8rem' }}>Membres ({t.members.length}) :</span>
                              {t.members.map((m) => (
                                <span key={m.user.id} className="chip" style={{ fontSize: '0.8rem' }}>
                                  @{m.user.login} ({m.country}) {m.role === 'capitaine' ? '👑' : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* CONTENU DU TAB : DÉFIS */}
              {eventTab === 'defis' && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3>Défis de l’événement</h3>
                    {token && (
                      <button onClick={() => setCreateChallengeOpen(true)}>+ Ajouter un défi</button>
                    )}
                  </div>

                  {challenges.length === 0 ? (
                    <p className="hint">Aucun défi publié pour cet événement.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {challenges.map((c) => (
                        <div key={c.id} style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, color: '#58a6ff' }}>{c.title}</h4>
                            <span className="stage" style={{ background: '#9e6a03' }}>⏱️ Durée : {c.durationHours}h</span>
                          </div>
                          <p style={{ margin: '8px 0', fontSize: '0.9rem' }}>{c.description}</p>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {c.tech.map((tech) => (
                              <span key={tech} className="chip">{tech}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CONTENU DU TAB : SOUMISSIONS */}
              {eventTab === 'soumissions' && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3>Projets Soumis</h3>
                    {token && challenges.length > 0 && (selectedEvent.status === 'en_cours' || selectedEvent.status === 'termine') && (
                      <button onClick={() => setCreateSubmissionOpen(true)}>+ Soumettre un projet d’équipe</button>
                    )}
                  </div>

                  {challenges.length > 0 && (
                    <div className="chips" style={{ marginBottom: 14 }}>
                      {challenges.map((c) => (
                        <button
                          key={c.id}
                          className={selectedChallengeId === c.id ? 'chip on' : 'chip'}
                          onClick={() => setSelectedChallengeId(c.id)}
                        >
                          {c.title}
                        </button>
                      ))}
                    </div>
                  )}

                  {submissions.length === 0 ? (
                    <p className="hint">Aucune soumission enregistrée pour ce défi.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {submissions.map((sub) => (
                        <div key={sub.id} style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, color: '#58a6ff' }}>Équipe : {sub.teamName}</h4>
                            <small className="hint">Soumis le {new Date(sub.submittedAt).toLocaleString()}</small>
                          </div>
                          <p style={{ margin: '8px 0', fontSize: '0.9rem' }}>{sub.presentation}</p>
                          <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', marginBottom: 8 }}>
                            <a href={sub.repositoryUrl} target="_blank" rel="noreferrer" style={{ color: '#58a6ff' }}>📦 Dépôt Git</a>
                            <a href={sub.demoUrl} target="_blank" rel="noreferrer" style={{ color: '#3fb950' }}>🚀 Démo en ligne</a>
                          </div>

                          {token && (
                            <button
                              style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#30363d', marginTop: 8 }}
                              onClick={() => {
                                setEvaluateSubmission(sub);
                                const initScores: Record<string, number> = {};
                                selectedEvent.criteria.forEach((c) => {
                                  initScores[c.key] = Math.round(c.maxScore * 0.8);
                                });
                                setEvalScores(initScores);
                              }}
                            >
                              ⚖️ Évaluer (Jury)
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CONTENU DU TAB : CLASSEMENT & RÉSULTATS (STRICT STATUS LOCK) */}
              {eventTab === 'resultats' && (
                <div className="card">
                  <h3>🏆 Classement Officiel de la Coupe d’Afrique</h3>

                  {resultsError ? (
                    <div style={{ background: '#161b22', border: '1px solid #f85149', borderRadius: 8, padding: 16, marginTop: 12 }}>
                      <p style={{ color: '#ff7b72', margin: 0, fontWeight: 600 }}>🔒 Accès restreint au classement</p>
                      <p className="hint" style={{ marginTop: 6, marginBottom: 0 }}>
                        {resultsError}
                      </p>
                    </div>
                  ) : results.length === 0 ? (
                    <p className="hint" style={{ marginTop: 12 }}>
                      Le classement sera calculé dès les premières évaluations transmises par le jury.
                    </p>
                  ) : (
                    <table className="caf-table">
                      <thead>
                        <tr>
                          <th>Rang</th>
                          <th>Équipe</th>
                          <th>Région</th>
                          <th>Pays</th>
                          <th>Score Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r) => (
                          <tr key={r.teamId}>
                            <td>
                              <strong style={{ color: r.rank === 1 ? '#d29922' : r.rank === 2 ? '#c0c0c0' : r.rank === 3 ? '#cd7f32' : '#e6edf3' }}>
                                #{r.rank} {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : ''}
                              </strong>
                            </td>
                            <td><strong>{r.teamName}</strong></td>
                            <td>📍 {r.region}</td>
                            <td>{r.countries.join(', ')}</td>
                            <td>
                              <strong style={{ color: '#3fb950' }}>{r.totalScore.toFixed(1)} pts</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MODAL: CRÉER ÉVÉNEMENT */}
      {createEventOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Organiser un Événement Coupe d’Afrique</h3>
            {formErr && <p className="error">{formErr}</p>}
            <form onSubmit={handleCreateEvent}>
              <label>Titre de l’événement</label>
              <input value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Coupe d’Afrique Francophone 2026" required />

              <label>Thème officiel</label>
              <input value={evTheme} onChange={(e) => setEvTheme(e.target.value)} placeholder="Inclusion financière & Mobile Money" required />

              <label>Règlement & Consignes</label>
              <textarea
                value={evRules}
                onChange={(e) => setEvRules(e.target.value)}
                placeholder="Règles de participation..."
                rows={3}
                style={{ background: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: 6, padding: 8 }}
                required
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label>Date de début</label>
                  <input type="date" value={evStart} onChange={(e) => setEvStart(e.target.value)} required />
                </div>
                <div>
                  <label>Date de fin</label>
                  <input type="date" value={evEnd} onChange={(e) => setEvEnd(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" style={{ background: '#30363d' }} onClick={() => setCreateEventOpen(false)}>Annuler</button>
                <button type="submit">Créer l’Événement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRÉER ÉQUIPE RÉGIONALE */}
      {createTeamOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Créer une Équipe Régionale</h3>
            {formErr && <p className="error">{formErr}</p>}
            <form onSubmit={handleCreateTeam}>
              <label>Nom de l’équipe</label>
              <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Les Lions Tech du Sénégal" required />

              <label>Région d’attachement</label>
              <select
                value={teamRegion}
                onChange={(e) => setTeamRegion(e.target.value)}
                style={{ background: '#0d1117', color: '#fff', border: '1px solid #30363d', padding: 8, borderRadius: 6 }}
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" style={{ background: '#30363d' }} onClick={() => setCreateTeamOpen(false)}>Annuler</button>
                <button type="submit">Créer l’Équipe</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DEMANDER À REJOINDRE */}
      {joinTeamTarget && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Demander à rejoindre "{joinTeamTarget.name}"</h3>
            {formErr && <p className="error">{formErr}</p>}
            <form onSubmit={handleJoinTeam}>
              <label>Message au capitaine</label>
              <textarea
                value={joinMsg}
                onChange={(e) => setJoinMsg(e.target.value)}
                rows={3}
                style={{ background: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: 6, padding: 8 }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" style={{ background: '#30363d' }} onClick={() => setJoinTeamTarget(null)}>Annuler</button>
                <button type="submit">Envoyer la demande</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GÉRER LES CANDIDATURES DE L'ÉQUIPE */}
      {viewTeamApps && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Candidatures pour l'équipe "{viewTeamApps.name}"</h3>
            {teamApps.length === 0 ? (
              <p className="hint">Aucune candidature reçue.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                {teamApps.map((app) => (
                  <div key={app.id} style={{ background: '#0d1117', padding: 10, borderRadius: 6, border: '1px solid #30363d' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>@{app.applicant.login} ({app.country})</strong>
                      <span className="hint" style={{ fontSize: '0.8rem' }}>{app.status}</span>
                    </div>
                    {app.message && <p style={{ fontSize: '0.85rem', margin: '4px 0' }}>"{app.message}"</p>}
                    {app.status === 'en_attente' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <button onClick={() => void handleRespondApp(viewTeamApps.id, app.id, 'acceptee')}>Accepter</button>
                        <button style={{ background: '#f85149' }} onClick={() => void handleRespondApp(viewTeamApps.id, app.id, 'refusee')}>Refuser</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button style={{ background: '#30363d' }} onClick={() => setViewTeamApps(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRÉER DÉFI */}
      {createChallengeOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Ajouter un Défi</h3>
            {formErr && <p className="error">{formErr}</p>}
            <form onSubmit={handleCreateChallenge}>
              <label>Titre du défi</label>
              <input value={chTitle} onChange={(e) => setChTitle(e.target.value)} placeholder="API de paiement offline" required />

              <label>Description du problème</label>
              <textarea
                value={chDesc}
                onChange={(e) => setChDesc(e.target.value)}
                rows={3}
                placeholder="Spécifications..."
                style={{ background: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: 6, padding: 8 }}
                required
              />

              <label>Durée allouée (en heures)</label>
              <input type="number" value={chDurationHours} onChange={(e) => setChDurationHours(Number(e.target.value))} required />

              <label>Technologies suggérées (séparées par virgules)</label>
              <input value={chTech} onChange={(e) => setChTech(e.target.value)} placeholder="Node.js, React, SQLite" />

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" style={{ background: '#30363d' }} onClick={() => setCreateChallengeOpen(false)}>Annuler</button>
                <button type="submit">Publier le Défi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SOUMETTRE PROJET */}
      {createSubmissionOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Soumettre un Projet au Jury</h3>
            {formErr && <p className="error">{formErr}</p>}
            <form onSubmit={handleCreateSubmission}>
              <label>Choisir votre équipe</label>
              <select
                value={subTeamId}
                onChange={(e) => setSubTeamId(e.target.value)}
                style={{ background: '#0d1117', color: '#fff', border: '1px solid #30363d', padding: 8, borderRadius: 6 }}
                required
              >
                <option value="">-- Sélectionner l’équipe --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} (📍 {t.region})</option>
                ))}
              </select>

              <label>Lien du Dépôt GitHub / GitLab</label>
              <input value={subRepo} onChange={(e) => setSubRepo(e.target.value)} placeholder="https://github.com/org/project" required />

              <label>Lien de la Démo en ligne</label>
              <input value={subDemo} onChange={(e) => setSubDemo(e.target.value)} placeholder="https://demo.koradevs.org" required />

              <label>Présentation & Résumé de la solution</label>
              <textarea
                value={subPres}
                onChange={(e) => setSubPres(e.target.value)}
                rows={3}
                placeholder="Explication de votre architecture et innovation..."
                style={{ background: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: 6, padding: 8 }}
                required
              />

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" style={{ background: '#30363d' }} onClick={() => setCreateSubmissionOpen(false)}>Annuler</button>
                <button type="submit">Soumettre la solution</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ÉVALUATION PAR LE JURY */}
      {evaluateSubmission && selectedEvent && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Formulaire d’Évaluation Jury</h3>
            <p className="hint">Soumission par l'équipe : <strong>{evaluateSubmission.teamName}</strong></p>
            {formErr && <p className="error">{formErr}</p>}

            <form onSubmit={handleEvaluateSubmission}>
              {selectedEvent.criteria.map((crit) => (
                <div key={crit.key} style={{ background: '#0d1117', padding: 10, borderRadius: 6, border: '1px solid #30363d', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ margin: 0 }}><strong>{crit.label}</strong> (Max {crit.maxScore} pts)</label>
                    <input
                      type="number"
                      min={0}
                      max={crit.maxScore}
                      value={evalScores[crit.key] ?? 0}
                      onChange={(e) =>
                        setEvalScores({
                          ...evalScores,
                          [crit.key]: Number(e.target.value),
                        })
                      }
                      style={{ width: 70, textAlign: 'center' }}
                      required
                    />
                  </div>
                </div>
              ))}

              <label style={{ marginTop: 8 }}>Commentaires globaux (optionnel)</label>
              <textarea
                value={evalComment}
                onChange={(e) => setEvalComment(e.target.value)}
                rows={2}
                style={{ background: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: 6, padding: 8 }}
              />

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" style={{ background: '#30363d' }} onClick={() => setEvaluateSubmission(null)}>Annuler</button>
                <button type="submit">Valider la note du Jury</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
