import React, { useEffect, useState } from 'react';
import type { Passport, PassportProof, PublicUser } from '@sos/shared';
import { getPublicPassport, passport, revokePassportProof } from './api.js';

interface PassportViewProps {
  token?: string | null;
  currentUser?: PublicUser | null;
  targetLogin?: string | null;
  onClosePublic?: () => void;
}

export const PassportView: React.FC<PassportViewProps> = ({ token, currentUser, targetLogin, onClosePublic }) => {
  const isPublicView = Boolean(targetLogin && targetLogin !== currentUser?.login);
  const [profile, setProfile] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState(false);
  const [selectedProof, setSelectedProof] = useState<PassportProof | null>(null);
  const [togglingRevoke, setTogglingRevoke] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isPublicView && targetLogin) {
        const data = await getPublicPassport(targetLogin);
        setProfile(data);
      } else if (token) {
        const data = await passport(token);
        setProfile(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du passeport.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [token, targetLogin]);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <span className="dot on" style={{ marginBottom: '0.5rem', display: 'inline-block' }} />
        <p>Chargement du passeport développeur...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="card" style={{ borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }}>
        <h3 style={{ color: '#f87171' }}>⚠️ Impossible d'afficher le passeport</h3>
        <p>{error || 'Passeport introuvable.'}</p>
        {onClosePublic && (
          <button type="button" onClick={onClosePublic} style={{ marginTop: '0.5rem' }}>
            Fermer
          </button>
        )}
      </div>
    );
  }

  const publicLink = `${window.location.origin}/#/passport/@${profile.user.login}`;

  const handleShareWhatsApp = () => {
    const text = `Découvrez mon Passeport Développeur KoraDevs (@${profile.user.login}) : ${profile.helpsConfirmed} entraide(s) confirmée(s) ! Lien vérifié : ${publicLink}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(publicLink);
    setCopyNotice(true);
    setTimeout(() => setCopyNotice(false), 3000);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleToggleRevoke = async (proof: PassportProof) => {
    if (!token || isPublicView) return;
    setTogglingRevoke(true);
    try {
      await revokePassportProof(token, proof.id, !proof.revoked);
      const updatedProof = { ...proof, revoked: !proof.revoked };
      setSelectedProof(updatedProof);
      // Reload overall passport
      const fresh = await passport(token);
      setProfile(fresh);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la modification de visibilité.');
    } finally {
      setTogglingRevoke(false);
    }
  };

  return (
    <div className="passport-view-container">
      {/* Visual Header Badge for Print and UI */}
      <section className="card passport printable-passport" style={{ position: 'relative' }}>
        {onClosePublic && (
          <button
            type="button"
            onClick={onClosePublic}
            className="no-print"
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {profile.user.avatarUrl ? (
            <img src={profile.user.avatarUrl} alt={profile.user.login} style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #3b82f6' }} />
          ) : (
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 'bold' }}>
              {profile.user.login.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h2 style={{ margin: 0, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📜 Passeport Développeur — @{profile.user.login}
            </h2>
            <p className="hint" style={{ margin: '0.2rem 0 0 0' }}>
              {isPublicView ? 'Vue publique certifiée par le réseau KoraDevs' : 'Vos preuves d’intervention vérifiées et certifiées'}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="passport-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center' }}>
            <strong style={{ display: 'block', fontSize: '1.4rem', color: '#60a5fa' }}>{profile.helpsConfirmed}</strong>
            <span style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Aides confirmées</span>
          </div>
          <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center' }}>
            <strong style={{ display: 'block', fontSize: '1.4rem', color: profile.hasConfirmedBadge ? '#34d399' : '#fbbf24' }}>
              {profile.hasConfirmedBadge ? '🏅 Confirmé' : 'En cours'}
            </strong>
            <span style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Statut Badge</span>
          </div>
          <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center' }}>
            <strong style={{ display: 'block', fontSize: '1.4rem', color: '#f59e0b' }}>{profile.points} pts</strong>
            <span style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Points non-compétitifs</span>
          </div>
          <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center' }}>
            <strong style={{ display: 'block', fontSize: '1.4rem', color: '#a78bfa' }}>
              {profile.averageResolutionMinutes == null ? 'N/A' : `${profile.averageResolutionMinutes} min`}
            </strong>
            <span style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Temps moyen</span>
          </div>
        </div>

        {/* Technologies Badge List */}
        {profile.technologies.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <span className="hint" style={{ display: 'block', marginBottom: '0.4rem' }}>Technologies validées sur le terrain :</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {profile.technologies.map((t) => (
                <span key={t} style={{ fontSize: '0.85rem', padding: '3px 10px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons (hidden on print) */}
        {!isPublicView && (
          <div className="actions no-print" style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleShareWhatsApp} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none' }}>
              📲 Partager sur WhatsApp
            </button>
            <button type="button" onClick={handleCopyLink} style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' }}>
              {copyNotice ? '✓ Lien copié !' : '🔗 Copier le lien public'}
            </button>
            <button type="button" onClick={handleExportPDF} style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none' }}>
              📄 Exporter en PDF
            </button>
          </div>
        )}
      </section>

      {/* Preuves Cliquables Section */}
      <section className="card" style={{ marginTop: '1.25rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔍</span> Preuves d’entraide certifiées ({profile.proofs.length})
        </h3>
        <p className="hint">
          {isPublicView
            ? 'Seules les preuves publiques autorisées par le développeur sont affichées.'
            : 'Cliquez sur une preuve pour consulter son hash cryptographique SHA-256 ou ajuster sa visibilité publique.'}
        </p>

        {profile.proofs.length === 0 ? (
          <p className="hint" style={{ marginTop: '1rem', fontStyle: 'italic' }}>
            Aucune preuve pour le moment.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {profile.proofs.map((proof) => (
              <div
                key={proof.id}
                onClick={() => setSelectedProof(proof)}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  background: proof.revoked ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.04)',
                  border: proof.revoked ? '1px dashed #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  transition: 'background 0.2s',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#60a5fa', marginBottom: '0.25rem' }}>
                    {proof.summary}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#a0aec0', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>📅 {new Date(proof.confirmedAt).toLocaleDateString('fr-FR')}</span>
                    <span>🔑 SHA-256: <code>{proof.proofHash.slice(0, 12)}...</code></span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    {proof.tech.map((t) => (
                      <span key={t} style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {proof.revoked ? (
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.2)', color: '#f87171', fontWeight: 'bold' }}>
                      🔒 Masquée
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 'bold' }}>
                      🌐 Publique
                    </span>
                  )}
                  <button type="button" className="btn-small" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                    Détails →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Proof Details Modal */}
      {selectedProof && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedProof(null)}
        >
          <div className="card" style={{ maxWidth: '540px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ margin: 0, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🏅 Preuve d’entraide certifiée
              </h3>
              <button type="button" onClick={() => setSelectedProof(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div>
                <strong>Intervention :</strong>
                <p style={{ margin: '0.2rem 0 0 0', opacity: 0.9 }}>{selectedProof.summary}</p>
              </div>

              <div>
                <strong>Empreinte cryptographique (Hash SHA-256) :</strong>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '4px', color: '#34d399', margin: '0.2rem 0 0 0' }}>
                  {selectedProof.proofHash}
                </pre>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <strong>Date de confirmation :</strong>
                  <div style={{ opacity: 0.9 }}>{new Date(selectedProof.confirmedAt).toLocaleString('fr-FR')}</div>
                </div>
                <div>
                  <strong>Statut public :</strong>
                  <div style={{ color: selectedProof.revoked ? '#f87171' : '#34d399', fontWeight: 'bold' }}>
                    {selectedProof.revoked ? '🔒 Masquée (Révoquée)' : '🌐 Publique (Vérifiée)'}
                  </div>
                </div>
              </div>

              <div>
                <strong>Technologies certifiées :</strong>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {selectedProof.tech.map((t) => (
                    <span key={t} style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {!isPublicView && token && (
              <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="hint" style={{ fontSize: '0.8rem' }}>
                  {selectedProof.revoked ? 'Actuellement masquée du lien public' : 'Actuellement visible sur le lien public'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleRevoke(selectedProof)}
                  disabled={togglingRevoke}
                  style={{ backgroundColor: selectedProof.revoked ? '#10b981' : '#ef4444', color: '#fff' }}
                >
                  {togglingRevoke ? 'Mise à jour...' : selectedProof.revoked ? '🌐 Réactiver la preuve' : '🔒 Masquer du passeport public'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
