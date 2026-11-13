'use client';

import React, { useState } from 'react';
import { X, FolderPlus, Palette, Edit3, Trash2 } from 'lucide-react';
import { Project } from '@/types';

interface ProjectModalProps {
  teamId?: string;
  initialProject?: Project | null;
  canDelete?: boolean;
  onClose: () => void;
  onCreateProject: (project: Omit<Project, 'id'>, templateColumns: string[]) => void;
  onUpdateProject?: (projectId: string, updates: Partial<Omit<Project, 'id'>>) => void;
  onDeleteProject?: (projectId: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  teamId = 'team-1',
  initialProject = null,
  canDelete = false,
  onClose,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
}) => {
  const isEdit = Boolean(initialProject);
  const [name, setName] = useState(initialProject?.name || '');
  const [description, setDescription] = useState(initialProject?.description || '');
  const [color, setColor] = useState(initialProject?.color || '#4f46e5');
  const [startDate, setStartDate] = useState(
    initialProject?.startDate || new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    initialProject?.endDate ||
      new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [template, setTemplate] = useState<'SCRUM' | 'SIMPLE'>('SCRUM');

  const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEdit && initialProject && onUpdateProject) {
      onUpdateProject(initialProject.id, {
        name: name.trim(),
        description: description.trim(),
        color,
        startDate,
        endDate,
      });
      onClose();
      return;
    }

    const templateColumns =
      template === 'SCRUM'
        ? ['À faire', 'En cours', 'En relecture', 'Terminé']
        : ['À faire', 'En cours', 'Terminé'];

    onCreateProject(
      {
        teamId,
        name: name.trim(),
        description: description.trim(),
        color,
        startDate,
        endDate,
      },
      templateColumns
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl glass-panel bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {isEdit ? (
              <Edit3 className="w-5 h-5 text-indigo-400" />
            ) : (
              <FolderPlus className="w-5 h-5 text-indigo-400" />
            )}
            <h3 className="font-bold text-sm text-white">
              {isEdit ? 'Modifier le Projet' : 'Créer un Nouveau Projet'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nom du projet *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Application Mobile Santé..."
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Objectif
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objectif du module, technologies utilisées..."
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Couleur */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              Couleur thématique
            </label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c
                      ? 'scale-125 ring-2 ring-white shadow-md'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Date début</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Date fin / Rendu
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          {/* Modèle de colonnes (uniquement à la création) */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Modèle de colonnes Kanban
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value as 'SCRUM' | 'SIMPLE')}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                <option value="SCRUM">
                  Sprint 4 colonnes (À faire, En cours, En relecture, Terminé)
                </option>
                <option value="SIMPLE">Standard 3 colonnes (À faire, En cours, Terminé)</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
            {isEdit && initialProject && canDelete && onDeleteProject ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteProject(initialProject.id);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
              >
                {isEdit ? 'Enregistrer' : 'Créer le projet'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
