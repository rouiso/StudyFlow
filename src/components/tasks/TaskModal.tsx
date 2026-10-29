'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Copy,
  Calendar,
  CheckSquare,
  Sparkles,
  AlertTriangle,
  User as UserIcon,
  Tag,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { Task, Subtask, Column, User, Label, TaskPriority } from '@/types';
import { aiBreakdownTask } from '@/lib/ai-assistant';

interface TaskModalProps {
  task: Task | null;
  columns: Column[];
  users: User[];
  labels: Label[];
  subtasks: Subtask[];
  currentColumnId?: string;
  onSave: (taskData: Partial<Task>, subtasksData: { title: string; done: boolean }[]) => void;
  onDelete?: (taskId: string) => void;
  onDuplicate?: (taskId: string) => void;
  onClose: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  task,
  columns,
  users,
  labels,
  subtasks: initialSubtasks,
  currentColumnId,
  onSave,
  onDelete,
  onDuplicate,
  onClose,
}) => {
  const isEditing = !!task;

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'NORMALE');
  const [columnId, setColumnId] = useState(task?.columnId || currentColumnId || columns[0]?.id || '');
  const [dueDate, setDueDate] = useState(task?.dueDate || new Date().toISOString().split('T')[0]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assigneeIds || []);
  const [labelIds, setLabelIds] = useState<string[]>(task?.labelIds || []);

  const [localSubtasks, setLocalSubtasks] = useState<{ id?: string; title: string; done: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (task) {
      const related = initialSubtasks
        .filter((s) => s.taskId === task.id)
        .map((s) => ({ id: s.id, title: s.title, done: s.done }));
      setLocalSubtasks(related);
    } else {
      setLocalSubtasks([]);
    }
  }, [task, initialSubtasks]);

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setLocalSubtasks([...localSubtasks, { title: newSubtaskTitle.trim(), done: false }]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (index: number) => {
    const updated = [...localSubtasks];
    updated[index].done = !updated[index].done;
    setLocalSubtasks(updated);
  };

  const handleRemoveSubtask = (index: number) => {
    setLocalSubtasks(localSubtasks.filter((_, i) => i !== index));
  };

  const handleAiBreakdown = () => {
    if (!title.trim()) {
      alert('Veuillez saisir un titre de tâche pour que l’IA puisse l’analyser.');
      return;
    }

    setIsAiLoading(true);
    setTimeout(() => {
      const result = aiBreakdownTask(title, description);
      setPriority(result.suggestedPriority);
      const generated = result.subtasks.map((st) => ({
        title: st.title,
        done: false,
      }));
      setLocalSubtasks([...localSubtasks, ...generated]);
      setIsAiLoading(false);
    }, 400);
  };

  const toggleAssignee = (userId: string) => {
    if (assigneeIds.includes(userId)) {
      setAssigneeIds(assigneeIds.filter((id) => id !== userId));
    } else {
      setAssigneeIds([...assigneeIds, userId]);
    }
  };

  const toggleLabel = (labelId: string) => {
    if (labelIds.includes(labelId)) {
      setLabelIds(labelIds.filter((id) => id !== labelId));
    } else {
      setLabelIds([...labelIds, labelId]);
    }
  };

  const completedSubtasksCount = localSubtasks.filter((s) => s.done).length;
  const progressPercent = localSubtasks.length > 0 ? Math.round((completedSubtasksCount / localSubtasks.length) * 100) : 0;

  const isOverdue = dueDate && new Date(dueDate) < new Date() && !columns.find((c) => c.id === columnId)?.isDone;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave(
      {
        id: task?.id,
        title: title.trim(),
        description: description.trim(),
        priority,
        columnId,
        dueDate,
        assigneeIds,
        labelIds,
      },
      localSubtasks
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl glass-panel bg-slate-900 border border-slate-700 shadow-2xl flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {isEditing ? 'Édition Tâche' : 'Nouvelle Tâche'}
            </span>
            {isOverdue && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                En retard
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditing && onDuplicate && task && (
              <button
                type="button"
                onClick={() => onDuplicate(task.id)}
                title="Dupliquer la tâche"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            {isEditing && onDelete && task && (
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                title="Supprimer la tâche"
                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps du formulaire */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 flex-1">
          {/* Titre */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Titre de la tâche *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Concevoir le Manifest PWA et Service Worker..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Bouton IA Découpage intelligent */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-950/50 via-purple-950/30 to-pink-950/20 border border-indigo-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
              <div className="text-xs">
                <span className="font-bold text-pink-300">Assistant IA Découpage</span>
                <p className="text-[11px] text-slate-400">Générer automatiquement sous-tâches & estimations</p>
              </div>
            </div>
            <button
              type="button"
              disabled={isAiLoading}
              onClick={handleAiBreakdown}
              className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAiLoading ? 'Analyse...' : 'Découper avec IA'}</span>
            </button>
          </div>

          {/* Colonne & Priorité & Échéance */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Colonne Kanban</label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name} {col.isDone ? '(Terminé)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priorité</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500"
              >
                <option value="BASSE">Basse (Verte)</option>
                <option value="NORMALE">Normale (Bleue)</option>
                <option value="HAUTE">Haute (Orange)</option>
                <option value="URGENTE">Urgente (Rouge)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Date d&apos;échéance</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Notes</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails techniques, livrables attendus, critères de validation..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Assignation des membres */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
              Membres assignés
            </label>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => {
                const isAssigned = assigneeIds.includes(u.id);
                return (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => toggleAssignee(u.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                      isAssigned
                        ? 'bg-indigo-600 text-white font-semibold ring-2 ring-indigo-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    <img src={u.avatar} alt={u.name} className="w-4 h-4 rounded-full object-cover" />
                    <span>{u.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Étiquettes / Labels */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-400" />
              Étiquettes
            </label>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((lbl) => {
                const isSelected = labelIds.includes(lbl.id);
                return (
                  <button
                    type="button"
                    key={lbl.id}
                    onClick={() => toggleLabel(lbl.id)}
                    className={`text-[11px] px-2.5 py-1 rounded-md transition-all font-medium border ${
                      isSelected
                        ? 'text-white border-white/40 shadow-sm'
                        : 'text-slate-400 border-slate-700/60 bg-slate-800/60 hover:bg-slate-800'
                    }`}
                    style={isSelected ? { backgroundColor: lbl.color } : {}}
                  >
                    {lbl.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sous-tâches & Progression */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Sous-tâches ({completedSubtasksCount}/{localSubtasks.length})
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-400">{progressPercent}%</span>
            </div>

            {/* Barre de progression */}
            <div className="w-full h-1.5 rounded-full bg-slate-800 mb-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Liste des sous-tâches */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto mb-2">
              {localSubtasks.map((st, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-800/70 border border-slate-700/60 text-xs"
                >
                  <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.done}
                      onChange={() => handleToggleSubtask(index)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-600"
                    />
                    <span className={st.done ? 'line-through text-slate-500' : 'text-slate-200'}>{st.title}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(index)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Ajout rapide de sous-tâche */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Ajouter une étape..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
            >
              {isEditing ? 'Enregistrer les modifications' : 'Créer la tâche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
