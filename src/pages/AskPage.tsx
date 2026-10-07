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
} from 'lucide-react';
import { maskSecrets, SolutionSheet, User } from '@shared/index';
import { apiFetch } from '../lib/api';

interface AskPageProps {
  currentUser: User;
}

const STACKS = ['React', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'Flutter', 'Docker', 'PostgreSQL', 'Tailwind'];

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
        <div className="bg-[#EFF6FF] border-2 border-[#2563EB] rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md animate-slide-in">
          <div className="flex items-start gap-3">
            <BookOpen className="w-6 h-6 text-[#2563EB] shrink-0 mt-1" />
            <div>
              <span className="px-2.5 py-0.5 bg-[#2563EB] text-white text-[10px] font-extrabold rounded uppercase tracking-wider">
                Fiche existante disponible !
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
            className="btn-primary py-2 px-4 text-xs shrink-0"
          >
            <span>Consulter la solution</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Main Form Container */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#E2E8F0] shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] text-[#2563EB] border border-blue-200 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#0F172A]">Formulaire d’appel à l’aide</h3>
              <p className="text-xs text-slate-500 font-medium">Tes mots de passe et clés API sont masqués localement avant envoi.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              isPreview
                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow'
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
          <div className="space-y-6 bg-[#F8FAFC] p-6 rounded-2xl border border-slate-200">
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-xs font-extrabold rounded-full border border-blue-200">
                {stackTag}
              </span>
              <h3 className="text-xl font-extrabold text-[#0F172A]">{title || 'Titre de la demande'}</h3>
              <p className="text-xs text-slate-500 font-medium">Demandeur : {currentUser.name} ({currentUser.city})</p>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Description de l’erreur :</h4>
              <p className="text-sm text-slate-900 whitespace-pre-wrap font-medium">{description || 'Pas de description renseignée.'}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Aperçu du code transmis :</h4>
                {secretsCount > 0 && (
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-extrabold rounded-lg border border-amber-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#F59E0B]" />
                    {secretsCount} secret(s) masqué(s)
                  </span>
                )}
              </div>
              <pre className="p-4 bg-slate-900 text-blue-300 font-mono text-xs rounded-2xl overflow-x-auto border border-slate-800">
                <code>{maskedText || '// Aucun bloc de code spécifié'}</code>
              </pre>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPreview(false)}
                className="btn-secondary py-2 px-4 text-xs"
              >
                Revenir à l’édition
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary py-2.5 px-6 text-xs"
              >
                <Send className="w-4 h-4 text-[#F59E0B]" />
                <span>{submitting ? 'Publication...' : 'Confirmer et envoyer'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* FORM EDIT MODE */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Titre de la demande <span className="text-[#E4572E]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Erreur CORS sur API Express avec React Vite"
                  className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Technologie / Stack <span className="text-[#E4572E]">*</span>
                </label>
                <select
                  value={stackTag}
                  onChange={(e) => setStackTag(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                >
                  {STACKS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Explique ce qui se passe <span className="text-[#E4572E]">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Raconte ce que tu essayais de faire, le comportement attendu et le message d erreur exact..."
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:bg-white font-medium transition-all"
              ></textarea>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Code source ou message d’erreur (Secrets masqués automatiquement)
                </label>
                {secretsCount > 0 ? (
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[11px] font-bold rounded-md border border-amber-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#F59E0B]" />
                    {secretsCount} secret(s) identifié(s) & masqué(s)
                  </span>
                ) : (
                  <span className="text-[11px] text-[#0F766E] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Protection active
                  </span>
                )}
              </div>

              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={7}
                placeholder="// Colle ton extrait de code ou message d erreur ici..."
                className="w-full p-4 bg-slate-900 text-blue-300 font-mono text-xs rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              ></textarea>
            </div>

            {code && secretsCount > 0 && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-1">
                <span className="font-bold text-amber-900 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
                  Aperçu nettoyé (Ce que l aidant verra sur l écran) :
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
                className="btn-secondary py-2 px-4 text-xs"
              >
                <Eye className="w-4 h-4" />
                <span>Voir l’aperçu</span>
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary py-2.5 px-6 text-xs"
              >
                <Send className="w-4 h-4 text-[#F59E0B]" />
                <span>{submitting ? 'Envoi...' : 'Publier sur le Radar'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
