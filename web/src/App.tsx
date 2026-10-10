import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { KNOWN_TECH, maskSecrets, type Passport, type PublicUser, type RadarAlert, type RadarStage, type ServerMessage, type SolutionHit, type SosRequest } from '@sos/shared';
import { connectRadar, createRequest, forgetToken, loginDev, logout, me, passport, savedToken, searchSolutions } from './api.js';
import { Discover } from './Discover.js';
import { Vitrine } from './Vitrine.js';
import { PassportView } from './PassportView.js';
import { CafModule } from './CafModule.js';


// The editor (CodeMirror + Yjs) is only loaded when entering a room.
const Salle = lazy(() => import('./Salle.js').then((m) => ({ default: m.Salle })));

const STAGE_LABEL: Record<RadarStage, string> = {
  ciblee: 'Ta techno',
  elargie: 'Alerte élargie',
  publique: 'File publique',
};

const salleFromHash = () => /^#\/salle\/([0-9a-f-]{36})$/i.exec(location.hash)?.[1] ?? null;
const passportFromHash = () => /^#\/?passport\/@?([A-Za-z0-9][A-Za-z0-9-]{0,38})$/i.exec(location.hash)?.[1] ?? null;

function since(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  return s < 60 ? `il y a ${s} s` : `il y a ${Math.floor(s / 60)} min`;
}

function Login({ onLogin }: { onLogin: (token: string, user: PublicUser) => void }) {
  const [pseudo, setPseudo] = useState('');
  const [error, setError] = useState('');
  return (
    <main className="card narrow">
      <h1>SOS Dev — Radar</h1>
      <p>Les développeurs bloqués t’appellent depuis leur terminal. Indique tes technos et deviens disponible.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const session = await loginDev(pseudo);
            onLogin(session.token, session.user);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <label htmlFor="pseudo">Pseudo (mode démo)</label>
        <input id="pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="awa" autoFocus required />
        <button type="submit">Se connecter</button>
        {error && <p className="error">{error}</p>}
      </form>
      <p className="hint">La connexion GitHub sur le web arrive bientôt.</p>
    </main>
  );
}

export function App() {
  const [token, setToken] = useState<string | null>(savedToken());
  const [user, setUser] = useState<PublicUser | null>(null);
  const [tech, setTech] = useState<string[]>(() => JSON.parse(localStorage.getItem('sos.tech') ?? '[]') as string[]);
  const [city, setCity] = useState<string>(() => localStorage.getItem('sos.city') ?? '');
  const [country, setCountry] = useState<string>(() => localStorage.getItem('sos.country') ?? '');
  const [available, setAvailable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState<RadarAlert[]>([]);
  const [taken, setTaken] = useState<{ requestId: string; requester: PublicUser } | null>(null);
  const [notice, setNotice] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [solutionQuery, setSolutionQuery] = useState('');
  const [solutions, setSolutions] = useState<SolutionHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [profile, setProfile] = useState<Passport | null>(null);
  const [activeTab, setActiveTab] = useState<'maison' | 'radar' | 'solutions' | 'appel' | 'discover' | 'vitrine' | 'caf'>('radar');

  const radar = useRef<ReturnType<typeof connectRadar> | null>(null);
  const [salle, setSalle] = useState<string | null>(salleFromHash());
  const [publicPassport, setPublicPassport] = useState<string | null>(passportFromHash());

  // Formulaire d'Appel à l'aide Web
  const [appelCommand, setAppelCommand] = useState('npm start');
  const [appelError, setAppelError] = useState('');
  const [appelCode, setAppelCode] = useState('');
  const [appelFilePath, setAppelFilePath] = useState('src/App.tsx');
  const [appelTech, setAppelTech] = useState<string[]>(['TypeScript']);
  const [appelStep, setAppelStep] = useState<'form' | 'preview' | 'success'>('form');
  const [appelSending, setAppelSending] = useState(false);
  const [appelErrNotice, setAppelErrNotice] = useState('');
  const [createdReqId, setCreatedReqId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    maskedErrorText: string;
    maskedCodeText: string;
    findingsCount: number;
    existingHits: SolutionHit[];
  } | null>(null);

  useEffect(() => {
    const onHash = () => {
      setSalle(salleFromHash());
      setPublicPassport(passportFromHash());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!token) return;
    me(token).then(setUser, () => {
      forgetToken();
      setToken(null);
    });
  }, [token]);

  useEffect(() => {
    if (!token || !user || salle) return;
    const onMessage = (m: ServerMessage) => {
      switch (m.type) {
        case 'bienvenue':
          setConnected(true);
          break;
        case 'alerte':
          setAlerts((list) => [m.alert, ...list.filter((a) => a.requestId !== m.alert.requestId)]);
          break;
        case 'retirer':
          setAlerts((list) => list.filter((a) => a.requestId !== m.requestId));
          break;
        case 'prise':
          setTaken({ requestId: m.requestId, requester: m.requester });
          setAlerts((list) => list.filter((a) => a.requestId !== m.requestId));
          location.hash = `#/salle/${m.requestId}`;
          break;
        case 'erreur':
          setNotice(m.message);
          break;
      }
    };
    radar.current = connectRadar(token, onMessage, () => {
      setConnected(false);
      setAvailable(false);
    });
    return () => radar.current?.close();
  }, [token, user, salle]);

  if (!token || !user) return <Login onLogin={(t, u) => (setToken(t), setUser(u))} />;
  if (salle) {
    return (
      <Suspense fallback={<main className="card narrow">Ouverture de la salle…</main>}>
        <Salle
          token={token}
          user={user}
          requestId={salle}
          onLeave={() => {
            setTaken(null);
            setAvailable(false);
            history.replaceState(null, '', location.pathname);
            setSalle(null);
          }}
        />
      </Suspense>
    );
  }

  const toggleTech = (t: string) => {
    const next = tech.includes(t) ? tech.filter((x) => x !== t) : [...tech, t];
    setTech(next);
    localStorage.setItem('sos.tech', JSON.stringify(next));
    if (available && next.length) radar.current?.send({ type: 'disponible', tech: next });
  };

  const toggleAppelTech = (t: string) => {
    setAppelTech((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const updateCity = (v: string) => {
    setCity(v);
    localStorage.setItem('sos.city', v);
  };

  const updateCountry = (v: string) => {
    setCountry(v);
    localStorage.setItem('sos.country', v);
  };

  const toggleAvailable = () => {
    setNotice('');
    if (available) {
      radar.current?.send({ type: 'pause' });
      setAlerts([]);
      setAvailable(false);
    } else if (tech.length) {
      radar.current?.send({ type: 'disponible', tech });
      setAvailable(true);
    } else {
      setNotice('Choisis au moins une techno.');
    }
  };

  const findSolutions = async (event: FormEvent) => {
    event.preventDefault();
    const query = solutionQuery.trim();
    if (!query) return;
    setSearching(true);
    setNotice('');
    try {
      setSolutions(await searchSolutions(query, tech));
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const loadPassport = async () => {
    if (profile) return;
    try {
      setProfile(await passport(token));
    } catch (err) {
      setNotice((err as Error).message);
    }
  };

  const sharePassportWhatsApp = () => {
    const text = `Mon Passeport SOS Dev (@${user.login}) : ${profile ? profile.helpsConfirmed : 0} aides confirmées. Retrouve-moi sur le quartier KoraDevs !`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyPassportLink = () => {
    const link = `${window.location.origin}/#passport-${user.login}`;
    void navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // Traitement du formulaire d'Appel à l'aide Web (Analyse & Masquage local)
  const handleAppelSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!appelError.trim()) {
      setAppelErrNotice('Veuillez fournir le message d’erreur ou la trace d’exécution.');
      return;
    }
    setAppelErrNotice('');

    // 1. Masquage local des secrets réutilisant maskSecrets
    const maskedErr = maskSecrets(appelError);
    const maskedCodeResult = appelCode ? maskSecrets(appelCode) : { text: '', findings: [] };
    const totalFindings = maskedErr.findings.length + maskedCodeResult.findings.length;

    // 2. Recherche automatique de fiches existantes
    let hits: SolutionHit[] = [];
    try {
      hits = await searchSolutions(appelError.slice(0, 200), appelTech.length ? appelTech : tech);
    } catch {
      // Ignorer si la recherche de fiches échoue
    }

    setPreviewData({
      maskedErrorText: maskedErr.text,
      maskedCodeText: maskedCodeResult.text,
      findingsCount: totalFindings,
      existingHits: hits,
    });
    setAppelStep('preview');
  };

  // Confirmation et envoi de la demande au serveur (POST /requests)
  const handleConfirmSend = async () => {
    if (!previewData || !token) return;
    setAppelSending(true);
    setAppelErrNotice('');

    const requestBody: SosRequest = {
      version: 1,
      command: appelCommand.trim() || 'npm start',
      exitCode: 1,
      output: previewData.maskedErrorText,
      tech: appelTech.length ? appelTech : tech.length ? tech : ['TypeScript'],
      env: {
        os: 'Web Browser',
        arch: 'x64',
        node: 'v20.0.0',
      },
      files: previewData.maskedCodeText
        ? [
            {
              path: appelFilePath.trim() || 'src/App.tsx',
              reason: 'trace',
              size: previewData.maskedCodeText.length,
              secretsMasked: previewData.findingsCount,
              content: previewData.maskedCodeText,
            },
          ]
        : [],
      secretsMasked: previewData.findingsCount,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await createRequest(token, requestBody);
      setCreatedReqId(res.id);
      setAppelStep('success');
    } catch (err) {
      setAppelErrNotice((err as Error).message);
    } finally {
      setAppelSending(false);
    }
  };

  const resetAppel = () => {
    setAppelError('');
    setAppelCode('');
    setAppelErrNotice('');
    setPreviewData(null);
    setCreatedReqId(null);
    setAppelStep('form');
  };

  return (
    <main>
      <header>
        <h1>SOS Dev</h1>
        <span className={connected ? 'dot on' : 'dot'} title={connected ? 'Connecté' : 'Déconnecté'} />
        <span className="who">@{user.login}</span>
        <button className="link" onClick={() => void logout(token).finally(() => (setToken(null), setUser(null)))}>
          Se déconnecter
        </button>
      </header>

      {/* Navigation entre les quartiers */}
      <nav className="tabs" style={{ marginBottom: '16px' }}>
        <button
          className={activeTab === 'discover' ? 'tab on' : 'tab'}
          onClick={() => setActiveTab('discover')}
        >
          🧭 Découvrir
        </button>
        <button
          className={activeTab === 'radar' ? 'tab on' : 'tab'}
          onClick={() => setActiveTab('radar')}
        >
          📡 Radar des aidants {available && alerts.length > 0 && `(${alerts.length})`}
        </button>
        <button
          className={activeTab === 'appel' ? 'tab on' : 'tab'}
          onClick={() => setActiveTab('appel')}
        >
          🆘 Appel à l’aide (Web)
        </button>
        <button
          className={activeTab === 'maison' ? 'tab on' : 'tab'}
          onClick={() => setActiveTab('maison')}
        >
          🏡 La Maison (Mon Profil)
        </button>
        <button
          className={activeTab === 'vitrine' ? 'tab on' : 'tab'}
          onClick={() => setActiveTab('vitrine')}
        >
          🚀 Vitrine de projets
        </button>
        <button
          className={activeTab === 'caf' ? 'tab on' : 'tab'}
          onClick={() => setActiveTab('caf')}
        >
          🏆 Coupe d’Afrique
        </button>
        <button
          className={activeTab === 'solutions' ? 'tab on' : 'tab'}
          onClick={() => setActiveTab('solutions')}
        >
          🔍 Fiches Solutions
        </button>
      </nav>

      {/* VUE : COUPE D'AFRIQUE FRANCOPHONE */}
      {activeTab === 'caf' && <CafModule token={token} user={user} />}

      {/* VUE : VITRINE DE PROJETS */}
      {activeTab === 'vitrine' && <Vitrine token={token} user={user} />}


      {/* VUE : DÉCOUVRIR */}
      {activeTab === 'discover' && <Discover token={token} userTech={tech} />}

      {/* VUE : APPEL À L'AIDE WEB */}
      {activeTab === 'appel' && (
        <>
          {appelStep === 'form' && (
            <section className="card">
              <h2>🆘 Lancer un Appel à l’aide</h2>
              <p className="hint">
                Tu es bloqué sur un problème ? Colle ton erreur et ton extrait de code. Tes secrets (clés API, mots de passe) seront automatiquement masqués dans ton navigateur avant l'envoi.
              </p>

              <form onSubmit={handleAppelSubmit}>
                <div>
                  <label htmlFor="command-input" className="hint" style={{ display: 'block', marginBottom: '4px' }}>
                    Commande ou contexte de l’erreur
                  </label>
                  <input
                    id="command-input"
                    value={appelCommand}
                    onChange={(e) => setAppelCommand(e.target.value)}
                    placeholder="ex. npm start, python main.py, build failure..."
                    required
                  />
                </div>

                <div>
                  <label htmlFor="error-input" className="hint" style={{ display: 'block', marginBottom: '4px' }}>
                    Message d’erreur / Output console (Requis)
                  </label>
                  <textarea
                    id="error-input"
                    rows={5}
                    value={appelError}
                    onChange={(e) => setAppelError(e.target.value)}
                    placeholder="Colle la trace d'erreur ou les logs d'exception ici..."
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #30363d', background: '#0d1117', color: 'inherit', fontFamily: 'monospace', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="filepath-input" className="hint" style={{ display: 'block', marginBottom: '4px' }}>
                    Chemin du fichier concerné (Optionnel)
                  </label>
                  <input
                    id="filepath-input"
                    value={appelFilePath}
                    onChange={(e) => setAppelFilePath(e.target.value)}
                    placeholder="ex. src/App.tsx"
                  />
                </div>

                <div>
                  <label htmlFor="code-input" className="hint" style={{ display: 'block', marginBottom: '4px' }}>
                    Extrait de code lié (Optionnel)
                  </label>
                  <textarea
                    id="code-input"
                    rows={6}
                    value={appelCode}
                    onChange={(e) => setAppelCode(e.target.value)}
                    placeholder="Colle les lignes de code où l'erreur se produit..."
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #30363d', background: '#0d1117', color: 'inherit', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <span className="hint" style={{ display: 'block', marginBottom: '6px' }}>Technologies concernées</span>
                  <div className="chips">
                    {KNOWN_TECH.map((t) => (
                      <button
                        type="button"
                        key={t}
                        className={appelTech.includes(t) ? 'chip on' : 'chip'}
                        onClick={() => toggleAppelTech(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {appelErrNotice && <p className="error">{appelErrNotice}</p>}

                <button type="submit" className="big">
                  🔍 Analyser et préparer l’aperçu
                </button>
              </form>
            </section>
          )}

          {appelStep === 'preview' && previewData && (
            <section className="card">
              <h2>🔎 Aperçu exact de la demande SOS</h2>
              <p className="hint">
                Vérifie le contenu avant émission. Le masquage des secrets a été appliqué en local dans ton navigateur.
              </p>

              {previewData.findingsCount > 0 && (
                <div className="card success" style={{ background: '#0d2217', borderColor: '#238636' }}>
                  <strong>🔒 {previewData.findingsCount} secret(s) masqué(s) avec succès !</strong>
                  <p className="hint" style={{ margin: '4px 0 0' }}>Vos clés privées, jetons et mots de passe ont été remplacés par [MASQUÉ:...].</p>
                </div>
              )}

              {previewData.existingHits.length > 0 && (
                <div className="card" style={{ borderColor: '#d29922' }}>
                  <strong style={{ color: '#d29922' }}>💡 Une fiche de solution similaire existe déjà !</strong>
                  <p className="hint">Consulte cette fiche avant de déranger un voisin :</p>
                  <article className="solution" style={{ marginTop: '8px' }}>
                    <strong>{previewData.existingHits[0].title}</strong>
                    <code className="error-line">{previewData.existingHits[0].error}</code>
                    <p><b>Correction :</b> {previewData.existingHits[0].fix}</p>
                  </article>
                </div>
              )}

              <div style={{ marginTop: '14px' }}>
                <span className="hint">Command :</span> <code>{appelCommand}</code>
              </div>

              <div style={{ marginTop: '10px' }}>
                <span className="hint">Trace d'erreur masquée :</span>
                <code className="error-line">{previewData.maskedErrorText}</code>
              </div>

              {previewData.maskedCodeText && (
                <div style={{ marginTop: '10px' }}>
                  <span className="hint">Fichier ({appelFilePath}) masqué :</span>
                  <pre className="terminal" style={{ height: 'auto', maxHeight: '160px', marginTop: '4px' }}>
                    {previewData.maskedCodeText}
                  </pre>
                </div>
              )}

              {appelErrNotice && <p className="error">{appelErrNotice}</p>}

              <div className="actions" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="big"
                  onClick={handleConfirmSend}
                  disabled={appelSending}
                >
                  {appelSending ? 'Envoi en cours…' : '🆘 Envoyer ma demande au Radar'}
                </button>
                <button
                  type="button"
                  className="link"
                  onClick={() => setAppelStep('form')}
                  style={{ marginTop: '8px', width: '100%', textAlign: 'center' }}
                >
                  ← Modifier les informations
                </button>
              </div>
            </section>
          )}

          {appelStep === 'success' && (
            <section className="card success">
              <h2>🎉 Demande SOS envoyée au Radar !</h2>
              <p>Votre demande est désormais visible par les développeurs voisins disponibles sur la plateforme.</p>
              <p className="hint">Identifiant de la demande : <code>{createdReqId}</code></p>
              <div className="actions" style={{ marginTop: '16px' }}>
                <button onClick={() => setActiveTab('radar')}>
                  📡 Aller au Radar des aidants
                </button>
                <button className="link" onClick={resetAppel} style={{ marginLeft: '12px' }}>
                  Créer un autre appel
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {/* VUE : LA MAISON (PROFIL & PASSEPORT) */}
      {activeTab === 'maison' && (
        <>
          <section className="card">
            <h2>🏡 La Maison de @{user.login}</h2>
            <p className="hint">Ton espace dans le quartier des développeurs. Renseigne ta localisation et gère ta disponibilité.</p>

            <form style={{ marginBottom: '16px' }}>
              <div className="row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '160px' }}>
                  <label htmlFor="user-city" className="hint" style={{ display: 'block', marginBottom: '4px' }}>Ville</label>
                  <input
                    id="user-city"
                    value={city}
                    onChange={(e) => updateCity(e.target.value)}
                    placeholder="ex. Cotonou, Dakar, Abidjan..."
                  />
                </div>
                <div style={{ flex: 1, minWidth: '160px' }}>
                  <label htmlFor="user-country" className="hint" style={{ display: 'block', marginBottom: '4px' }}>Pays</label>
                  <input
                    id="user-country"
                    value={country}
                    onChange={(e) => updateCountry(e.target.value)}
                    placeholder="ex. Bénin, Sénégal, Côte d'Ivoire..."
                  />
                </div>
              </div>
            </form>

            <h2>Mes technos</h2>
            <div className="chips">
              {KNOWN_TECH.map((t) => (
                <button key={t} className={tech.includes(t) ? 'chip on' : 'chip'} onClick={() => toggleTech(t)}>
                  {t}
                </button>
              ))}
            </div>
            <button className={available ? 'big off' : 'big'} onClick={toggleAvailable} disabled={!connected}>
              {available ? 'Porte fermée 🔴 (Me mettre en pause)' : 'Porte ouverte 🟢 (Me rendre disponible)'}
            </button>
            {notice && <p className="error">{notice}</p>}
          </section>

          <PassportView token={token} currentUser={user} />
        </>
      )}

      {/* MODAL / VUE DE PASSEPORT PUBLIQUE */}
      {publicPassport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '16px',
            overflowY: 'auto',
          }}
          onClick={() => {
            history.replaceState(null, '', location.pathname);
            setPublicPassport(null);
          }}
        >
          <div style={{ maxWidth: '720px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <PassportView
              targetLogin={publicPassport}
              currentUser={user}
              onClosePublic={() => {
                history.replaceState(null, '', location.pathname);
                setPublicPassport(null);
              }}
            />
          </div>
        </div>
      )}

      {/* VUE : RADAR DES AIDANTS */}
      {activeTab === 'radar' && (
        <>
          <section className="card">
            <h2>Statut de disponibilité</h2>
            <p className="hint">Indique si tu souhaites recevoir les alertes des développeurs qui ont besoin d'aide.</p>
            <button className={available ? 'big off' : 'big'} onClick={toggleAvailable} disabled={!connected}>
              {available ? 'Porte fermée 🔴 (Me mettre en pause)' : 'Porte ouverte 🟢 (Me rendre disponible)'}
            </button>
            {notice && <p className="error">{notice}</p>}
          </section>

          {taken && (
            <section className="card success">
              <h2>Tu as pris la demande de @{taken.requester.login}</h2>
              <p>Son terminal vient d’être prévenu.</p>
              <button onClick={() => (location.hash = `#/salle/${taken.requestId}`)}>Entrer dans la salle SOS</button>
            </section>
          )}

          <section>
            <h2>Demandes reçues {available && <small>({alerts.length})</small>}</h2>
            {!available && <p className="hint">Active ta disponibilité pour recevoir les demandes du quartier.</p>}
            {available && alerts.length === 0 && <p className="hint">Aucune demande pour l’instant. Tu seras alerté dès qu'un développeur bloque.</p>}
            {alerts.map((a) => (
              <article key={a.requestId} className="card alert">
                <div className="row">
                  <span className={`stage ${a.stage}`}>{STAGE_LABEL[a.stage]}</span>
                  <span className="tech">{a.tech.join(' · ') || 'Techno inconnue'}</span>
                  <span className="hint">
                    @{a.requester} · {since(a.createdAt, now)}
                  </span>
                </div>
                <code className="error-line">{a.errorSummary}</code>
                <div className="row">
                  <span className="hint">
                    $ {a.command} · {a.files} fichier(s)
                  </span>
                  <button onClick={() => radar.current?.send({ type: 'accepter', requestId: a.requestId })}>Accepter</button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      {/* VUE : FICHES SOLUTIONS */}
      {activeTab === 'solutions' && (
        <section className="card">
          <h2>Chercher une solution avant d’appeler</h2>
          <p className="hint">Décris ton erreur. Les fiches publiques sont la première étape de la boucle SOS.</p>
          <form className="search-form" onSubmit={findSolutions}>
            <input
              value={solutionQuery}
              onChange={(e) => setSolutionQuery(e.target.value)}
              placeholder="ex. Cannot read properties of undefined"
              maxLength={500}
            />
            <button type="submit" disabled={searching || !solutionQuery.trim()}>
              {searching ? 'Recherche…' : 'Chercher'}
            </button>
          </form>
          {solutionQuery.trim() && solutions.length === 0 && !searching && <p className="hint">Aucune fiche assez proche. Tu peux te rendre disponible pour aider quelqu’un.</p>}
          {solutions.map((solution) => (
            <article className="solution" key={solution.id}>
              <div className="row">
                <strong>{solution.title}</strong>
                <span className="hint">{Math.round(solution.score * 100)} % proche</span>
              </div>
              <code className="error-line">{solution.error}</code>
              <p><b>Cause :</b> {solution.cause}</p>
              <p><b>Correction :</b> {solution.fix}</p>
              <span className="hint">{solution.tech.join(' · ')}</span>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
