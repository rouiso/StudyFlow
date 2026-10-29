'use client';

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Paperclip,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import { Column, Task, Subtask, User, Label, TaskPriority } from '@/types';

interface KanbanBoardProps {
  columns: Column[];
  tasks: Task[];
  subtasks: Subtask[];
  users: User[];
  labels: Label[];
  onOpenTaskModal: (task: Task | null, columnId?: string) => void;
  onMoveTask: (taskId: string, targetColumnId: string) => void;
  onAddColumn?: (name: string, wipLimit?: number) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  tasks,
  subtasks,
  users,
  labels,
  onOpenTaskModal,
  onMoveTask,
  onAddColumn,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColWip, setNewColWip] = useState('');

  // Filtrage combiné
  const filteredTasks = tasks.filter((task) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    if (selectedPriority !== 'ALL' && task.priority !== selectedPriority) {
      return false;
    }

    if (selectedAssignee !== 'ALL' && (!task.assigneeIds || !task.assigneeIds.includes(selectedAssignee))) {
      return false;
    }

    return true;
  });

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'URGENTE':
        return <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">Urgente</span>;
      case 'HAUTE':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Haute</span>;
      case 'NORMALE':
        return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Normale</span>;
      case 'BASSE':
        return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Basse</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Barre de recherche et filtres rapides */}
      <div className="glass-panel p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une tâche, un mot clé..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtre Priorité */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Toutes les priorités</option>
            <option value="URGENTE">Urgente</option>
            <option value="HAUTE">Haute</option>
            <option value="NORMALE">Normale</option>
            <option value="BASSE">Basse</option>
          </select>

          {/* Filtre Assigné */}
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tous les assignés</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Bouton Nouvelle Tâche */}
          <button
            onClick={() => onOpenTaskModal(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all transform hover:scale-105"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvelle Tâche</span>
          </button>
        </div>
      </div>

      {/* Grille des Colonnes Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start pb-6">
        {columns.map((col, colIndex) => {
          const colTasks = filteredTasks.filter((t) => t.columnId === col.id);
          const isWipExceeded = col.wipLimit && colTasks.length > col.wipLimit;

          return (
            <div
              key={col.id}
              className="glass-panel rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 flex flex-col min-h-[400px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const taskId = e.dataTransfer.getData('text/plain');
                if (taskId) onMoveTask(taskId, col.id);
              }}
            >
              {/* En-tête de colonne */}
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color || '#818cf8' }} />
                  <h3 className="font-bold text-xs sm:text-sm text-slate-200">{col.name}</h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {colTasks.length}
                  </span>
                </div>

                {/* Avertissement WIP Limit */}
                {col.wipLimit && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      isWipExceeded
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                    title={isWipExceeded ? `Avertissement: Limite WIP de ${col.wipLimit} dépassée!` : `Limite WIP: ${col.wipLimit}`}
                  >
                    {isWipExceeded && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                    Max: {col.wipLimit}
                  </span>
                )}
              </div>

              {/* Liste des cartes */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-500">
                    Aucune tâche dans cette colonne
                  </div>
                ) : (
                  colTasks.map((t) => {
                    const taskSubtasks = subtasks.filter((s) => s.taskId === t.id);
                    const completedSubs = taskSubtasks.filter((s) => s.done).length;
                    const isOverdue =
                      t.dueDate && new Date(t.dueDate) < new Date() && !col.isDone;

                    const assignedUsers = users.filter((u) => t.assigneeIds?.includes(u.id));
                    const taskLabels = labels.filter((l) => t.labelIds?.includes(l.id));

                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                        onClick={() => onOpenTaskModal(t)}
                        className="glass-card glass-card-hover p-3.5 rounded-xl cursor-pointer group relative border border-slate-800 hover:border-indigo-500/40"
                      >
                        {/* En-tête de carte */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex flex-wrap gap-1">
                            {getPriorityBadge(t.priority)}
                            {taskLabels.map((lbl) => (
                              <span
                                key={lbl.id}
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white shadow-sm"
                                style={{ backgroundColor: lbl.color }}
                              >
                                {lbl.name}
                              </span>
                            ))}
                          </div>

                          {/* Boutons de déplacement rapide pour mobile (flèches gauche / droite) */}
                          <div
                            className="flex items-center gap-0.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {colIndex > 0 && (
                              <button
                                title={`Déplacer vers ${columns[colIndex - 1].name}`}
                                onClick={() => onMoveTask(t.id, columns[colIndex - 1].id)}
                                className="p-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {colIndex < columns.length - 1 && (
                              <button
                                title={`Déplacer vers ${columns[colIndex + 1].name}`}
                                onClick={() => onMoveTask(t.id, columns[colIndex + 1].id)}
                                className="p-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Titre */}
                        <h4 className="font-semibold text-xs sm:text-sm text-slate-100 leading-snug mb-2 group-hover:text-indigo-300 transition-colors">
                          {t.title}
                        </h4>

                        {/* Description résumé */}
                        {t.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 mb-2.5">
                            {t.description}
                          </p>
                        )}

                        {/* Métadonnées en bas de carte */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                          {/* Échéance */}
                          <div
                            className={`flex items-center gap-1 ${
                              isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{new Date(t.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                          </div>

                          {/* Compteur sous-tâches */}
                          {taskSubtasks.length > 0 && (
                            <div className="flex items-center gap-1 text-slate-400">
                              <CheckSquare className="w-3 h-3 text-emerald-400" />
                              <span>{completedSubs}/{taskSubtasks.length}</span>
                            </div>
                          )}

                          {/* Avatars des assignés */}
                          <div className="flex items-center -space-x-1.5">
                            {assignedUsers.map((u) => (
                              <img
                                key={u.id}
                                src={u.avatar}
                                alt={u.name}
                                title={u.name}
                                className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-900"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bouton rapide d'ajout au bas de la colonne */}
              <button
                onClick={() => onOpenTaskModal(null, col.id)}
                className="mt-2.5 w-full py-2 rounded-xl border border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/40 text-slate-400 hover:text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une carte</span>
              </button>
            </div>
          );
        })}

        {/* Bouton ou formulaire d'ajout de colonne */}
        {onAddColumn && (
          <div className="flex-shrink-0 w-72 sm:w-80">
            {isAddingColumn ? (
              <div className="rounded-2xl glass-panel bg-slate-900/90 border border-slate-700/80 p-3.5 space-y-3 animate-fade-in shadow-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>Nouvelle Colonne</span>
                </h4>
                <input
                  type="text"
                  placeholder="Titre de la colonne (ex: En test)..."
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-400">Limite WIP (opt):</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    placeholder="Illimité"
                    value={newColWip}
                    onChange={(e) => setNewColWip(e.target.value)}
                    className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-center"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      if (!newColName.trim()) return;
                      onAddColumn(newColName.trim(), newColWip ? parseInt(newColWip, 10) : undefined);
                      setNewColName('');
                      setNewColWip('');
                      setIsAddingColumn(false);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingColumn(false);
                      setNewColName('');
                      setNewColWip('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingColumn(true)}
                className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-900/40 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-300 transition-all group"
              >
                <div className="p-2 rounded-full bg-slate-800/80 group-hover:bg-indigo-600/20 text-slate-400 group-hover:text-indigo-400 transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold tracking-tight">Ajouter une colonne</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
