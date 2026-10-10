import { useEffect, useRef, useState } from 'react';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import type { ChatMessage, PublicUser, SalleMember, SalleState, ServerMessage, SolutionDraft } from '@sos/shared';
import { approveSolutionDraft, connectRadar, getSolutionDraft, updateSolutionDraft } from './api.js';
import { ReportModal } from './ReportModal.js';

const REMOTE = 'serveur';

const toBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

function language(path: string) {
  if (/\.py$/.test(path)) return [python()];
  if (/\.[cm]?[jt]sx?$/.test(path)) return [javascript({ typescript: /\.[cm]?tsx?$/.test(path), jsx: /x$/.test(path) })];
  return [];
}

/** One CodeMirror editor bound to the Y.Text of a shared file. */
function Editor({ doc, path, line }: { doc: Y.Doc; path: string; line?: number }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const text = doc.getText(path);
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: text.toString(),
        extensions: [basicSetup, oneDark, ...language(path), yCollab(text, null), EditorView.theme({ '&': { height: '100%' } })],
      }),
    });
    if (line && line <= view.state.doc.lines) {
      const pos = view.state.doc.line(line).from;
      view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
    }
    return () => view.destroy();
  }, [doc, path, line]);
  return <div className="editor" ref={host} />;
}

type Closed = { raison: 'resolue' | 'annulee' | 'expiree'; by?: string };

export function Salle({ token, user, requestId, onLeave }: { token: string; user: PublicUser; requestId: string; onLeave: () => void }) {
  const [salle, setSalle] = useState<SalleState | null>(null);
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [file, setFile] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [terminal, setTerminal] = useState('');
  const [running, setRunning] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [members, setMembers] = useState<SalleMember[]>([]);
  const [closed, setClosed] = useState<Closed | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [solution, setSolution] = useState<SolutionDraft | null>(null);
  const [lowConnection, setLowConnection] = useState(false);
  const [pastedCode, setPastedCode] = useState('');
  const [deferredMessage, setDeferredMessage] = useState('');
  const [deferredSent, setDeferredSent] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const socket = useRef<ReturnType<typeof connectRadar> | null>(null);
  const terminalEnd = useRef<HTMLPreElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let current: Y.Doc | null = null;
    const onMessage = (m: ServerMessage) => {
      switch (m.type) {
        case 'bienvenue':
          return socket.current?.send({ type: 'rejoindre', requestId, client: 'web' });
        case 'salle': {
          // A fresh document on every (re)join: the server sends the whole state.
          current?.destroy();
          const next = new Y.Doc();
          Y.applyUpdate(next, fromBase64(m.salle.doc), REMOTE);
          next.on('update', (update: Uint8Array, origin: unknown) => {
            if (origin !== REMOTE) socket.current?.send({ type: 'yjs', requestId, update: toBase64(update) });
          });
          current = next;
          setDoc(next);
          setSalle(m.salle);
          setFile((f) => (m.salle.files.some((x) => x.path === f) ? f : (m.salle.files[0]?.path ?? '')));
          setChat(m.salle.chat);
          setTerminal(m.salle.terminal);
          setRunning(m.salle.running);
          setExitCode(m.salle.lastExitCode);
          setMembers(m.salle.members);
          setError('');
          return;
        }
        case 'yjs':
          if (current) Y.applyUpdate(current, fromBase64(m.update), REMOTE);
          return;
        case 'message':
          return setChat((list) => [...list, m.message]);
        case 'terminal':
          return setTerminal((t) => t + m.data);
        case 'execution':
          setRunning(m.state === 'en-cours');
          if (m.state === 'en-cours') setTerminal('');
          else setExitCode(m.exitCode);
          return;
        case 'presence':
          return setMembers(m.members);
        case 'salle-fermee':
          current?.destroy();
          current = null;
          setDoc(null);
          return setClosed({ raison: m.raison, by: m.by });
        case 'erreur':
          return setError(m.message);
      }
    };
    socket.current = connectRadar(token, onMessage, () => {
      setLowConnection(true);
      setError((e) => e || 'Connexion réseau instable. Bascule en mode connexion faible.');
    });
    return () => {
      socket.current?.close();
      current?.destroy();
    };
  }, [token, requestId]);

  useEffect(() => terminalEnd.current?.scrollTo(0, terminalEnd.current.scrollHeight), [terminal]);
  useEffect(() => chatEnd.current?.scrollTo(0, chatEnd.current.scrollHeight), [chat]);

  if (closed) {
    const text = {
      resolue: `Problème résolu${closed.by ? ` (par @${closed.by})` : ''}. Le code a été effacé du serveur.`,
      annulee: 'Le demandeur a annulé sa demande. Le code a été effacé.',
      expiree: 'La salle a expiré. Le code a été effacé du serveur.',
    }[closed.raison];
    return (
      <main className="card narrow">
        <h1>Salle fermée</h1>
        <p>{text}</p>
        <SolutionReview token={token} requestId={requestId} solution={solution} onChange={setSolution} />
        <button onClick={onLeave}>Retour au Radar</button>
      </main>
    );
  }

  if (!salle || !doc) {
    return (
      <main className="card narrow">
        <h1>Salle SOS</h1>
        <p className={error ? 'error' : 'hint'}>{error || 'Connexion à la salle…'}</p>
        <button className="link" onClick={onLeave}>
          Retour au Radar
        </button>
      </main>
    );
  }

  const isHelper = salle.role === 'aidant';
  const other = isHelper ? salle.requester : salle.helper;
  const terminalOnline = members.some((m) => m.client === 'terminal');
  const otherOnline = members.some((m) => m.login === other.login);
  const current = salle.files.find((f) => f.path === file);
  const send = (type: 'proposer' | 'relance') => {
    setError('');
    socket.current?.send({ type, requestId });
  };

  const sendDeferredResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deferredMessage.trim() && !pastedCode.trim()) return;
    const textToSend = `[Réponse différée / Connexion faible]\n${deferredMessage}\n${pastedCode ? `\nCode proposé :\n${pastedCode}` : ''}`;
    socket.current?.send({ type: 'message', requestId, text: textToSend });
    setDeferredSent(true);
    setDeferredMessage('');
    setTimeout(() => setDeferredSent(false), 4000);
  };

  return (
    <div className="salle">
      <header>
        <h1>Salle SOS</h1>
        <span className="hint">
          {isHelper ? 'Tu aides' : 'Tu es aidé par'} @{other.login}
        </span>
        <span className={otherOnline ? 'dot on' : 'dot'} title={otherOnline ? 'En ligne' : 'Absent'} />
        <span className="who">@{user.login}</span>

        {/* Indicateur et toggle Connexion Faible */}
        <button
          className="link"
          style={{ fontSize: '0.85rem', color: lowConnection ? '#d29922' : '#3fb950' }}
          onClick={() => setLowConnection(!lowConnection)}
          title="Cliquez pour basculer en mode asynchrone / connexion faible"
        >
          {lowConnection ? '🟡 Connexion faible (Asynchrone)' : '🟢 Synchronisé (Yjs CRDT)'}
        </button>

        <button
          className="link"
          style={{ fontSize: '0.85rem', color: '#cbd5e0', opacity: 0.85 }}
          onClick={() => setShowReportModal(true)}
          title="Signaler un comportement inapproprié ou un contenu abusif"
        >
          🚩 Signaler
        </button>

        <button
          className="resolve"
          onClick={() => {
            if (confirm('Le problème est résolu ? La salle sera fermée et le code effacé du serveur.')) socket.current?.send({ type: 'resolu', requestId });
          }}
        >
          Problème résolu
        </button>
      </header>

      {showReportModal && (
        <ReportModal
          token={token}
          targetType="demande_sos"
          targetId={requestId}
          targetTitle={`Demande SOS: ${salle.command}`}
          onClose={() => setShowReportModal(false)}
        />
      )}

      <section className="card summary">
        <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <code className="error-line" style={{ flex: 1, margin: 0 }}>{salle.errorSummary}</code>
          {exitCode === 0 && (
            <span className="stage" style={{ background: '#238636', marginLeft: '12px' }}>
              🟢 Test confirmé : Au vert
            </span>
          )}
        </div>
        <span className="hint" style={{ marginTop: '4px' }}>
          $ {salle.command} · {salle.tech.join(' · ') || 'Techno inconnue'}
        </span>
      </section>

      {error && <p className="error">{error}</p>}

      <div className="salle-grid">
        {/* MODE CONNEXION FAIBLE : CODE COLLÉ + RÉPONSE DIFFÉRÉE */}
        {lowConnection ? (
          <section className="card code">
            <h2>🟡 Mode Connexion Faible (Réponse différée)</h2>
            <p className="hint">
              En raison d'une connexion réseau instable, le mode temps réel est temporairement suspendu. Tu peux coller ton code corrigé et envoyer une explication différée. Aucun code n'est exécuté sur le serveur.
            </p>

            <form onSubmit={sendDeferredResponse} style={{ marginTop: '12px' }}>
              <div>
                <label htmlFor="pasted-code" className="hint" style={{ display: 'block', marginBottom: '4px' }}>
                  Extrait de code corrigé (Code collé)
                </label>
                <textarea
                  id="pasted-code"
                  rows={8}
                  value={pastedCode}
                  onChange={(e) => setPastedCode(e.target.value)}
                  placeholder="Collez le code corrigé ici..."
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #30363d', background: '#0d1117', color: 'inherit', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginTop: '10px' }}>
                <label htmlFor="deferred-msg" className="hint" style={{ display: 'block', marginBottom: '4px' }}>
                  Explication ou instructions pour le partenaire
                </label>
                <textarea
                  id="deferred-msg"
                  rows={4}
                  value={deferredMessage}
                  onChange={(e) => setDeferredMessage(e.target.value)}
                  placeholder="Expliquez votre correction ou donnez des conseils..."
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #30363d', background: '#0d1117', color: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {deferredSent && <p className="success-text" style={{ marginTop: '8px' }}>✓ Réponse différée transmise au fil de discussion !</p>}

              <div className="actions" style={{ marginTop: '12px' }}>
                <button type="submit">Envoyer la réponse différée</button>
                <button type="button" className="link" onClick={() => setLowConnection(false)}>Revenir au mode Temps réel</button>
              </div>
            </form>
          </section>
        ) : (
          /* MODE TEMPS RÉEL EXÉCUTÉ PAR CODEMIRROR + YJS */
          <section className="card code">
            <div className="tabs">
              {salle.files.map((f) => (
                <button key={f.path} className={f.path === file ? 'tab on' : 'tab'} onClick={() => setFile(f.path)}>
                  📄 {f.path} {f.line ? `(L${f.line})` : ''}
                </button>
              ))}
            </div>
            {current ? <Editor key={current.path} doc={doc} path={current.path} line={current.line} /> : <p className="hint">Aucun fichier partagé.</p>}
            {isHelper && (
              <div className="actions">
                <button onClick={() => send('proposer')} disabled={!terminalOnline} title="Le demandeur verra le diff dans son terminal et répondra o/n.">
                  Envoyer mes corrections
                </button>
                <button onClick={() => send('relance')} disabled={!terminalOnline || running} title="Le demandeur appuie sur Entrée pour relancer.">
                  Demander une relance
                </button>
                {!terminalOnline && <span className="hint">Le terminal du demandeur n’est pas relié.</span>}
              </div>
            )}
          </section>
        )}

        {/* SECTION LATÉRALE : TERMINAL, PARTICIPANTS ET CHAT */}
        <section className="card side">
          <h2>
            Terminal de @{salle.requester.login} <small className="hint">lecture seule</small>
            <span className={`run ${running ? 'on' : ''}`}>
              {running ? 'en cours…' : exitCode === null ? '' : exitCode === 0 ? '🟢 au vert (code 0)' : `code ${exitCode}`}
            </span>
          </h2>
          <pre className="terminal" ref={terminalEnd}>
            {terminal || 'Aucune sortie pour l’instant.'}
          </pre>

          {/* LISTE DES PARTICIPANTS EN DIRECT */}
          <h2>Participants ({members.length})</h2>
          <div className="chips" style={{ marginBottom: '12px' }}>
            {members.map((m, idx) => (
              <span key={idx} className="chip on" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                @{m.login} ({m.role === 'demandeur' ? 'Demandeur' : 'Aidant'} · {m.client})
              </span>
            ))}
          </div>

          <h2>Chat de la salle</h2>
          <div className="chat" ref={chatEnd}>
            {chat.length === 0 && <p className="hint">Dis bonjour !</p>}
            {chat.map((m) => (
              <p key={m.id} className={`msg ${m.role}`}>
                {m.role !== 'systeme' && <b>@{m.from} </b>}
                {m.text}
              </p>
            ))}
          </div>
          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              socket.current?.send({ type: 'message', requestId, text: draft });
              setDraft('');
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Écrire un message…" maxLength={4000} />
            <button type="submit">Envoyer</button>
          </form>
        </section>
      </div>
    </div>
  );
}

function SolutionReview({ token, requestId, solution, onChange }: { token: string; requestId: string; solution: SolutionDraft | null; onChange: (draft: SolutionDraft | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [causeText, setCauseText] = useState('');
  const [fixText, setFixText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getSolutionDraft(token, requestId).then((d) => {
      onChange(d);
      if (d) {
        setCauseText(d.cause);
        setFixText(d.fix);
      }
    });
  }, [token, requestId, onChange]);

  if (!solution) return <p className="hint">Préparation de la fiche solution…</p>;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateSolutionDraft(token, requestId, { cause: causeText, fix: fixText });
      onChange(updated);
      setEditing(false);
    } catch {
      // Ignorer
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="solution-review">
      <h2>Fiche solution (Brouillon)</h2>
      <p className="hint">
        🔒 Publication uniquement après validation du demandeur ET de l’aidant. Tant que la fiche n'est pas validée par les deux, elle reste strictement privée.
      </p>

      <strong>{solution.title}</strong>
      <p><b>Erreur :</b> <code>{solution.error}</code></p>

      {editing ? (
        <form onSubmit={handleSave} style={{ margin: '10px 0' }}>
          <div>
            <label className="hint">Cause identifiée</label>
            <input value={causeText} onChange={(e) => setCauseText(e.target.value)} style={{ width: '100%', marginBottom: '8px' }} />
          </div>
          <div>
            <label className="hint">Correction apportée</label>
            <textarea value={fixText} onChange={(e) => setFixText(e.target.value)} rows={3} style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0d1117', color: 'inherit' }} />
          </div>
          <div className="actions" style={{ marginTop: '8px' }}>
            <button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button>
            <button type="button" className="link" onClick={() => setEditing(false)}>Annuler</button>
          </div>
        </form>
      ) : (
        <>
          <p><b>Cause :</b> {solution.cause}</p>
          <p><b>Correction :</b> {solution.fix}</p>
          {!solution.published && (
            <button className="link" onClick={() => setEditing(true)} style={{ marginBottom: '8px' }}>
              ✏️ Modifier la cause ou la correction
            </button>
          )}
        </>
      )}

      <p className="hint">
        Approbations : Demandeur {solution.requesterApproved ? '✅ accord donné' : '⏳ en attente'} · Aidant {solution.helperApproved ? '✅ accord donné' : '⏳ en attente'}
      </p>

      {!solution.published && (
        <button onClick={() => void approveSolutionDraft(token, requestId).then(onChange)} style={{ marginTop: '6px' }}>
          {solution.requesterApproved || solution.helperApproved ? 'Approuver également pour publier' : 'Approuver la fiche'}
        </button>
      )}
      {solution.published && <p className="success-text" style={{ marginTop: '8px' }}>🎉 Fiche validée par les 2 participants et publiée dans la bibliothèque publique !</p>}
    </section>
  );
}
