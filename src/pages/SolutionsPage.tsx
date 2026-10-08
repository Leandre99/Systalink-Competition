import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  CheckCircle2,
  Share2,
  Flag,
  ArrowLeft,
  Code2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { SolutionSheet } from '@shared/index';
import { apiFetch } from '../lib/api';
import { ListSkeleton } from '../components/Skeleton';
import { ReportModal } from '../components/ReportModal';

import { FALLBACK_SOLUTIONS } from '../lib/mockData';

export const SolutionsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [solutions, setSolutions] = useState<SolutionSheet[]>(FALLBACK_SOLUTIONS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('Tous');

  const [reportTarget, setReportTarget] = useState<SolutionSheet | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await apiFetch<SolutionSheet[]>('/solutions');
        if (isMounted && res && res.length > 0) setSolutions(res);
      } catch (err) {
        console.warn('Utilisation des solutions locales:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const tags = ['Tous', ...Array.from(new Set(solutions.map((s) => s.stackTag)))];

  const filteredSolutions = solutions.filter((s) => {
    const matchesTag = selectedTag === 'Tous' || s.stackTag.toLowerCase() === selectedTag.toLowerCase();
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.solution.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  if (id) {
    const sol = solutions.find((s) => s.id === id);

    if (loading) return <ListSkeleton count={2} />;

    if (!sol) {
      return (
        <div className="p-8 bg-white rounded-3xl border border-[#E2E8F0] text-center space-y-4 max-w-lg mx-auto shadow-sm">
          <h3 className="text-lg font-bold text-[#0F172A]">Fiche solution introuvable</h3>
          <Link to="/solutions" className="btn-primary py-2 text-xs inline-block">
            Retour à la bibliothèque
          </Link>
        </div>
      );
    }

    const whatsappShareText = encodeURIComponent(
      `💡 Fiche Solution KoraDevs : ${sol.title}\nCo-créée par ${sol.authorName} & ${sol.helperName}.\nVoir la solution : ${window.location.href}`
    );

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-page-enter">
        <div className="flex items-center justify-between">
          <Link to="/solutions" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0F6E56] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Toutes les fiches solutions</span>
          </Link>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/?text=${whatsappShareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary py-2 px-3.5 text-xs"
            >
              <Share2 className="w-3.5 h-3.5 text-white" />
              <span>Partager sur WhatsApp</span>
            </a>

            <button
              onClick={() => setReportTarget(sol)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Signaler"
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#E2E8F0] shadow-sm space-y-6">
          <div className="space-y-3 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-50 text-[#0F6E56] text-xs font-black rounded-full border border-emerald-200 shadow-sm">
                {sol.stackTag}
              </span>
              <span className="text-xs text-[#0F6E56] font-bold flex items-center gap-1 bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#F2A93B]" />
                Confirmée par test
              </span>
            </div>

            <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">{sol.title}</h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1 font-medium">
              <span>Co-créée par <strong className="text-slate-900">{sol.authorName}</strong> (Demandeur) & <strong className="text-slate-900">{sol.helperName}</strong> (Aidant)</span>
              <span>•</span>
              <span>Publiée le {new Date(sol.publishedAt).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-red-50/60 rounded-2xl border border-red-100 space-y-1">
              <h4 className="text-xs font-bold text-[#E4572E] uppercase tracking-wider">Problème rencontré :</h4>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">{sol.problem}</p>
            </div>

            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 space-y-1">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Cause racine identifiée :</h4>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">{sol.cause}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Solution validée :</h4>
            <p className="text-sm text-slate-900 leading-relaxed p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 font-medium">
              {sol.solution}
            </p>
          </div>

          {sol.codeSnippet && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-[#0F6E56]" />
                Extrait de code correctif :
              </h4>
              <pre className="p-4 bg-[#0A1118] text-emerald-300 font-mono text-xs rounded-2xl overflow-x-auto border border-[#1E2E40]">
                <code>{sol.codeSnippet}</code>
              </pre>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-[10px]">Preuve certifiée : {sol.proofHash}</span>
            <span className="font-black text-[#0F6E56] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#F2A93B]" />
              KoraDevs Certified
            </span>
          </div>
        </div>

        {reportTarget && (
          <ReportModal
            isOpen={!!reportTarget}
            onClose={() => setReportTarget(null)}
            targetType="solution"
            targetId={reportTarget.id}
            targetTitle={reportTarget.title}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-page-enter">
      <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une fiche par mots-clés (ex: CORS, React, Express)..."
            className="w-full text-sm text-[#0F172A] focus:outline-none placeholder-slate-400 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 shrink-0 mr-1">Technologies :</span>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedTag === tag
                  ? 'bg-gradient-to-r from-[#0F6E56] to-[#0A4F3E] text-white shadow-glow-emerald'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <ListSkeleton count={3} />
      ) : filteredSolutions.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-[#E2E8F0] text-center space-y-4 shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-base font-bold text-[#0F172A]">Aucune fiche solution trouvée</h4>
          <p className="text-xs text-slate-500 font-medium">Essaie avec d autres termes de recherche ou crée une demande d aide.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSolutions.map((sol) => (
            <Link
              key={sol.id}
              to={`/solutions/${sol.id}`}
              className="card-modern p-6 block group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-3 py-1 bg-emerald-50 text-[#0F6E56] text-xs font-black rounded-full border border-emerald-200">
                    {sol.stackTag}
                  </span>
                  <span className="text-xs text-[#0F6E56] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#F2A93B]" />
                    Confirmée
                  </span>
                </div>

                <h3 className="font-extrabold text-[#0F172A] text-base group-hover:text-[#0F6E56] transition-colors mb-2">
                  {sol.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2 mb-4 font-medium leading-relaxed">
                  {sol.problem}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Par {sol.authorName} & {sol.helperName}</span>
                <span className="font-bold text-[#0F6E56] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Lire la fiche <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
