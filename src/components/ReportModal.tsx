import React, { useState } from 'react';
import { Flag, X, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'solution' | 'project' | 'user';
  targetId: string;
  targetTitle: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
}) => {
  const [reason, setReason] = useState('Doublon ou solution déjà existante');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'submitted'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    try {
      await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          details,
        }),
      });
      setStatus('submitted');
    } catch (err: any) {
      setError(err.message || 'Impossible d enregistrer le signalement');
      setStatus('idle');
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setReason('Doublon ou solution déjà existante');
    setDetails('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A1118]/70 backdrop-blur-md flex items-center justify-center p-4 animate-page-enter">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 border border-slate-200 relative">
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#E4572E] border border-red-200 flex items-center justify-center shadow-sm">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#0F172A] tracking-tight">Signaler un problème</h3>
            <p className="text-xs text-slate-500 truncate max-w-xs font-medium">{targetTitle}</p>
          </div>
        </div>

        {status === 'submitted' ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-[#0F6E56]" />
            </div>
            <h4 className="text-base font-black text-[#0F172A]">Signalement bien reçu !</h4>
            <p className="text-xs text-slate-600 font-medium">
              Merci pour ta vigilance. Un pair modérateur va examiner cet élément dans les plus brefs délais.
            </p>
            <button
              onClick={handleClose}
              className="btn-primary w-full py-2.5 text-xs mt-2"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-[#E4572E] text-xs font-bold rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Motif du signalement
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0F6E56]"
              >
                <option value="Doublon ou solution déjà existante">Doublon ou solution déjà existante</option>
                <option value="Explication non claire ou imprécise">Explication non claire ou imprécise</option>
                <option value="Contenu inapproprié ou spam">Contenu inapproprié ou spam</option>
                <option value="Code non sécurisé">Code non sécurisé ou fuite de secrets</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Détails complémentaires (optionnel)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="Donne plus de précisions pour orienter la modération..."
                className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-[#0F6E56]"
              ></textarea>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary py-2 px-4 text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="btn-coral py-2.5 px-4 text-xs"
              >
                {status === 'submitting' ? 'Envoi...' : 'Envoyer le signalement'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
