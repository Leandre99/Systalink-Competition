import { useEffect, useState, type FormEvent } from 'react';
import { KNOWN_TECH, type ProjectJoinRequest, type ProjectTask, type PublicUser, type ShowcaseProject, type TaskStatus } from '@sos/shared';
import {
  createProject,
  createProjectTask,
  deleteProject,
  getUserJoinRequest,
  joinProject,
  listJoinRequests,
  listProjects,
  listProjectTasks,
  publishProject,
  respondJoinRequest,
  updateProject,
  updateProjectTask,
} from './api.js';
import { ReportModal } from './ReportModal.js';

interface VitrineProps {
  token: string;
  user: PublicUser;
}

export function Vitrine({ token, user }: VitrineProps) {
  const [projects, setProjects] = useState<ShowcaseProject[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTech, setSelectedTech] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'tous' | 'ouvert' | 'ferme'>('tous');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Modals state
  const [selectedProject, setSelectedProject] = useState<ShowcaseProject | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTech, setFormTech] = useState<string[]>([]);
  const [formRepo, setFormRepo] = useState('');
  const [formDemo, setFormDemo] = useState('');
  const [formRoles, setFormRoles] = useState('');
  const [formStatus, setFormStatus] = useState<'ouvert' | 'ferme'>('ouvert');
  const [formPublished, setFormPublished] = useState(true);

  // Join modal state
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinMessage, setJoinMessage] = useState('Bonjour ! Je serais ravi de contribuer à votre projet.');
  const [joinNotice, setJoinNotice] = useState<string | null>(null);
  const [joinSending, setJoinSending] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Application & Tasks state for selected project
  const [applications, setApplications] = useState<ProjectJoinRequest[]>([]);
  const [myApplication, setMyApplication] = useState<ProjectJoinRequest | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [tasksLoading, setTasksLoading] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProjects(token, search, selectedTech, statusFilter === 'tous' ? undefined : statusFilter);
      setProjects(data);
    } catch (err) {
      setError((err as Error).message || 'Erreur lors du chargement des projets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchProjects();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedTech, statusFilter]);

  // Load applications and tasks when a project is selected
  useEffect(() => {
    if (!selectedProject) {
      setApplications([]);
      setMyApplication(null);
      setTasks([]);
      return;
    }
    const isOwner = selectedProject.userId === user.id;

    if (isOwner) {
      void listJoinRequests(token, selectedProject.id).then(setApplications, () => setApplications([]));
    } else {
      void getUserJoinRequest(token, selectedProject.id).then(setMyApplication, () => setMyApplication(null));
    }

    setTasksLoading(true);
    void listProjectTasks(token, selectedProject.id)
      .then(setTasks, () => setTasks([]))
      .finally(() => setTasksLoading(false));
  }, [selectedProject, token, user.id]);

  const openNewForm = () => {
    setEditingId(null);
    setFormName('');
    setFormDesc('');
    setFormTech(['TypeScript', 'React']);
    setFormRepo('');
    setFormDemo('');
    setFormRoles('Frontend Dev, Backend Dev');
    setFormStatus('ouvert');
    setFormPublished(true);
    setIsEditing(true);
  };

  const openEditForm = (p: ShowcaseProject) => {
    setEditingId(p.id);
    setFormName(p.name);
    setFormDesc(p.description);
    setFormTech(p.tech);
    setFormRepo(p.repositoryUrl || '');
    setFormDemo(p.demoUrl || '');
    setFormRoles(p.rolesNeeded.join(', '));
    setFormStatus(p.status);
    setFormPublished(p.published);
    setIsEditing(true);
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const rolesArray = formRoles
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    try {
      if (editingId) {
        await updateProject(token, editingId, {
          name: formName,
          description: formDesc,
          tech: formTech,
          repositoryUrl: formRepo || null,
          demoUrl: formDemo || null,
          rolesNeeded: rolesArray,
          status: formStatus,
          published: formPublished,
        });
        setNotice('Projet mis à jour avec succès.');
      } else {
        await createProject(token, {
          name: formName,
          description: formDesc,
          tech: formTech,
          repositoryUrl: formRepo || null,
          demoUrl: formDemo || null,
          rolesNeeded: rolesArray,
          status: formStatus,
          published: formPublished,
        });
        setNotice('Nouveau projet créé et ajouté à la vitrine !');
      }
      setIsEditing(false);
      void fetchProjects();
    } catch (err) {
      setNotice((err as Error).message);
    }
  };

  const handleTogglePublish = async (p: ShowcaseProject) => {
    try {
      await publishProject(token, p.id, !p.published);
      setNotice(p.published ? 'Projet retiré de la vitrine publique.' : 'Projet publié dans la vitrine !');
      void fetchProjects();
      if (selectedProject?.id === p.id) {
        setSelectedProject({ ...selectedProject, published: !p.published });
      }
    } catch (err) {
      setNotice((err as Error).message);
    }
  };

  const handleDeleteProject = async (p: ShowcaseProject) => {
    if (!window.confirm(`Supprimer définitivement le projet "${p.name}" ?`)) return;
    try {
      await deleteProject(token, p.id);
      setNotice('Projet supprimé.');
      setSelectedProject(null);
      void fetchProjects();
    } catch (err) {
      setNotice((err as Error).message);
    }
  };

  const handleSendJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setJoinSending(true);
    setJoinNotice(null);
    try {
      const req = await joinProject(token, selectedProject.id, joinMessage);
      setMyApplication(req);
      setJoinNotice('Candidature envoyée avec succès au créateur du projet !');
      setTimeout(() => {
        setJoinModalOpen(false);
        setJoinNotice(null);
      }, 2000);
    } catch (err) {
      setJoinNotice((err as Error).message);
    } finally {
      setJoinSending(false);
    }
  };

  const handleRespondApplication = async (appId: string, status: 'acceptee' | 'refusee') => {
    if (!selectedProject) return;
    try {
      const updated = await respondJoinRequest(token, selectedProject.id, appId, status);
      setApplications((list) => list.map((a) => (a.id === appId ? updated : a)));
      // Reload tasks if accepted member was added
      void listProjectTasks(token, selectedProject.id).then(setTasks, () => setTasks([]));
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newTaskTitle.trim()) return;
    try {
      const task = await createProjectTask(token, selectedProject.id, newTaskTitle.trim());
      setTasks((prev) => [task, ...prev]);
      setNewTaskTitle('');
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (!selectedProject) return;
    try {
      const updated = await updateProjectTask(token, selectedProject.id, taskId, { status: newStatus });
      setTasks((list) => list.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const toggleTechFilter = (t: string) => {
    setSelectedTech((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const toggleFormTech = (t: string) => {
    setFormTech((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const isOwner = selectedProject?.userId === user.id;
  const isMember = isOwner || myApplication?.status === 'acceptee';

  return (
    <section className="vitrine-section">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2>🚀 Vitrine de projets KoraDevs</h2>
            <p className="hint">Découvrez les projets créés par les membres de la communauté, contribuez et demandez à les rejoindre.</p>
          </div>
          <button type="button" onClick={openNewForm} style={{ backgroundColor: 'var(--accent, #3b82f6)' }}>
            ➕ Proposer un projet
          </button>
        </div>

        {notice && (
          <div style={{ margin: '12px 0', padding: '8px 12px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', borderRadius: '6px' }}>
            {notice}
          </div>
        )}

        {/* Barre de recherche et Filtres */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom de projet ou mot-clé..."
              style={{ flex: 1, minWidth: '220px' }}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={{ padding: '8px', borderRadius: '4px' }}>
              <option value="tous">Tous les statuts</option>
              <option value="ouvert">🟢 Ouvert (recrute)</option>
              <option value="ferme">🔴 Fermé</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85em', opacity: 0.8 }}>Filtre techno :</span>
            {KNOWN_TECH.map((t) => {
              const active = selectedTech.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTechFilter(t)}
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.8em',
                    borderRadius: '12px',
                    background: active ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              );
            })}
            {selectedTech.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTech([])}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8em' }}
              >
                Effacer filtres
              </button>
            )}
          </div>
        </div>
      </div>

      {/* État ERROR */}
      {error && (
        <div className="card" style={{ borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
          <h3 style={{ color: '#f87171' }}>⚠️ Erreur</h3>
          <p>{error}</p>
          <button type="button" onClick={() => void fetchProjects()}>
            🔄 Réessayer
          </button>
        </div>
      )}

      {/* État LOADING */}
      {loading && !error && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <span className="dot on" style={{ display: 'inline-block', marginBottom: '8px' }} />
          <p>Chargement des projets...</p>
        </div>
      )}

      {/* RÉSULTATS */}
      {!loading && !error && (
        <>
          {projects.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
              <h3>🚀 Aucun projet trouvé</h3>
              <p className="hint">Aucun projet ne correspond à vos filtres. Soyez le premier à proposer votre projet !</p>
              <button type="button" onClick={openNewForm} style={{ marginTop: '12px' }}>
                ➕ Publier un projet
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '16px' }}>
              {projects.map((p) => {
                const owner = p.userId === user.id;
                return (
                  <div
                    key={p.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: p.published ? '1px solid rgba(255,255,255,0.1)' : '1px dashed #f59e0b',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <h3 style={{ margin: 0, color: '#60a5fa', fontSize: '1.1em', cursor: 'pointer' }} onClick={() => setSelectedProject(p)}>
                          {p.name}
                        </h3>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <span
                            style={{
                              fontSize: '0.7em',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              background: p.status === 'ouvert' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                              color: p.status === 'ouvert' ? '#34d399' : '#f87171',
                            }}
                          >
                            {p.status === 'ouvert' ? '🟢 Ouvert' : '🔴 Fermé'}
                          </span>
                          {!p.published && (
                            <span style={{ fontSize: '0.7em', padding: '2px 6px', borderRadius: '4px', background: '#f59e0b', color: '#000', fontWeight: 'bold' }}>
                              Brouillon
                            </span>
                          )}
                        </div>
                      </div>

                      <p style={{ fontSize: '0.85em', opacity: 0.8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.description}
                      </p>

                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '8px 0' }}>
                        {p.tech.map((t) => (
                          <span key={t} style={{ fontSize: '0.75em', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}>
                            {t}
                          </span>
                        ))}
                      </div>

                      {p.rolesNeeded.length > 0 && (
                        <div style={{ fontSize: '0.8em', color: '#fbbf24', marginTop: '4px' }}>
                          🎯 Recrute : {p.rolesNeeded.join(', ')}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8em', opacity: 0.7 }}>par @{p.author.login}</span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" onClick={() => setSelectedProject(p)} style={{ fontSize: '0.8em', padding: '4px 8px' }}>
                          Détails
                        </button>
                        {owner && (
                          <button type="button" onClick={() => openEditForm(p)} style={{ fontSize: '0.8em', padding: '4px 8px', background: 'rgba(255,255,255,0.1)' }}>
                            ✏️ Éditer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL CRÉATION / ÉDITION */}
      {isEditing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setIsEditing(false)}
        >
          <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3>{editingId ? '✏️ Modifier le projet' : '🚀 Publier un nouveau projet'}</h3>
              <button type="button" onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2em', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label>Nom du projet *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="ex: KoraDevs Mobile App" required />
              </div>

              <div>
                <label>Description détaillée *</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={4}
                  placeholder="Expliquez les objectifs, le concept et l'avancement du projet..."
                  required
                />
              </div>

              <div>
                <label>Technologies utilisées</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {KNOWN_TECH.map((t) => {
                    const active = formTech.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleFormTech(t)}
                        style={{
                          padding: '2px 8px',
                          fontSize: '0.8em',
                          borderRadius: '12px',
                          background: active ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label>URL du Dépôt (GitHub / Git)</label>
                  <input type="url" value={formRepo} onChange={(e) => setFormRepo(e.target.value)} placeholder="https://github.com/..." />
                </div>
                <div>
                  <label>URL de Démo</label>
                  <input type="url" value={formDemo} onChange={(e) => setFormDemo(e.target.value)} placeholder="https://demo.example.com" />
                </div>
              </div>

              <div>
                <label>Rôles recherchés (séparés par des virgules)</label>
                <input type="text" value={formRoles} onChange={(e) => setFormRoles(e.target.value)} placeholder="ex: Frontend React, UI/UX Designer, DevOps" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center' }}>
                <div>
                  <label>Statut des candidatures</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as any)}>
                    <option value="ouvert">🟢 Ouvert (Accepte les demandes)</option>
                    <option value="ferme">🔴 Fermé</option>
                  </select>
                </div>
                <div>
                  <label>Visibilité</label>
                  <select value={formPublished ? 'true' : 'false'} onChange={(e) => setFormPublished(e.target.value === 'true')}>
                    <option value="true">🌐 Publié dans la vitrine</option>
                    <option value="false">🔒 Retiré / Brouillon privé</option>
                  </select>
                </div>
              </div>

              <button type="submit" style={{ marginTop: '12px', backgroundColor: '#3b82f6' }}>
                {editingId ? 'Mettre à jour le projet' : 'Créer et publier'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DÉTAILS PROJET & TABLEAU DE TÂCHES */}
      {selectedProject && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setSelectedProject(null)}
        >
          <div className="card" style={{ maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ color: '#60a5fa', margin: '0 0 4px 0' }}>{selectedProject.name}</h2>
                <span style={{ fontSize: '0.85em', opacity: 0.8 }}>Par @{selectedProject.author.login}</span>
              </div>
              <button type="button" onClick={() => setSelectedProject(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2em', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', margin: '12px 0', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8em', padding: '2px 8px', borderRadius: '4px', background: selectedProject.status === 'ouvert' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: selectedProject.status === 'ouvert' ? '#34d399' : '#f87171', fontWeight: 'bold' }}>
                {selectedProject.status === 'ouvert' ? '🟢 Ouvert aux membres' : '🔴 Fermé'}
              </span>
              <span style={{ fontSize: '0.8em', padding: '2px 8px', borderRadius: '4px', background: selectedProject.published ? 'rgba(59,130,246,0.2)' : '#f59e0b', color: selectedProject.published ? '#60a5fa' : '#000', fontWeight: 'bold' }}>
                {selectedProject.published ? '🌐 Publié' : '🔒 Brouillon privé'}
              </span>
              {myApplication?.status === 'acceptee' && (
                <span style={{ fontSize: '0.8em', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.3)', color: '#10b981', fontWeight: 'bold' }}>
                  🎉 Membre accepté
                </span>
              )}
            </div>

            <h4>Description :</h4>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', opacity: 0.9 }}>{selectedProject.description}</p>

            <h4>Technologies :</h4>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {selectedProject.tech.map((t) => (
                <span key={t} style={{ fontSize: '0.85em', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}>
                  {t}
                </span>
              ))}
            </div>

            {selectedProject.rolesNeeded.length > 0 && (
              <>
                <h4 style={{ marginTop: '16px' }}>🎯 Rôles recherchés :</h4>
                <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                  {selectedProject.rolesNeeded.map((r, i) => (
                    <li key={i} style={{ color: '#fbbf24' }}>
                      {r}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div style={{ display: 'flex', gap: '12px', margin: '16px 0', flexWrap: 'wrap' }}>
              {selectedProject.repositoryUrl && (
                <a href={selectedProject.repositoryUrl} target="_blank" rel="noreferrer" className="btn-small" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                  📦 Code source / Dépôt
                </a>
              )}
              {selectedProject.demoUrl && (
                <a href={selectedProject.demoUrl} target="_blank" rel="noreferrer" className="btn-small" style={{ color: '#34d399', textDecoration: 'underline' }}>
                  🌐 Démo en ligne
                </a>
              )}
            </div>

            {/* SECTION CANDIDAT : STATUT DE MA DEMANDE */}
            {!isOwner && myApplication && (
              <div style={{ margin: '16px 0', padding: '12px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h4 style={{ margin: '0 0 6px 0' }}>Votre demande pour rejoindre :</h4>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.9em', fontStyle: 'italic' }}>"{myApplication.message}"</p>
                <div>
                  Statut :{' '}
                  {myApplication.status === 'en_attente' && <strong style={{ color: '#f59e0b' }}>⏳ En attente de décision par le propriétaire</strong>}
                  {myApplication.status === 'acceptee' && <strong style={{ color: '#10b981' }}>✅ Candidature acceptée ! Bienvenue dans l'équipe.</strong>}
                  {myApplication.status === 'refusee' && <strong style={{ color: '#ef4444' }}>❌ Candidature non retenue.</strong>}
                </div>
              </div>
            )}

            {/* SECTION PROPRIÉTAIRE : GESTION DES CANDIDATURES */}
            {isOwner && (
              <div style={{ margin: '16px 0', padding: '12px', borderRadius: '6px', backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#60a5fa' }}>📥 Demandes pour rejoindre ({applications.length})</h4>
                {applications.length === 0 ? (
                  <p className="hint">Aucune demande reçue pour le moment.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {applications.map((app) => (
                      <div key={app.id} style={{ padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>@{app.applicant.login}</strong> : <span>"{app.message}"</span>
                          <div style={{ fontSize: '0.75em', opacity: 0.7 }}>Statut actuel : {app.status}</div>
                        </div>
                        {app.status === 'en_attente' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button type="button" onClick={() => void handleRespondApplication(app.id, 'acceptee')} style={{ background: '#10b981', padding: '4px 8px', fontSize: '0.8em' }}>
                              ✅ Accepter
                            </button>
                            <button type="button" onClick={() => void handleRespondApplication(app.id, 'refusee')} style={{ background: '#ef4444', padding: '4px 8px', fontSize: '0.8em' }}>
                              ❌ Refuser
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8em', color: app.status === 'acceptee' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                            {app.status === 'acceptee' ? 'Acceptée' : 'Refusée'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECTION TABLEAU DE TÂCHES MINIMAL (RÉSERVÉ AUX MEMBRES) */}
            {isMember ? (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#10b981' }}>📌 Tableau de tâches du projet (Espace Membres)</h4>

                {/* Formulaire ajout rapide de tâche */}
                <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Nouvelle tâche (ex: Créer le composant Header)..."
                    style={{ flex: 1 }}
                    required
                  />
                  <button type="submit" style={{ backgroundColor: '#10b981' }}>
                    ➕ Ajouter
                  </button>
                </form>

                {tasksLoading ? (
                  <p className="hint">Chargement des tâches...</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    {/* À FAIRE */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                      <h5 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>📋 À faire</h5>
                      {tasks.filter((t) => t.status === 'a_faire').map((t) => (
                        <div key={t.id} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '6px', fontSize: '0.85em' }}>
                          <p style={{ margin: '0 0 4px 0' }}>{t.title}</p>
                          <button type="button" onClick={() => void handleUpdateTaskStatus(t.id, 'en_cours')} style={{ fontSize: '0.75em', padding: '2px 6px' }}>
                            👉 Passer en cours
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* EN COURS */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                      <h5 style={{ margin: '0 0 8px 0', color: '#60a5fa' }}>⚡ En cours</h5>
                      {tasks.filter((t) => t.status === 'en_cours').map((t) => (
                        <div key={t.id} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '6px', fontSize: '0.85em' }}>
                          <p style={{ margin: '0 0 4px 0' }}>{t.title}</p>
                          <button type="button" onClick={() => void handleUpdateTaskStatus(t.id, 'termine')} style={{ fontSize: '0.75em', padding: '2px 6px', background: '#10b981' }}>
                            ✅ Marquer terminé
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* TERMINÉ */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                      <h5 style={{ margin: '0 0 8px 0', color: '#10b981' }}>🎉 Terminé</h5>
                      {tasks.filter((t) => t.status === 'termine').map((t) => (
                        <div key={t.id} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '6px', fontSize: '0.85em', opacity: 0.8 }}>
                          <p style={{ margin: '0', textDecoration: 'line-through' }}>{t.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', textAlign: 'center' }}>
                <p className="hint">🔒 Le tableau de tâches minimal est réservé aux membres acceptés du projet.</p>
              </div>
            )}

            {/* Actions Propriétaire vs Visiteur */}
            <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              {isOwner ? (
                <>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => openEditForm(selectedProject)}>
                      ✏️ Modifier
                    </button>
                    <button type="button" onClick={() => handleTogglePublish(selectedProject)} style={{ background: 'rgba(255,255,255,0.1)' }}>
                      {selectedProject.published ? '🔒 Retirer de la vitrine' : '🌐 Publier'}
                    </button>
                  </div>
                  <button type="button" onClick={() => handleDeleteProject(selectedProject)} style={{ backgroundColor: '#ef4444' }}>
                    🗑️ Supprimer
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
                  {!myApplication && selectedProject.status === 'ouvert' && selectedProject.published && (
                    <button type="button" onClick={() => setJoinModalOpen(true)} style={{ flex: 1, backgroundColor: '#10b981' }}>
                      ✋ Demander à rejoindre le projet
                    </button>
                  )}
                  <button type="button" onClick={() => setReportModalOpen(true)} style={{ background: 'none', border: '1px solid #718096', color: '#a0aec0' }}>
                    🚩 Signaler
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {reportModalOpen && selectedProject && (
        <ReportModal
          token={token}
          targetType="projet"
          targetId={selectedProject.id}
          targetTitle={`Projet : ${selectedProject.name}`}
          onClose={() => setReportModalOpen(false)}
        />
      )}

      {/* MODAL DEMANDER À REJOINDRE */}
      {joinModalOpen && selectedProject && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
          onClick={() => setJoinModalOpen(false)}
        >
          <div className="card" style={{ maxWidth: '500px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3>✋ Rejoindre le projet "{selectedProject.name}"</h3>
            <p className="hint">Envoyez un message d'introduction au créateur (@{selectedProject.author.login}).</p>

            {joinNotice && (
              <div style={{ margin: '8px 0', padding: '8px', borderRadius: '4px', background: joinNotice.includes('succès') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }}>
                {joinNotice}
              </div>
            )}

            <form onSubmit={handleSendJoin}>
              <label>Message de motivation *</label>
              <textarea value={joinMessage} onChange={(e) => setJoinMessage(e.target.value)} rows={4} required maxLength={500} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setJoinModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  Annuler
                </button>
                <button type="submit" disabled={joinSending} style={{ backgroundColor: '#10b981' }}>
                  {joinSending ? 'Envoi...' : 'Envoyer ma demande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
