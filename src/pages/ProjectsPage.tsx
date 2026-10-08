import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderGit2,
  Users,
  ExternalLink,
  Github,
  Plus,
  ArrowLeft,
  CheckCircle2,
  X,
  Kanban,
  Share2,
  Sparkles,
} from 'lucide-react';
import { Project, User } from '@shared/index';
import { apiFetch } from '../lib/api';
import { ListSkeleton } from '../components/Skeleton';

import { FALLBACK_PROJECTS } from '../lib/mockData';

interface ProjectsPageProps {
  currentUser: User;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ currentUser }) => {
  const { id } = useParams<{ id: string }>();

  const [projects, setProjects] = useState<Project[]>(FALLBACK_PROJECTS);
  const [loading, setLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [rolesNeededText, setRolesNeededText] = useState('Développeur Frontend, Designer UI/UX');
  const [submitting, setSubmitting] = useState(false);

  const [joinProject, setJoinProject] = useState<Project | null>(null);
  const [joinMessage, setJoinMessage] = useState('Bonjour ! Je serais ravi de prêter main forte sur ce projet.');
  const [sendingJoin, setSendingJoin] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState('');

  const loadProjects = async () => {
    try {
      const res = await apiFetch<Project[]>('/projects');
      if (res && res.length > 0) setProjects(res);
    } catch (err) {
      console.warn('Utilisation des projets locaux:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const roles = rolesNeededText.split(',').map((r) => r.trim()).filter(Boolean);
      await apiFetch<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          demoUrl,
          repoUrl,
          rolesNeeded: roles.length > 0 ? roles : ['Développeur'],
          authorId: currentUser.id,
          authorName: currentUser.name,
          city: currentUser.city,
        }),
      });
      setShowCreateModal(false);
      setName('');
      setDescription('');
      loadProjects();
    } catch (err) {
      console.error('Erreur création projet:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinProject) return;
    setSendingJoin(true);
    try {
      await apiFetch(`/projects/${joinProject.id}/join`, {
        method: 'POST',
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          message: joinMessage,
        }),
      });
      setJoinSuccess(true);
      setTimeout(() => {
        setJoinSuccess(false);
        setJoinProject(null);
      }, 1500);
    } catch (err) {
      console.error('Erreur demande d adhésion:', err);
    } finally {
      setSendingJoin(false);
    }
  };

  const handleUpdateTaskStatus = async (projectId: string, taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    try {
      const updated = await apiFetch<Project>(`/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
    } catch (err) {
      console.error('Erreur maj tâche:', err);
    }
  };

  const handleAddTask = async (projectId: string) => {
    if (!newTaskTitle.trim()) return;
    try {
      const updated = await apiFetch<Project>(`/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title: newTaskTitle.trim() }),
      });
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
      setNewTaskTitle('');
    } catch (err) {
      console.error('Erreur ajout tâche:', err);
    }
  };

  if (id) {
    const proj = projects.find((p) => p.id === id);

    if (loading) return <ListSkeleton count={2} />;

    if (!proj) {
      return (
        <div className="p-8 bg-white rounded-3xl border border-[#E2E8F0] text-center space-y-4 max-w-lg mx-auto shadow-sm">
          <h3 className="text-lg font-bold text-[#0F172A]">Projet introuvable</h3>
          <Link to="/projects" className="btn-primary py-2 text-xs inline-block">
            Retour à la vitrine
          </Link>
        </div>
      );
    }

    const whatsappText = encodeURIComponent(
      `🚀 Découvre le projet "${proj.name}" sur KoraDevs !\nRoles recherchés : ${proj.rolesNeeded.join(', ')}\nRejoins l'équipe ici : ${window.location.href}`
    );

    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-page-enter">
        <div className="flex items-center justify-between">
          <Link to="/projects" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0F6E56] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Tous les projets</span>
          </Link>

          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary py-2 px-4 text-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Partager WhatsApp</span>
          </a>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#E2E8F0] shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-1 bg-emerald-50 text-[#0F6E56] text-xs font-black rounded-full border border-emerald-200">
                  {proj.city}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Créé le {new Date(proj.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">{proj.name}</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Porté par <strong className="text-slate-900">{proj.authorName}</strong></p>
            </div>

            <button
              onClick={() => setJoinProject(proj)}
              className="btn-amber py-3 px-6 text-xs shadow-glow-amber"
            >
              <Users className="w-4 h-4 text-white" />
              <span>Demander à rejoindre</span>
            </button>
          </div>

          <p className="text-sm text-slate-800 leading-relaxed font-medium">{proj.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Liens du projet :</h4>
              <div className="flex flex-wrap gap-3">
                {proj.demoUrl && (
                  <a
                    href={proj.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F6E56] hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Démo en ligne</span>
                  </a>
                )}
                {proj.repoUrl && (
                  <a
                    href={proj.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:underline"
                  >
                    <Github className="w-4 h-4" />
                    <span>Dépôt GitHub / GitLab</span>
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rôles recherchés :</h4>
              <div className="flex flex-wrap gap-1.5">
                {proj.rolesNeeded.map((r, i) => (
                  <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-800 text-xs font-black rounded-lg border border-amber-200">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#E2E8F0] shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#0F172A] flex items-center gap-2">
              <Kanban className="w-5 h-5 text-[#0F6E56]" />
              <span>Tableau de tâches Kanban du chantier</span>
            </h3>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Nouvelle tâche..."
                className="px-3.5 py-2 bg-[#F8FAF9] border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F6E56]"
              />
              <button
                onClick={() => handleAddTask(proj.id)}
                className="btn-primary py-2 px-3.5 text-xs"
              >
                + Ajouter
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { key: 'todo' as const, label: 'À faire', bg: 'bg-[#F8FAF9] border-slate-200 text-slate-700' },
              { key: 'in_progress' as const, label: 'En cours', bg: 'bg-amber-50/50 border-amber-200 text-amber-900' },
              { key: 'done' as const, label: 'Terminé', bg: 'bg-emerald-50/50 border-emerald-200 text-[#0F6E56]' },
            ].map((col) => {
              const colTasks = proj.tasks.filter((t) => t.status === col.key);
              return (
                <div key={col.key} className={`p-4 rounded-2xl border ${col.bg} space-y-3`}>
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>{col.label}</span>
                    <span className="px-2 py-0.5 bg-white rounded-full text-[10px] border shadow-sm">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {colTasks.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-4 font-medium">Aucune tâche</p>
                    ) : (
                      colTasks.map((t) => (
                        <div key={t.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                          <p className="text-xs font-bold text-[#0F172A]">{t.title}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span>{t.assigneeName || 'Non assigné'}</span>
                            <select
                              value={t.status}
                              onChange={(e) => handleUpdateTaskStatus(proj.id, t.id, e.target.value as any)}
                              className="px-2 py-0.5 bg-[#F8FAF9] border border-slate-200 rounded text-[10px] font-bold text-slate-700"
                            >
                              <option value="todo">À faire</option>
                              <option value="in_progress">En cours</option>
                              <option value="done">Terminé</option>
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-page-enter">
      <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-[#0F172A] tracking-tight">Vitrine des projets KoraDevs</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Explore les initiatives tech de la communauté, propose tes compétences ou lance ton propre chantier.</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary py-2.5 px-5 text-xs"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Publier un projet</span>
        </button>
      </div>

      {loading ? (
        <ListSkeleton count={3} />
      ) : projects.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-[#E2E8F0] text-center space-y-4 shadow-sm">
          <FolderGit2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-base font-bold text-[#0F172A]">Aucun projet pour le moment</h4>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary py-2.5 px-5 text-xs"
          >
            Publier le premier projet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="card-modern p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-3 py-1 bg-emerald-50 text-[#0F6E56] text-xs font-black rounded-full border border-emerald-200">
                    {proj.city}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">{proj.membersCount} membre(s)</span>
                </div>

                <Link to={`/projects/${proj.id}`}>
                  <h3 className="text-lg font-black text-[#0F172A] hover:text-[#0F6E56] transition-colors mb-2">
                    {proj.name}
                  </h3>
                </Link>

                <p className="text-xs text-slate-600 line-clamp-3 mb-4 font-medium leading-relaxed">
                  {proj.description}
                </p>

                <div className="space-y-1 mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rôles recherchés :</span>
                  <div className="flex flex-wrap gap-1">
                    {proj.rolesNeeded.map((r, i) => (
                      <span key={i} className="px-2.5 py-0.5 bg-amber-50 text-amber-800 text-[11px] font-black rounded border border-amber-200">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <Link
                  to={`/projects/${proj.id}`}
                  className="text-xs font-bold text-[#0F6E56] hover:underline"
                >
                  Voir les détails & le Kanban →
                </Link>

                <button
                  onClick={() => setJoinProject(proj)}
                  className="btn-amber py-2 px-4 text-xs shadow-sm"
                >
                  Rejoindre
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#0A1118]/70 backdrop-blur-md flex items-center justify-center p-4 animate-page-enter">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-emerald-500/20 relative">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-[#0F172A] mb-4">Publier un projet sur la vitrine</h3>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom du projet *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: KoraCode CLI & SDK"
                  className="w-full px-3 py-2 bg-[#F8FAF9] border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F6E56]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Présente l objectif et l impact du projet..."
                  className="w-full px-3 py-2 bg-[#F8FAF9] border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F6E56]"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rôles recherchés (séparés par virgules)</label>
                <input
                  type="text"
                  value={rolesNeededText}
                  onChange={(e) => setRolesNeededText(e.target.value)}
                  placeholder="ex: Développeur Flutter, Designer UI/UX"
                  className="w-full px-3 py-2 bg-[#F8FAF9] border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F6E56]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lien Démo</label>
                  <input
                    type="url"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    placeholder="https://demo.app"
                    className="w-full px-3 py-2 bg-[#F8FAF9] border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F6E56]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lien Repo Git</label>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 bg-[#F8FAF9] border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F6E56]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary py-2 px-4 text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary py-2 px-5 text-xs"
                >
                  {submitting ? 'Publication...' : 'Publier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {joinProject && (
        <div className="fixed inset-0 z-50 bg-[#0A1118]/70 backdrop-blur-md flex items-center justify-center p-4 animate-page-enter">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-emerald-500/20 relative">
            <button onClick={() => setJoinProject(null)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-[#0F172A] mb-1">
              Demande d adhésion à {joinProject.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">Un message sera transmis à l auteur du projet.</p>

            {joinSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[#0F6E56] mx-auto" />
                <p className="text-xs font-bold text-[#0F172A]">Demande envoyée avec succès !</p>
              </div>
            ) : (
              <form onSubmit={handleSendJoinRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ton message d introduction *</label>
                  <textarea
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-[#F8FAF9] border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F6E56]"
                    required
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setJoinProject(null)}
                    className="btn-secondary py-2 px-4 text-xs"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={sendingJoin}
                    className="btn-primary py-2 px-5 text-xs"
                  >
                    {sendingJoin ? 'Envoi...' : 'Envoyer la demande'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
