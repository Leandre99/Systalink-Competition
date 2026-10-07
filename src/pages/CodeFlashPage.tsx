import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Zap,
  Play,
  CheckCircle2,
  MessageSquare,
  Send,
  Check,
  ShieldCheck,
  Award,
  Code2,
} from 'lucide-react';
import { Room, User, SolutionSheet } from '@shared/index';
import { apiFetch } from '../lib/api';
import { CodeFlashWS } from '../lib/ws';
import { ListSkeleton } from '../components/Skeleton';

interface CodeFlashPageProps {
  currentUser: User;
}

export const CodeFlashPage: React.FC<CodeFlashPageProps> = ({ currentUser }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [chatInput, setChatInput] = useState('');

  // Real-time status
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'async_fallback' | 'disconnected'>('disconnected');
  const [partnerStatus, setPartnerStatus] = useState<string>('En ligne');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerCursor, setPartnerCursor] = useState<{ line: number; ch: number } | null>({ line: 4, ch: 12 });

  // Test execution state
  const [testing, setTesting] = useState(false);

  // Solution publication modal state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [solTitle, setSolTitle] = useState('');
  const [solProblem, setSolProblem] = useState('');
  const [solCause, setSolCause] = useState('');
  const [solSolution, setSolSolution] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const wsRef = useRef<CodeFlashWS | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadRoom() {
      try {
        const data = await apiFetch<Room>(`/rooms/${id}`);
        if (isMounted) {
          setRoom(data);
          setCode(data.code || '');
          setSolTitle(data.requestTitle);
          setSolProblem(`Correction du bug sur : ${data.requestTitle}`);
        }
      } catch (err) {
        console.error('Erreur chargement room:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadRoom();
    return () => { isMounted = false; };
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room?.chat]);

  useEffect(() => {
    if (!id || !room) return;

    const ws = new CodeFlashWS(
      id,
      currentUser.id,
      currentUser.name,
      (msg) => {
        if (msg.type === 'code_updated') {
          setCode(msg.code);
        } else if (msg.type === 'chat_updated') {
          setRoom((prev) => (prev ? { ...prev, chat: [...prev.chat, msg.chatMessage] } : null));
        } else if (msg.type === 'user_joined') {
          setPartnerStatus(`${msg.userName} a rejoint la salle`);
        } else if (msg.type === 'user_left') {
          setPartnerStatus(`${msg.userName} s'est déconnecté`);
        } else if (msg.type === 'typing_updated') {
          setPartnerTyping(msg.isTyping);
        } else if (msg.type === 'cursor_updated') {
          setPartnerCursor(msg.cursor);
        } else if (msg.type === 'test_result') {
          setRoom(msg.room);
        } else if (msg.type === 'room_updated') {
          setRoom(msg.room);
        }
      },
      (status) => {
        setWsStatus(status);
      }
    );

    ws.connect();
    wsRef.current = ws;

    return () => {
      ws.disconnect();
    };
  }, [id, room?.id, currentUser.id, currentUser.name]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCode(val);
    wsRef.current?.send({ type: 'code_change', roomId: id, code: val, userId: currentUser.id });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !room) return;

    wsRef.current?.send({
      type: 'chat_message',
      roomId: id,
      text: chatInput.trim(),
      senderId: currentUser.id,
      senderName: currentUser.name,
    });
    setChatInput('');
  };

  const handleRunTest = async () => {
    if (!room) return;
    setTesting(true);

    try {
      await apiFetch(`/rooms/${room.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ code }),
      });

      const res = await apiFetch<any>(`/rooms/${room.id}/run-test`, {
        method: 'POST',
      });

      setRoom(res.room);
    } catch (err: any) {
      console.error('Erreur exécution test:', err);
    } finally {
      setTesting(false);
    }
  };

  const handleToggleApproval = async () => {
    if (!room) return;

    const isRequester = currentUser.id === room.requesterId;
    const update = isRequester
      ? { requesterApproved: !room.requesterApproved }
      : { helperApproved: !room.helperApproved };

    const updatedRoom = await apiFetch<Room>(`/rooms/${room.id}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });

    setRoom(updatedRoom);

    if (updatedRoom.requesterApproved && updatedRoom.helperApproved && !updatedRoom.solutionSheetId) {
      setShowPublishModal(true);
    }
  };

  const handlePublishSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    setPublishing(true);

    try {
      const newSol = await apiFetch<SolutionSheet>(`/rooms/${room.id}/publish-solution`, {
        method: 'POST',
        body: JSON.stringify({
          title: solTitle,
          problem: solProblem,
          cause: solCause || 'Erreur de configuration ou problème de dépendances.',
          solution: solSolution || 'Middleware appliqué et test validé avec succès.',
          codeSnippet: code,
        }),
      });

      setShowPublishModal(false);
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 2000);

      navigate(`/solutions/${newSol.id}`);
    } catch (err: any) {
      console.error('Erreur publication solution:', err);
      setPublishing(false);
    }
  };

  if (loading || !room) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <ListSkeleton count={3} />
      </div>
    );
  }

  const isRequester = currentUser.id === room.requesterId;
  const partnerName = isRequester ? room.helperName : room.requesterName;

  return (
    <div className={`space-y-6 animate-page-enter ${celebrate ? 'animate-celebrate' : ''}`}>
      {/* Top Header Bar */}
      <div className="bg-[#0F172A] text-white p-5 md:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#2563EB] text-[#F59E0B] flex items-center justify-center font-black text-lg shadow-blue">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-blue-900/60 text-blue-300 text-[10px] font-extrabold rounded-full uppercase border border-blue-700">
                {room.stackTag}
              </span>
              <span className="text-xs text-slate-400 font-medium">Salle CodeFlash #{room.id}</span>
            </div>
            <h3 className="text-lg md:text-xl font-extrabold text-white mt-0.5">{room.requestTitle}</h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center gap-2">
            {wsStatus === 'connected' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]"></span>
                <span className="text-emerald-300 font-bold">Temps réel connecté</span>
              </>
            ) : wsStatus === 'reconnecting' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] animate-ping"></span>
                <span className="text-amber-300 font-bold">Reconnexion...</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                <span className="text-slate-300 font-bold">Mode asynchrone (code collé)</span>
              </>
            )}
          </div>

          <div className="px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700 text-slate-300 font-medium">
            Participant : <strong className="text-white">{partnerName}</strong>
          </div>
        </div>
      </div>

      {/* Main Grid Editor + Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Code Editor & Test Output */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0F172A] px-4 py-3 rounded-t-2xl border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#2563EB]" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Éditeur partagé en direct
              </span>
            </div>

            {room.confirmed ? (
              <span className="px-3 py-1 bg-amber-500/20 text-[#F59E0B] text-xs font-extrabold rounded-lg border border-amber-500/40 flex items-center gap-1.5 animate-amber-spring">
                <CheckCircle2 className="w-4 h-4" />
                <span>Badge CONFIRMÉ (+25 pts)</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-medium">En attente de confirmation</span>
            )}
          </div>

          {/* Interactive Code Editor Area */}
          <div className="relative bg-slate-950 rounded-b-2xl border border-slate-800 overflow-hidden shadow-inner">
            <textarea
              value={code}
              onChange={handleCodeChange}
              rows={16}
              className="w-full p-4 bg-transparent text-blue-300 font-mono text-xs leading-relaxed focus:outline-none resize-none"
              placeholder="// Saisissez et modifiez le code ensemble ici en temps réel..."
            ></textarea>

            {partnerCursor && (
              <div
                className="absolute pointer-events-none flex items-center gap-1 bg-[#F59E0B] text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded shadow z-10 transition-all duration-200"
                style={{ top: `${partnerCursor.line * 20}px`, left: `${partnerCursor.ch * 8}px` }}
              >
                <span>{partnerName}</span>
              </div>
            )}

            {partnerTyping && (
              <div className="absolute bottom-3 right-4 px-3 py-1 bg-slate-800/80 text-blue-400 text-[11px] font-bold rounded-full border border-slate-700 animate-pulse">
                {partnerName} est en train d écrire...
              </div>
            )}
          </div>

          {/* Test Action & Console Output */}
          <div className="bg-white p-5 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-[#2563EB]" />
                <h4 className="text-sm font-extrabold text-[#0F172A]">Exécution du test de vérification</h4>
              </div>

              <button
                onClick={handleRunTest}
                disabled={testing}
                className="btn-primary py-2 px-4 text-xs"
              >
                <Play className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>{testing ? 'Exécution du test...' : 'Lancer le test'}</span>
              </button>
            </div>

            {room.testOutput ? (
              <pre className={`p-4 rounded-2xl font-mono text-xs overflow-x-auto border ${
                room.testStatus === 'passed'
                  ? 'bg-emerald-50 text-[#0F766E] border-emerald-200'
                  : 'bg-red-50 text-[#E4572E] border-red-200'
              }`}>
                <code>{room.testOutput}</code>
              </pre>
            ) : (
              <p className="text-xs text-slate-500 italic p-3.5 bg-slate-50 rounded-2xl border border-slate-100 font-medium">
                Clique sur "Lancer le test" pour vérifier si le correctif passe au vert.
              </p>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Live Chat & Double Agreement */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Live Chat Box */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col h-[480px]">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#2563EB]" />
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Chat de session
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">{room.chat.length} message(s)</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs font-medium">
              {room.chat.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                const isSys = msg.senderId === 'system';
                if (isSys) {
                  return (
                    <div key={msg.id} className="p-2.5 bg-blue-50 rounded-xl text-center text-[11px] text-[#2563EB] font-bold border border-blue-100">
                      {msg.text}
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-slate-400 font-bold mb-0.5">{msg.senderName}</span>
                    <div
                      className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                        isMe
                          ? 'bg-[#2563EB] text-white rounded-tr-none'
                          : 'bg-slate-100 text-slate-800 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="pt-3 border-t border-slate-100 flex items-center gap-2 mt-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Écris un message..."
                className="flex-1 px-3.5 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-[#2563EB]"
              />
              <button
                type="submit"
                className="btn-primary p-2 rounded-xl"
              >
                <Send className="w-4 h-4 text-[#F59E0B]" />
              </button>
            </form>
          </div>

          {/* Double Agreement Card */}
          <div className="bg-[#0F172A] p-5 rounded-3xl text-white space-y-3 shadow-xl border border-slate-800">
            <h4 className="font-extrabold text-sm flex items-center gap-2 text-white">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
              <span>Publication de la fiche solution</span>
            </h4>
            <p className="text-xs text-slate-300 font-medium">
              La fiche n est publiée qu avec l accord des deux participants.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 font-medium">
                <span>Accord Demandeur ({room.requesterName})</span>
                {room.requesterApproved ? (
                  <span className="font-bold text-[#F59E0B] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> OK
                  </span>
                ) : (
                  <span className="text-slate-400">En attente</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 font-medium">
                <span>Accord Aidant ({room.helperName})</span>
                {room.helperApproved ? (
                  <span className="font-bold text-[#F59E0B] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> OK
                  </span>
                ) : (
                  <span className="text-slate-400">En attente</span>
                )}
              </div>
            </div>

            <button
              onClick={handleToggleApproval}
              className={`w-full py-2.5 rounded-xl font-bold text-xs shadow transition-all ${
                (isRequester && room.requesterApproved) || (!isRequester && room.helperApproved)
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'btn-primary justify-center'
              }`}
            >
              {(isRequester && room.requesterApproved) || (!isRequester && room.helperApproved)
                ? 'Mon accord est donné (Cliquer pour annuler)'
                : 'Donner mon accord pour publier la fiche'}
            </button>
          </div>
        </div>
      </div>

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-page-enter">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-[#F59E0B] border border-amber-300 flex items-center justify-center">
                <Award className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#0F172A]">
                  Double accord confirmé ! Éditer la fiche
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Cette fiche intégrera le savoir partagé et votre Passeport respectif.
                </p>
              </div>
            </div>

            <form onSubmit={handlePublishSolution} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Titre de la fiche</label>
                <input
                  type="text"
                  value={solTitle}
                  onChange={(e) => setSolTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Problème résolu</label>
                <textarea
                  value={solProblem}
                  onChange={(e) => setSolProblem(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cause racine</label>
                <input
                  type="text"
                  value={solCause}
                  onChange={(e) => setSolCause(e.target.value)}
                  placeholder="ex: Middleware CORS manquant sur la route Express"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Solution appliquée</label>
                <textarea
                  value={solSolution}
                  onChange={(e) => setSolSolution(e.target.value)}
                  rows={2}
                  placeholder="ex: Ajout du middleware app.use(cors()) et validation du test."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                  required
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="btn-secondary py-2 px-4 text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="btn-primary py-2 px-5 text-xs"
                >
                  {publishing ? 'Publication...' : 'Publier la fiche solution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
