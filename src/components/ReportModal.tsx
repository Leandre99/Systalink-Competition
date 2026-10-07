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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-page-enter">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E4572E] border border-red-200 flex items-center justify-center">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Signaler un problème</h3>
            <p className="text-xs text-gray-500 truncate max-w-xs">{targetTitle}</p>
          </div>
        </div>

        {status === 'submitted' ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#0F766E] mx-auto" />
            <h4 className="text-base font-bold text-gray-900">Signalement bien reçu !</h4>
            <p className="text-xs text-gray-600">
              Merci pour ta vigilance. Un modérateur humain va analyser cet élément dans les plus brefs délais.
            </p>
            <button
              onClick={handleClose}
              className="px-5 py-2 bg-[#0F766E] text-white text-xs font-semibold rounded-xl hover:bg-[#0D9488]"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-[#E4572E] text-xs font-medium rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Motif du signalement
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2563EB]"
              >
                <option value="Doublon ou solution déjà existante">Doublon ou solution déjà existante</option>
                <option value="Explication non claire ou imprécise">Explication non claire ou imprécise</option>
                <option value="Contenu inapproprié ou spam">Contenu inapproprié ou spam</option>
                <option value="Code non sécurisé">Code non sécurisé</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Détails complémentaires (optionnel)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="Donne plus de précisions si nécessaire..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#2563EB]"
              ></textarea>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="px-4 py-2 bg-[#E4572E] hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow transition-transform active:scale-95"
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
