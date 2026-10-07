import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  FolderGit2,
  BookOpen,
  Sparkles,
  ArrowRight,
  Bell,
  CheckCircle2,
  Search,
  Users,
  Radar,
  Zap,
} from 'lucide-react';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { ListSkeleton } from '../components/Skeleton';
import { apiFetch } from '../lib/api';
import { User, SolutionSheet, Project } from '@shared/index';

interface DiscoverPageProps {
  currentUser: User;
  onOpenDoorbell: () => void;
}

export const DiscoverPage: React.FC<DiscoverPageProps> = ({ currentUser, onOpenDoorbell }) => {
  const [solutions, setSolutions] = useState<SolutionSheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [sols, projs, usrs] = await Promise.all([
          apiFetch<SolutionSheet[]>('/solutions'),
          apiFetch<Project[]>('/projects'),
          apiFetch<User[]>('/users'),
        ]);
        if (isMounted) {
          setSolutions(sols);
          setProjects(projs);
          setUsers(usrs);
        }
      } catch (err) {
        console.warn('Erreur chargement page Découvrir:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const openNeighbors = users.filter((u) => u.doorOpen && u.id !== currentUser.id);

  const filteredSolutions = solutions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.stackTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.problem.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-page-enter">
      {/* Onboarding 4 Steps Checklist */}
      <OnboardingChecklist currentUser={currentUser} />

      {/* Hero Welcome Card - Authentic Kora Emerald + Amber Accent */}
      <div className="bg-gradient-to-br from-[#0A1118] via-[#0F6E56] to-[#0A4F3E] text-white rounded-3xl p-6 md:p-10 shadow-2xl border border-emerald-500/40 relative overflow-hidden">
        {/* Background Decorative Mesh & Glows */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#F2A93B]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 -bottom-20 w-60 h-60 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-3xl relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#F2A93B]/15 backdrop-blur-md rounded-full text-xs font-black text-[#F2A93B] border border-[#F2A93B]/30 shadow-sm">
            <Sparkles className="w-4 h-4" />
            <span>Quartier numérique & entraide en direct entre développeurs africains</span>
          </div>

          <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-tight text-white">
            Bloqué sur ton code ? Un voisin disponible te rejoint en <span className="text-[#F2A93B]">1 clic</span>.
          </h2>

          <p className="text-sm text-emerald-100 leading-relaxed font-medium">
            Résolution instantanée via l’éditeur collaboratif CodeFlash : confirmation par test automatique, fiche de savoir partagée et valorisation sur ton Passeport certifié.
          </p>

          {/* Stat Counter Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3.5 rounded-2xl">
              <p className="text-xl font-black text-white">{solutions.length || 3}</p>
              <p className="text-[11px] font-bold text-emerald-200">Fiches Publiées</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3.5 rounded-2xl">
              <p className="text-xl font-black text-[#F2A93B] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                {openNeighbors.length || 2}
              </p>
              <p className="text-[11px] font-bold text-emerald-200">Voisins Porte Ouverte</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3.5 rounded-2xl">
              <p className="text-xl font-black text-white">28</p>
              <p className="text-[11px] font-bold text-emerald-200">Aides Confirmées</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3.5 rounded-2xl">
              <p className="text-xl font-black text-[#F2A93B]">100%</p>
              <p className="text-[11px] font-bold text-emerald-200">Preuves par le Test</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/ask"
              className="btn-amber py-3 px-6 text-sm"
            >
              <HelpCircle className="w-4 h-4 text-white" />
              <span>Demander de l’aide (SOS Dev)</span>
            </Link>

            <button
              onClick={onOpenDoorbell}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/25 transition-all flex items-center gap-2 shadow"
            >
              <Bell className="w-4 h-4 text-[#F2A93B] animate-bell-swing" />
              <span>Sonner chez un voisin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Search Engine */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-3 focus-within:border-[#0F6E56] focus-within:shadow-md transition-all">
        <Search className="w-5 h-5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une fiche solution, un bug (ex: CORS, React, Express, useEffect, Docker)..."
          className="w-full text-sm text-[#0F172A] focus:outline-none placeholder-slate-400 font-medium"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2">
            Effacer
          </button>
        )}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols): Solutions & Projects */}
        <div className="lg:col-span-2 space-y-8">
          {/* Solutions Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#0F6E56]" />
                <span>Fiches solutions récentes</span>
              </h3>
              <Link to="/solutions" className="text-xs font-bold text-[#0F6E56] hover:underline flex items-center gap-1">
                <span>Voir toutes les fiches</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <ListSkeleton count={2} />
            ) : filteredSolutions.length === 0 ? (
              <div className="p-8 bg-white rounded-3xl border border-[#E2E8F0] text-center space-y-3 shadow-sm">
                <p className="text-sm text-slate-500 font-medium">Aucune fiche solution ne correspond à ta recherche.</p>
                <Link to="/ask" className="btn-primary py-2 text-xs">
                  Poser la première question
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSolutions.slice(0, 3).map((sol, index) => (
                  <motion.div
                    key={sol.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.08 }}
                  >
                    <Link
                      to={`/solutions/${sol.id}`}
                      className="card-modern p-6 block group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-3 py-1 bg-emerald-50 text-[#0F6E56] text-xs font-extrabold rounded-full border border-emerald-200 shadow-sm">
                          {sol.stackTag}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          {new Date(sol.publishedAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-[#0F172A] group-hover:text-[#0F6E56] transition-colors mb-2 text-base md:text-lg">
                        {sol.title}
                      </h4>

                      <p className="text-xs md:text-sm text-slate-600 line-clamp-2 mb-4 font-medium leading-relaxed">
                        {sol.problem}
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-3.5 border-t border-slate-100">
                        <span className="flex items-center gap-1 font-semibold">
                          Co-créée par <strong className="text-slate-900">{sol.authorName}</strong> & <strong className="text-slate-900">{sol.helperName}</strong>
                        </span>
                        <span className="font-extrabold text-[#0F6E56] flex items-center gap-1.5 bg-[#ECFDF5] px-3 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-[#0F6E56]" />
                          Confirmée par Test
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Projects Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-[#0F6E56]" />
                <span>Projets en quête de coéquipiers</span>
              </h3>
              <Link to="/projects" className="text-xs font-bold text-[#0F6E56] hover:underline flex items-center gap-1">
                <span>Voir la vitrine</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <ListSkeleton count={2} />
            ) : projects.length === 0 ? (
              <div className="p-8 bg-white rounded-3xl border border-[#E2E8F0] text-center space-y-3 shadow-sm">
                <p className="text-sm text-slate-500 font-medium">Aucun projet à afficher.</p>
                <Link to="/projects" className="btn-primary py-2 text-xs">
                  Présenter mon projet
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.slice(0, 2).map((proj) => (
                  <Link
                    key={proj.id}
                    to={`/projects/${proj.id}`}
                    className="card-modern p-5 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="font-extrabold text-[#0F172A] text-base group-hover:text-[#0F6E56] transition-colors">{proj.name}</h4>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {proj.city}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-4 font-medium">
                        {proj.description}
                      </p>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {proj.rolesNeeded.map((r, i) => (
                          <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-md border border-amber-200">
                            {r}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#0F6E56] font-bold pt-3 border-t border-slate-100">
                        <span>{proj.membersCount} membre(s)</span>
                        <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Demander à rejoindre
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Neighbors & Radar Quick Info */}
        <div className="space-y-6">
          {/* Neighbors with Door Open */}
          <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0F6E56]" />
                <span>Voisins la porte ouverte</span>
              </h3>
              <span className="px-2.5 py-0.5 bg-[#ECFDF5] text-[#0F6E56] text-[10px] font-extrabold rounded-full border border-emerald-200">
                {openNeighbors.length} dispo
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Ces développeurs de la communauté acceptent les alertes de sonnette pour t’aider immédiatement.
            </p>

            <div className="space-y-3">
              {openNeighbors.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 font-medium border border-slate-200">
                  Aucun voisin en ligne. Ouvre ta propre porte sur /maison !
                </div>
              ) : (
                openNeighbors.map((n) => (
                  <div key={n.id} className="p-3 bg-[#F8FAF9] rounded-2xl border border-slate-200 flex items-center justify-between hover:border-emerald-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={n.avatar} alt={n.name} className="w-9 h-9 rounded-full object-cover border-2 border-[#0F6E56]" />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0F172A]">{n.name}</h4>
                        <p className="text-[10px] text-slate-500 font-medium">{n.city} • <span className="text-[#0F6E56]">{n.stack.slice(0, 2).join(', ')}</span></p>
                      </div>
                    </div>

                    <button
                      onClick={onOpenDoorbell}
                      className="p-2 text-[#F2A93B] hover:bg-amber-50 rounded-xl transition-colors"
                      title="Sonner à sa porte"
                    >
                      <Bell className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Radar Call to Action */}
          <div className="bg-gradient-to-br from-[#0A1118] via-[#101A24] to-[#0A4F3E] p-6 rounded-3xl text-white shadow-xl space-y-3 border border-emerald-500/30 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#F2A93B]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 relative z-10">
              <Radar className="w-5 h-5 text-[#F2A93B] animate-pulse-subtle" />
              <h4 className="font-extrabold text-base text-white">Le Radar des aidants</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium relative z-10">
              Tu as quelques minutes de libre ? Consulte les demandes bloquées et aide un développeur voisin à passer son test au vert !
            </p>
            <Link
              to="/radar"
              className="btn-primary w-full justify-center text-xs py-2.5 mt-2 relative z-10"
            >
              <span>Accéder au Radar</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
