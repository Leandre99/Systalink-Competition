import { useEffect, useState } from 'react';
import { KNOWN_TECH, type SolutionHit } from '@sos/shared';
import { getDiscoverData, type DiscoverData } from './api.js';
import { ReportModal } from './ReportModal.js';

interface DiscoverProps {
  token: string;
  userTech: string[];
}

export function Discover({ token, userTech }: DiscoverProps) {
  const [query, setQuery] = useState('');
  const [selectedTech, setSelectedTech] = useState<string[]>(userTech || []);
  const [data, setData] = useState<DiscoverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSolution, setSelectedSolution] = useState<SolutionHit | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDiscoverData(token, query, selectedTech);
      setData(res);
    } catch (err) {
      setError((err as Error).message || 'Erreur lors de la récupération des données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selectedTech]);

  const toggleTech = (t: string) => {
    setSelectedTech((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  return (
    <section className="discover-section">
      <div className="card">
        <h2>🧭 Découvrir le réseau KoraDevs</h2>
        <p className="hint">
          Explorez les fiches de solutions validées par la communauté, les projets actuellement bloqués et les aidants en ligne disponibles.
        </p>

        {/* Barre de recherche & Filtres */}
        <div style={{ margin: '16px 0' }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par erreur, commande, technologie ou aidant..."
            style={{ width: '100%', marginBottom: '12px' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85em', opacity: 0.8, marginRight: '4px' }}>Filtre techno :</span>
            {KNOWN_TECH.map((t) => {
              const active = selectedTech.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTech(t)}
                  className={active ? 'btn-small on' : 'btn-small'}
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.8em',
                    borderRadius: '12px',
                    background: active ? 'var(--accent, #3b82f6)' : 'rgba(255,255,255,0.08)',
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
          <h3 style={{ color: '#f87171' }}>⚠️ Erreur de chargement</h3>
          <p>{error}</p>
          <button type="button" onClick={() => void fetchData()} style={{ marginTop: '8px' }}>
            🔄 Réessayer
          </button>
        </div>
      )}

      {/* État LOADING */}
      {loading && !error && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <span className="dot on" style={{ display: 'inline-block', marginBottom: '8px' }} />
          <p>Chargement des données du réseau...</p>
        </div>
      )}

      {/* RÉSULTATS */}
      {!loading && !error && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
          {/* SECTION 1 : FICHES SOLUTIONS PUBLIÉES */}
          <div className="card">
            <h3>📜 Fiches Solutions Publiées ({data.solutions.length})</h3>
            {data.solutions.length === 0 ? (
              <p className="hint">Aucune fiche solution publiée ne correspond à votre recherche ou filtre.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginTop: '12px' }}>
                {data.solutions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSolution(s)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      transition: 'transform 0.1s, border-color 0.1s',
                    }}
                  >
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1em', color: '#60a5fa' }}>{s.title}</h4>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.85em', opacity: 0.8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {s.cause || s.error}
                    </p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {s.tech.map((t) => (
                        <span key={t} style={{ fontSize: '0.75em', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2 : PROJETS ET DEMANDES SOS OUVERTES */}
          <div className="card">
            <h3>🚀 Projets & Demandes SOS Ouvertes ({data.openRequests.length})</h3>
            {data.openRequests.length === 0 ? (
              <p className="hint">Aucune demande SOS ouverte actuellement. Tous les développeurs sont accompagnés !</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginTop: '12px' }}>
                {data.openRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <code style={{ fontSize: '0.85em', color: '#10b981' }}>{req.command}</code>
                      <span style={{ fontSize: '0.75em', padding: '2px 6px', borderRadius: '4px', background: '#f59e0b', color: '#000', fontWeight: 'bold' }}>
                        {req.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {req.tech.map((t) => (
                        <span key={t} style={{ fontSize: '0.75em', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        window.location.hash = `#/salle/${req.id}`;
                      }}
                      style={{ width: '100%', padding: '6px', fontSize: '0.85em' }}
                    >
                      🤝 Rejoindre et aider
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3 : AIDANTS DISPONIBLES */}
          <div className="card">
            <h3>👥 Aidants Connectés & Disponibles ({data.availableHelpers.length})</h3>
            {data.availableHelpers.length === 0 ? (
              <p className="hint">Aucun aidant en ligne disponible pour le moment. Passez en mode disponible sur le Radar pour apparaître ici !</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginTop: '12px' }}>
                {data.availableHelpers.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span className="dot on" title="En ligne" />
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: '0.95em' }}>@{h.login}</strong>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {h.tech.map((t) => (
                          <span
                            key={t}
                            onClick={() => toggleTech(t)}
                            style={{ fontSize: '0.7em', padding: '1px 4px', borderRadius: '3px', background: 'rgba(59,130,246,0.3)', cursor: 'pointer' }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL FICHE SOLUTION */}
      {selectedSolution && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setSelectedSolution(null)}
        >
          <div
            className="card"
            style={{ maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ color: '#60a5fa', margin: 0 }}>{selectedSolution.title}</h3>
              <button type="button" onClick={() => setSelectedSolution(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2em', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
            <div style={{ margin: '12px 0', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {selectedSolution.tech.map((t) => (
                <span key={t} style={{ fontSize: '0.8em', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59,130,246,0.3)' }}>
                  {t}
                </span>
              ))}
            </div>

            <h4 style={{ margin: '12px 0 4px 0' }}>Symptôme & Erreur :</h4>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85em', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '4px' }}>
              {selectedSolution.error}
            </pre>

            <h4 style={{ margin: '12px 0 4px 0' }}>Cause identifiée :</h4>
            <p style={{ fontSize: '0.9em', opacity: 0.9 }}>{selectedSolution.cause || 'Non renseignée.'}</p>

            <h4 style={{ margin: '12px 0 4px 0' }}>Correction validée :</h4>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85em', background: 'rgba(16,185,129,0.1)', color: '#34d399', padding: '8px', borderRadius: '4px' }}>
              {selectedSolution.fix || 'Non renseignée.'}
            </pre>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setReportModalOpen(true)}
                style={{ background: 'none', border: '1px solid #718096', color: '#a0aec0', fontSize: '0.85em' }}
              >
                🚩 Signaler cette fiche
              </button>
            </div>
          </div>
        </div>
      )}

      {reportModalOpen && selectedSolution && (
        <ReportModal
          token={token}
          targetType="fiche_solution"
          targetId={selectedSolution.id}
          targetTitle={`Fiche : ${selectedSolution.title}`}
          onClose={() => setReportModalOpen(false)}
        />
      )}
    </section>
  );
}
