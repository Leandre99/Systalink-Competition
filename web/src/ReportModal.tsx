import React, { useState } from 'react';
import type { ReportReason, ReportTargetType } from '@sos/shared';
import { createReport } from './api.js';

interface ReportModalProps {
  token: string;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const REASON_LABELS: Record<ReportReason, { label: string; description: string }> = {
  pas_clair: {
    label: 'Pas clair',
    description: 'Le contenu manque de précisions ou est incompréhensible.',
  },
  doublon: {
    label: 'Doublon',
    description: 'Ce contenu est déjà présent à un autre endroit.',
  },
  inapproprie: {
    label: 'Inapproprié',
    description: 'Contenu offensant, spammant ou non conforme aux règles.',
  },
};

export const ReportModal: React.FC<ReportModalProps> = ({ token, targetType, targetId, targetTitle, onClose, onSuccess }) => {
  const [reason, setReason] = useState<ReportReason>('pas_clair');
  const [details, setDetails] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setError('Veuillez cocher la case de confirmation.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createReport(token, {
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
        confirmed: true,
      });
      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du signalement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>
        <header className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🚩</span> Signaler un contenu
          </h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>

        {targetTitle && (
          <div style={{ fontSize: '0.9rem', color: '#a0aec0', marginTop: '0.5rem' }}>
            Cible : <strong>{targetTitle}</strong>
          </div>
        )}

        {success ? (
          <div className="alert alert-success" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(72, 187, 120, 0.1)', color: '#48bb78', borderRadius: '6px' }}>
            ✓ Signalement transmis à l'équipe de modération. Merci !
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <div className="alert alert-error" style={{ padding: '0.75rem', background: 'rgba(245, 101, 101, 0.1)', color: '#f56565', borderRadius: '6px', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Motif du signalement :</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(['pas_clair', 'doublon', 'inapproprie'] as ReportReason[]).map((r) => (
                  <label
                    key={r}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: reason === r ? '1px solid #4a5568' : '1px solid transparent',
                      background: reason === r ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      style={{ marginTop: '0.2rem' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>{REASON_LABELS[r].label}</div>
                      <div style={{ fontSize: '0.8rem', color: '#a0aec0' }}>{REASON_LABELS[r].description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Détails complémentaires (optionnel) :
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Précisez pourquoi ce contenu pose problème..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  background: '#1a202c',
                  border: '1px solid #4a5568',
                  color: '#edf2f7',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 0', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                id="report-confirm"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                style={{ marginTop: '0.15rem' }}
              />
              <label htmlFor="report-confirm" style={{ cursor: 'pointer', color: '#cbd5e0' }}>
                Je confirme l'exactitude de mon signalement (l'équipe humaine examinera ce contenu).
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={!confirmed || submitting}>
                {submitting ? 'Envoi...' : 'Signaler'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
