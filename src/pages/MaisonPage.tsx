import React, { useState } from 'react';
import {
  Home,
  DoorOpen,
  DoorClosed,
  Bell,
  Save,
  CheckCircle2,
  Plus,
  X,
} from 'lucide-react';
import { User } from '@shared/index';
import { apiFetch } from '../lib/api';

interface MaisonPageProps {
  currentUser: User;
  setCurrentUser: (u: User) => void;
  onOpenDoorbell: () => void;
}

const AVAILABLE_TECH = ['React', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'Flutter', 'Docker', 'PostgreSQL', 'Tailwind', 'Go', 'Next.js'];

export const MaisonPage: React.FC<MaisonPageProps> = ({ currentUser, setCurrentUser, onOpenDoorbell }) => {
  const [city, setCity] = useState(currentUser.city);
  const [bio, setBio] = useState(currentUser.bio);
  const [stack, setStack] = useState<string[]>(currentUser.stack);
  const [doorOpen, setDoorOpen] = useState(currentUser.doorOpen);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleAddTag = (tag: string) => {
    if (!stack.includes(tag)) {
      setStack([...stack, tag]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setStack(stack.filter((t) => t !== tag));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const updated = await apiFetch<User>(`/users/${currentUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          city,
          bio,
          stack,
          doorOpen,
        }),
      });

      setCurrentUser(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erreur sauvegarde Maison:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-page-enter">
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img src={currentUser.avatar} alt={currentUser.name} className="w-16 h-16 rounded-full object-cover border-2 border-[#2563EB]" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-[#0F172A]">{currentUser.name}</h2>
              {doorOpen ? (
                <span className="px-2.5 py-0.5 bg-[#ECFDF5] text-[#0F766E] text-xs font-bold rounded-full border border-emerald-300">
                  Porte Ouverte
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-300">
                  Porte Fermée
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{city} • <strong className="text-[#F59E0B]">{currentUser.points} points</strong> de réputation</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenDoorbell}
            className="btn-secondary py-2.5 px-4 text-xs"
          >
            <Bell className="w-4 h-4 text-[#F59E0B] animate-bell-swing" />
            <span>Tester la sonnette</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 md:p-8 border border-[#E2E8F0] shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
            <Home className="w-5 h-5 text-[#2563EB]" />
            <span>Paramètres de ta Maison</span>
          </h3>

          {saveSuccess && (
            <span className="text-xs font-bold text-[#0F766E] flex items-center gap-1 animate-slide-in">
              <CheckCircle2 className="w-4 h-4 text-[#F59E0B]" />
              Sauvegardé avec succès !
            </span>
          )}
        </div>

        {/* Door Toggle */}
        <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-xs font-bold text-[#0F172A] flex items-center gap-2">
              {doorOpen ? <DoorOpen className="w-4 h-4 text-[#0F766E]" /> : <DoorClosed className="w-4 h-4 text-slate-500" />}
              <span>Statut "Porte Ouverte" aux voisins</span>
            </label>
            <p className="text-[11px] text-slate-500 font-medium">
              Lorsque ta porte est ouverte, les voisins de ta ville ou de ta stack peuvent te faire sonner en cas de blocage.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDoorOpen(!doorOpen)}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              doorOpen ? 'bg-[#2563EB]' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                doorOpen ? 'translate-x-6' : 'translate-x-0'
              }`}
            ></div>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Ville de résidence
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="ex: Cotonou, Dakar, Abidjan..."
              className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Courte Présentation / Bio
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="ex: Développeur web junior passionné par React..."
              className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Ma Stack Technique (Compétences)
          </label>

          <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-[#F8FAFC] border border-slate-200 rounded-2xl">
            {stack.map((t) => (
              <span
                key={t}
                className="px-3 py-1 bg-[#2563EB] text-white text-xs font-extrabold rounded-full flex items-center gap-1.5 shadow-sm"
              >
                <span>{t}</span>
                <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-[#F59E0B]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ajouter des suggestions :</span>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TECH.filter((t) => !stack.includes(t)).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleAddTag(t)}
                  className="px-2.5 py-1 bg-white border border-slate-300 hover:border-[#2563EB] text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-[#2563EB]" />
                  <span>{t}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary py-2.5 px-6 text-xs"
          >
            <Save className="w-4 h-4 text-[#F59E0B]" />
            <span>{saving ? 'Enregistrement...' : 'Enregistrer ma Maison'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
