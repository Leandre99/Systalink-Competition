import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HelpCircle,
  ShieldCheck,
  Eye,
  Send,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  Lock,
  Sparkles,
} from 'lucide-react';
import { maskSecrets, SolutionSheet, User } from '@shared/index';
import { apiFetch } from '../lib/api';

interface AskPageProps {
  currentUser: User;
}

const STACKS = ['React', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'Flutter', 'Docker', 'PostgreSQL', 'Tailwind', 'Go', 'Next.js'];

export const AskPage: React.FC<AskPageProps> = ({ currentUser }) => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stackTag, setStackTag] = useState('React');
  const [code, setCode] = useState('');
  
  const [isPreview, setIsPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [matchingSolution, setMatchingSolution] = useState<SolutionSheet | null>(null);
  const [solutions, setSolutions] = useState<SolutionSheet[]>([]);

  useEffect(() => {
    apiFetch<SolutionSheet[]>('/solutions')
      .then((sols) => setSolutions(sols))
      .catch((err) => console.warn('Erreur chargement fiches:', err));
  }, []);

  useEffect(() => {
    if (title.length > 5) {
      const match = solutions.find(
        (s) =>
          s.stackTag.toLowerCase() === stackTag.toLowerCase() &&
          (s.title.toLowerCase().includes(title.toLowerCase().substring(0, 10)) ||
            title.toLowerCase().includes(s.stackTag.toLowerCase()))
      );
      setMatchingSolution(match || null);
    } else {
      setMatchingSolution(null);
    }
  }, [title, stackTag, solutions]);

  const { maskedText, secretsCount } = maskSecrets(code);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !stackTag) {
      setErrorMessage('Merci de remplir tous les champs obligatoires.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await apiFetch<any>('/help-requests', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          stackTag,
          code,
          requesterId: currentUser.id,
          requesterName: currentUser.name,
        }),
      });

      navigate('/radar', { state: { newRequestId: created.id } });
    } catch (err: any) {
      setErrorMessage(err.message || 'Impossible d enregistrer ta demande.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-page-enter">
      {/* Existing Solution Matching Alert Banner */}
      {matchingSolution && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md animate-slide-in">
          <div className="flex items-start gap-3">
            <BookOpen className="w-6 h-6 text-[#0F6E56] shrink-0 mt-1" />
            <div>
              <span className="px-2.5 py-0.5 bg-[#0F6E56] text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                Fiche solution existante trouvée !
              </span>
              <h4 className="font-extrabold text-[#0F172A] text-base mt-1">
                {matchingSolution.title}
              </h4>
              <p className="text-xs text-slate-600 line-clamp-1 mt-0.5 font-medium">
                {matchingSolution.problem}
              </p>
            </div>
          </div>

          <Link
            to={`/solutions/${matchingSolution.id}`}
            className="btn-amber py-2.5 px-4 text-xs shrink-0"
          >
            <span>Consulter la solution</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </Link>
        </div>
      )}

      {/* Main Form Container */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#E2E8F0] shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0F6E56] border border-emerald-200 flex items-center justify-center shadow-sm">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#0F172A] tracking-tight">Appel à l’aide (SOS Dev)</h3>
              <p className="text-xs text-slate-500 font-medium">Nettoyage automatique des clés d’API, mots de passe et tokens avant diffusion.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              isPreview
                ? 'bg-[#0F6E56] text-white border-[#0F6E56] shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{isPreview ? 'Éditer le formulaire' : 'Aperçu avant envoi'}</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 text-[#E4572E] text-xs font-bold rounded-2xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isPreview ? (
          /* PREVIEW MODE */
          <div className="space-y-6 bg-[#F8FAF9] p-6 rounded-2xl border border-slate-200">
            <div className="space-y-2">
              <span className="px-3 py-1 bg-emerald-50 text-[#0F6E56] text-xs font-black rounded-full border border-emerald-200">
                {stackTag}
              </span>
              <h3 className="text-xl font-extrabold text-[#0F172A]">{title || 'Titre de la demande'}</h3>
              <p className="text-xs text-slate-500 font-medium">Demandeur : {currentUser.name} ({currentUser.city})</p>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Description du problème :</h4>
              <p className="text-sm text-slate-900 whitespace-pre-wrap font-medium">{description || 'Pas de description renseignée.'}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Aperçu du code transmis :</h4>
                {secretsCount > 0 && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-lg border border-amber-300 flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-[#F2A93B]" />
                    {secretsCount} secret(s) masqué(s)
                  </span>
                )}
              </div>
              <pre className="p-4 bg-[#0A1118] text-emerald-300 font-mono text-xs rounded-2xl overflow-x-auto border border-[#1E2E40]">
                <code>{maskedText || '// Aucun bloc de code spécifié'}</code>
              </pre>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPreview(false)}
                className="btn-secondary py-2.5 px-4 text-xs"
              >
                Revenir à l’édition
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary py-2.5 px-6 text-xs"
              >
                <Send className="w-4 h-4 text-white" />
                <span>{submitting ? 'Publication...' : 'Confirmer et envoyer sur le Radar'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* FORM EDIT MODE */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Titre du problème <span className="text-[#E4572E]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Erreur CORS sur API Express avec React Vite"
                  className="w-full px-4 py-2.5 bg-[#F8FAF9] border border-slate-300 rounded-xl text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#0F6E56] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Technologie / Stack <span className="text-[#E4572E]">*</span>
                </label>
                <select
                  value={stackTag}
                  onChange={(e) => setStackTag(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F8FAF9] border border-slate-300 rounded-xl text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#0F6E56]"
                >
                  {STACKS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Description du blocage <span className="text-[#E4572E]">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Raconte ce que tu essayais de faire, le comportement attendu et le message d erreur exact..."
                className="w-full px-4 py-2.5 bg-[#F8FAF9] border border-slate-300 rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#0F6E56] focus:bg-white font-medium transition-all"
              ></textarea>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#0F6E56]" />
                  <span>Code source ou logs (Secrets masqués automatiquement)</span>
                </label>
                {secretsCount > 0 ? (
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[11px] font-black rounded-full border border-amber-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#F2A93B]" />
                    {secretsCount} secret(s) masqué(s)
                  </span>
                ) : (
                  <span className="text-[11px] text-[#0F6E56] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Filtre actif
                  </span>
                )}
              </div>

              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={7}
                placeholder="// Colle ton extrait de code ou message d erreur ici..."
                className="w-full p-4 bg-[#0A1118] text-emerald-300 font-mono text-xs rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0F6E56] border border-[#1E2E40]"
              ></textarea>
            </div>

            {code && secretsCount > 0 && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-1">
                <span className="font-bold text-amber-900 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-[#F2A93B]" />
                  Aperçu sécurisé (Ce que ton binôme verra dans l éditeur) :
                </span>
                <pre className="p-3 bg-white rounded-xl border border-amber-200 text-slate-800 font-mono text-[11px] overflow-x-auto">
                  <code>{maskedText}</code>
                </pre>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPreview(true)}
                className="btn-secondary py-2.5 px-4 text-xs"
              >
                <Eye className="w-4 h-4" />
                <span>Voir l’aperçu</span>
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary py-2.5 px-6 text-xs"
              >
                <Send className="w-4 h-4 text-white" />
                <span>{submitting ? 'Publication...' : 'Publier sur le Radar'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
